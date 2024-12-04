// Sync Module for Iris ORM

class SyncManager {
  constructor(model, options = {}) {
    this.model = model;
    this.syncUrl = options.syncUrl;
    this.idField = options.idField || "_id";
    this.timestampField = options.timestampField || "updatedAt";
    // Añadimos la configuración de espacio mínimo requerido
    this.minRequiredSpace = options.minRequiredSpace || 50 * 1024 * 1024; // 50MB por defecto
    this.syncStatusField = options?.syncStatus || "_syncStatus";
    this.serverIdField = options?.serverId || "_id"; //_serverId
    this.lastSyncField = options?.lastSync || "_lastSync";
    this.batchSize = options.batchSize || 50;
    this.conflictResolution = options.conflictResolution || "server-wins";
  }

  // Enhance the schema to support sync
  async prepareSyncSchema() {
    // Add sync-related fields to the schema
    const syncFields = {
      [this.syncStatusField]: {
        type: String,
        default: "synced", // possible values: 'synced', 'modified', 'pending', 'conflict'
      },
      [this.lastSyncField]: Date,
      _syncErrors: Array,
      _localUpdatedAt: Date,
    };
    if (!this.model.schema?.definition[this.serverIdField])
      syncFields[this.serverIdField] = { type: String, unique: true };
    //if (!this.model.schema?.definition) this.model.schema.definition = {};
    // Extend the original schema
    Object.assign(this.model.schema.definition, syncFields);
  }

  // Pull changes from server
  async pullFromServer(lastSyncTimestamp = null) {
    try {
      const response = await fetch(this.syncUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          lastSync: lastSyncTimestamp,
          batchSize: this.batchSize
        })
      });

      const serverData = await response.json();
      // Datos de prueba sin conexión a una API real
      /* const serverData = {
        items: [
          {
            _id: "674fa68cb742d1ff3e1478fc",
            name: "John",
            age: 30,
            updatedAt: new Date(),
          },
          {
            _id: "674fa6419b342e316cbe59da",
            name: "Jane",
            age: 25,
            updatedAt: new Date(),
          },
        ],
      }; */

      for (const item of serverData.items) {
        const localItem = await this.model.find({
          [this.serverIdField]: item[this.idField],
        });
        if (!localItem || localItem.length === 0) {
          // New item from server
          await this.model.create({
            ...item,
            [this.serverIdField]: item[this.idField],
            [this.syncStatusField]: "synced",
            [this.lastSyncField]: new Date(),
          });
        } else {
          // Update existing item based on conflict resolution strategy
          await this.handleConflict(localItem, item);
        }
      }

      return {
        success: true,
        synchronized: serverData.items.length,
      };
    } catch (error) {
      console.error("Error during pull:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Push local changes to server
  async pushToServer() {
    try {
      // Get all modified local items
      const modifiedItems = await this.model.find({
        [this.syncStatusField]: "modified",
      });

      const changeset = modifiedItems.map((item) => ({
        id: item[this.serverIdField],
        data: this.prepareForSync(item),
        localId: item[this.idField],
      }));

      const response = await fetch(`${this.syncUrl}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ changes: changeset }),
      });

      const result = await response.json();
      // Datos de prueba sin conexión a una API real
      /* const result = {
        synchronized: [
          {
            localId: "674fa68cb742d1ff3e1478fc",
            serverId: "674fa68cb742d1ff3e1478fc",
          },
          {
            localId: "674fa6419b342e316cbe59da",
            serverId: "674fabf1b342e316cbe59dbs",
          },
          {
            localId: "674fa6b12899ceee2ce21a1c",
            serverId: "674fa6b128r9ceee2ce21a1c",
          },
        ],
      }; */

      // Update local items with server confirmation
      for (const synced of result.synchronized) {
        await this.model.update(synced.localId, {
          [this.syncStatusField]: "synced",
          [this.serverIdField]: synced.serverId,
          [this.lastSyncField]: new Date(),
        });
      }

      return {
        success: true,
        synchronized: result.synchronized.length,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Full sync operation (pull and push)
  async sync() {
    try {
      // First push local changes
      const pushResult = await this.pushToServer();

      // Then pull server changes
      const lastSync = await this.getLastSyncTimestamp();
      const pullResult = await this.pullFromServer(lastSync);

      return {
        success: true,
        pushed: pushResult.synchronized || 0,
        pulled: pullResult.synchronized || 0,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Handle conflicts between local and server versions
  async handleConflict(localItem, serverItem) {
    const updated = await localItem.map(async (item) => {
      if (this.conflictResolution === "server-wins") {
        return await this.model.update(item[this.idField], {
          ...serverItem,
          [this.serverIdField]: serverItem[this.idField],
          [this.syncStatusField]: "synced",
          [this.lastSyncField]: new Date(),
        });
      } else if (this.conflictResolution === "client-wins") {
        if (localItem[this.syncStatusField] !== "modified") {
          return await this.model.update(localItem[this.idField], {
            ...serverItem,
            [this.serverIdField]: serverItem[this.idField],
            [this.syncStatusField]: "synced",
            [this.lastSyncField]: new Date(),
          });
        }
      } else if (this.conflictResolution === "manual") {
        return await this.model.update(localItem[this.idField], {
          ...localItem,
          [this.syncStatusField]: "conflict",
          _serverVersion: serverItem,
        });
      }
    });
    return updated;
  }

  // Get the timestamp of the last successful sync
  /* async getLastSyncTimestamp() {
    const lastSyncedItem = await this.model
      .find({
        [this.syncStatusField]: "synced",
      })
      .sort({ [this.lastSyncField]: -1 })
      .limit(1);

    return lastSyncedItem?.[0]?.[this.lastSyncField] || null;
  } */
  async getLastSyncTimestamp() {
    const lastSyncedItems = await this.model.find({
      [this.syncStatusField]: "synced",
    }).then(async (result) => {
      return await this.model.sort({
        fields: result,
        keyField: { name: this.lastSyncField, type: "date" },
        order: "desc",
      });
    }).then(async (result) => {
      return await this.model.limit({ fields: result, limit: 1 });
    }).catch((error) => {
      console.error("Error al obtener el último timestamp de sincronización:", error);
    });    
    // Devolver el último timestamp, o null si no hay resultados
    return lastSyncedItems.length > 0
      ? lastSyncedItems[0][this.lastSyncField]
      : null;
  }

  // Prepare an item for syncing (remove local-only fields)
  prepareForSync(item) {
    const syncItem = { ...item };
    delete syncItem[this.syncStatusField];
    delete syncItem[this.serverIdField];
    delete syncItem[this.lastSyncField];
    delete syncItem._syncErrors;
    delete syncItem._localUpdatedAt;
    return syncItem;
  }

  // Monitor changes and mark items for sync
  async watchChanges() {
    const originalUpdate = this.model.update.bind(this.model);
    const originalCreate = this.model.create.bind(this.model);

    // Override update method
    this.model.update = async (id, data) => {
      const syncData = {
        ...data,
        [this.syncStatusField]: "modified",
        _localUpdatedAt: new Date(),
      };
      return originalUpdate(id, syncData);
    };

    // Override create method
    this.model.create = async (data) => {
      const syncData = {
        ...data,
        [this.syncStatusField]: "modified",
        _localUpdatedAt: new Date(),
      };
      return originalCreate(syncData);
    };
  }

  // Setup automatic periodic sync
  setupAutoSync(interval = 300000) {
    // default 5 minutes
    setInterval(() => {
      this.sync().catch(console.error);
    }, interval);
  }
}
export { SyncManager };
