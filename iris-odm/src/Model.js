import { IrisUtils } from "./IrisUtils.js";

class Model {
  constructor(name, schema, options = {}) {
    this.name = name;
    this.schema = schema;
    this.version = options.version || 1; // Versión de la base de datos
    this.primary = options.primary || "_id"; // Campo índice principal
    this.collections =
      Array.isArray(options?.collections) && options?.collections.length > 0
        ? options.collections
        : []; // Permitir colecciones adicionales y dar soporte a múltiples stores

    if (!this.schema.definition[`${this.primary}`]) {
      this.schema.definition[this.primary] = { type: String, unique: true };
    } else if (this.schema.definition[this.primary].type !== String) {
      console.warn(
        `We convert the ${this.primary} key to a string for better compatibility with non-relational databases`
      );
      this.schema.definition[this.primary].type = String;
    } else if (!this.schema.definition[this.primary]?.unique) {
      this.schema.definition[this.primary].unique = true;
    }
    this.activeCollection = options?.active || this.name;
    this.db = null;
  }
  async connect() {
    return new Promise(async (resolve, reject) => {
      this.version = await this.syncVersion(this.version);
      const request = indexedDB.open(this.name, this.version);
      request.onerror = () => reject(request.error);
      request.onsuccess = async () => {
        this.db = request.result;
        this.collections = Array.from(this.db.objectStoreNames);
        resolve(this.db);
      };
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        // Si collections no está vacío, crear las object stores correspondientes
        if (this.collections.length > 0) {
          this.collections.forEach((collectionName) => {
            if (!db.objectStoreNames.contains(collectionName)) {
              const store = db.createObjectStore(collectionName, {
                keyPath: this.primary,
              });
              // Crear índices definidos en el esquema
              this.schema.indexes.forEach((index) => {
                store.createIndex(index.field, index.field, {
                  unique: index.unique || false,
                });
              });
            }
          });
        } else {
          // Si collections está vacío, usar this.name para la colección principal
          if (!db.objectStoreNames.contains(this.name)) {
            const store = db.createObjectStore(this.name, {
              keyPath: this.primary,
            });
            // Crear índices definidos en el esquema
            this.schema.indexes.forEach((index) => {
              store.createIndex(index.field, index.field, {
                unique: index.unique || false,
              });
            });
          }
        }
      };
    });
  }

  async disconnect() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  async syncVersion(version) {
    return this.dbExists(this.name)
      .then((exists) => {
        if (exists) {
          if (version && version < exists.version) {
            return (this.version = exists.version);
          }
          return (this.version = version);
        } else {
          return (this.version = 1);
        }
      })
      .catch((error) => {
        console.error(error);
        return (this.version = 1);
      });
  }
  async dbExists(name) {
    return indexedDB
      .databases()
      .then((dbs) => dbs.find((db) => db.name === name));
  }
  static async existsDB(name) {
    return indexedDB
      .databases()
      .then((dbs) => dbs.find((db) => db.name === name));
  }
  async addCollections(collections) {
    if (!this.db) await this.connect();
    return new Promise((resolve, reject) => {
      const existingCollections = Array.from(this.db.objectStoreNames);

      // Filtrar las colecciones que ya existen
      if (typeof collections === "string") {
        collections = [collections];
      }
      const newCollections = collections.filter(
        (name) => !existingCollections.includes(name)
      );

      if (newCollections.length === 0) {
        /* return reject(
          new Error("Todas las colecciones ya existen en la base de datos.")
        ); */
        return resolve({
          success: false,
          message: "Todas las colecciones ya existen en la base de datos.",
          addedCollections: [],
          allCollections: existingCollections,
        });
      }

      const dbName = this.db.name;
      this.version++;

      // Cerrar la conexión actual para permitir la actualización
      this.db.close();
      const request = indexedDB.open(dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;

        // Resolver con detalles útiles
        resolve({
          success: true,
          addedCollections: newCollections,
          allCollections: Array.from(this.db.objectStoreNames),
        });
      };
      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Crear las colecciones que faltan
        newCollections.forEach((name) => {
          const store = db.createObjectStore(name, { keyPath: this.primary });

          // Crear índices definidos en el esquema, si aplica
          this.schema.indexes.forEach((index) => {
            store.createIndex(index.field, index.field, {
              unique: index.unique || false,
            });
          });
        });
      };
      // Actualizar las colecciones existentes
      this.collections = [...existingCollections, ...newCollections];
    });
  }

  async switchCollection(collectionName) {
    try {
      if (this.collections.includes(collectionName)) {
        this.activeCollection = collectionName;
      } else {
        throw new Error(`Collection '${collectionName}' not found`);
      }
      return this.activeCollection;
    } catch (error) {
      console.error(error);
      return null;
    }
  }

  // Refresh the database connection for showing the updated collections
  async refresh() {
    await this.disconnect();
    return await this.connect();
  }

  async create(data, options = {}) {
    if (options.castToScheme) {
      data = this._prepare(data);
    }
    await this._validateData(data);

    return this._executeTransaction("readwrite", (store) => {
      return new Promise((resolve, reject) => {
        const request = store.add(
          !options?.castToScheme ? this._prepare(data) : data
        );
        request.onsuccess = () => resolve(data); // Retornar el objeto original con _id
        request.onerror = () => reject(request.error);
      });
    });
  }

  /* async findById(id) {
    return this._executeTransaction("readonly", (store) => {
      return new Promise((resolve, reject) => {
        const request = store.get(id);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    });
  } */
  async findById(id, fields = null) {
    return this._executeTransaction("readonly", (store) => {
      return new Promise((resolve, reject) => {
        const request = store.get(id);
        request.onsuccess = () => {
          if (!request.result || !fields) {
            resolve(request.result);
          } else {
            const selectedFields = {};
            for (let i = 0; i < fields.length; i++) {
              const field = fields[i];
              if (request.result.hasOwnProperty(field)) {
                selectedFields[field] = request.result[field];
              }
            }
            resolve(selectedFields);
          }
        };
        request.onerror = () => reject(request.error);
      });
    });
  }

  /* async find(query = null) {
    return this._executeTransaction("readonly", (store) => {
      return new Promise((resolve, reject) => {
        const results = [];
        const request = store.openCursor();

        request.onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor) {
            // Si no se proporciona una consulta, devolver todos los elementos
            // Si se proporciona una consulta, filtrar los elementos
            if (!query) results.push(cursor.value);
            else {
              if (this._matchesQuery(cursor.value, query)) {
                results.push(cursor.value);
              }
            }
            cursor.continue();
          } else {
            resolve(results);
          }
        };

        request.onerror = () => reject(request.error);
      });
    });
  } */
  async find({query = null, fields = null} = {}) {
    return this._executeTransaction("readonly", (store) => {
      return new Promise((resolve, reject) => {
        const results = [];
        const request = store.openCursor();

        request.onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor) {
            let valueToPush = cursor.value;

            if (fields) {
              const selectedFields = {};
              for (let i = 0; i < fields.length; i++) {
                const field = fields[i];
                if (cursor.value.hasOwnProperty(field)) {
                  selectedFields[field] = cursor.value[field];
                }
              }
              valueToPush = selectedFields;
            }

            if (!query) results.push(valueToPush);
            else {
              if (this._matchesQuery(cursor.value, query)) {
                results.push(valueToPush);
              }
            }
            cursor.continue();
          } else {
            resolve(results);
          }
        };

        request.onerror = () => reject(request.error);
      });
    });
  }

  async sort({ fields, keyField, order = "asc" }) {
    fields.sort((a, b) => {
      if (order === "asc") {
        if (keyField?.type === "date") {
          return new Date(a[keyField.name]) - new Date(b[keyField.name]);
        }
        return a[keyField.name] - b[keyField.name];
      } else {
        if (keyField?.type === "date") {
          return new Date(b[keyField.name]) - new Date(a[keyField.name]);
        }
        return b[keyField.name] - a[keyField.name];
      }
    });
    return fields;
  }

  async limit({ fields, limit }) {
    return fields.slice(0, limit);
  }
  async update(data, id) {
    id = id || data[this.primary];
    delete data[this.primary];
    await this._validateData(data, "update", id);
    return this._executeTransaction("readwrite", (store) => {
      return new Promise((resolve, reject) => {
        // Mostrar el keyPath configurado para el store
        //console.log(`KeyPath configurado para el store: ${store.keyPath}`);
        const request = store.get(id);
        request.onsuccess = () => {
          const item = request.result;
          if (!item) {
            reject(new Error("Item not found"));
            return;
          }

          const updatedItem = { ...item, ...this._prepare(data) };
          const updateRequest = store.put(updatedItem);

          updateRequest.onsuccess = () => resolve(updatedItem);
          updateRequest.onerror = () => reject(updateRequest.error);
        };

        request.onerror = () => reject(request.error);
      });
    });
  }

  // Método para eliminar un elemento por su ID y devolver el id eliminado
  async delete(id) {
    return this._executeTransaction("readwrite", (store) => {
      return new Promise((resolve, reject) => {
        const request = store.delete(id);
        request.onsuccess = () => resolve(id);
        request.onerror = () => reject(request.error);
      });
    });
  }

  async deleteMany(query) {
    const items = await this.find(query);
    return Promise.all(items.map((item) => this.delete(item[this.primary])));
  }

  async checkIndex(index) {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.name, this.version);
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(this.name, "readonly");
        const store = transaction.objectStore(this.name);
        const indexExists = store.indexNames.contains(index);
        resolve(indexExists);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async createIndex(index) {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.name, this.version);
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(this.name, "readwrite");
        const store = transaction.objectStore(this.name);
        store.createIndex(index, index);
        resolve(true);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async dropIndex(index) {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.name, this.version);
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(this.name, "readwrite");
        const store = transaction.objectStore(this.name);
        store.deleteIndex(index);
        resolve(true);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getPrimaryKeyStore() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.name, this.version);
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(this.name, "readonly");
        const store = transaction.objectStore(this.name);
        resolve(store.keyPath);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getStore() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.name, this.version);
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(this.name, "readonly");
        const store = transaction.objectStore(this.name);
        resolve(store);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async clear() {
    return this._executeTransaction("readwrite", (store) => {
      return new Promise((resolve, reject) => {
        const request = store.clear();
        request.onsuccess = () => resolve(true);
        request.onerror = () => reject(request.error);
      });
    });
  }

  async count() {
    return this._executeTransaction("readonly", (store) => {
      return new Promise((resolve, reject) => {
        const request = store.count();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    });
  }

  async drop() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase(this.name);
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }

  async validatePrimaryKey(data) {
    if (!data[this.primary] || data[this.primary] === undefined) {
      return "e";
    }
    if (data[this.primary].length !== 24) {
      console.warn(
        `We recommend using a 24-character string as the ${this.primary} key for better security`
      );
      return "w";
    }
    return "s";
  }

  async _validateData(data, operation = "create", id) {
    // Asignar clave primaria si no existe
    if (
      operation === "create" &&
      (await this.validatePrimaryKey(data)) === "e"
    ) {
      data[this.primary] = await IrisUtils.generateObjectId();
    } else if (
      operation === "update" &&
      !id /* &&
      (await this.validatePrimaryKey(data)) === "e" */
    ) {
      throw new Error(
        `Primary key '${this.primary}' is required for update operation`
      );
    }
    const errors = [];
    for (const [field, definition] of Object.entries(this.schema.definition)) {
      // Validación de campo requerido
      if (definition.required && !data.hasOwnProperty(field)) {
        errors.push(`Field '${field}' is required`);
      }
      if (definition.unique && operation !== "update") {
        const existing = await this.find({ query:{[field]: data[field]} });
        if (existing.length > 0) {
          errors.push(`Field '${field}' must be unique`);
        }
      }
      // Validación de tipo
      if (data.hasOwnProperty(field) && data[field] !== null) {
        const value = data[field];
        const type = definition.type || definition;

        if (!this._isValidType(value, type)) {
          errors.push(`Field '${field}' must be of type ${type.name}`);
        }
      }

      // Validación personalizada
      if (definition.validate && data.hasOwnProperty(field)) {
        try {
          const isValid = await definition.validate(data[field]);
          if (!isValid) {
            errors.push(`Validation failed for field '${field}'`);
          }
        } catch (error) {
          errors.push(
            `Validation error for field '${field}': ${error.message}`
          );
        }
      }
    }

    if (errors.length > 0) {
      throw new Error(
        `Validation failed: ${errors.join(", ")} - ${JSON.stringify(data)}`
      );
    }
  }

  async _executeTransaction(mode, callback) {
    if (!this.db) {
      await this.connect();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(this.activeCollection, mode);
      const store = transaction.objectStore(this.activeCollection);

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);

      Promise.resolve(callback(store)).then(resolve).catch(reject);
    });
  }

  _prepare(data) {
    const prepared = {};
    for (const [key, value] of Object.entries(data)) {
      if (this.schema.definition[key]) {
        prepared[key] = this._castValue(
          value,
          this.schema.definition[key]?.type
        );
      }
    }
    return prepared;
  }

  // Método para convertir un valor al tipo especificado
  _castValue(value, type) {
    try {
      switch (type) {
        case String:
          return String(value);
        case Number:
          return Number(value);
        case Boolean:
          return Boolean(value);
        case Date: {
          const converted =
            value instanceof Date
              ? value
              : typeof value === "string" && !isNaN(Date.parse(value))
              ? new Date(value)
              : null;
          if (!converted || isNaN(converted.getTime())) {
            console.warn(`Invalid date value: ${value}`);
            return null; // Devuelve null si el valor no es una fecha válida
          }
          return converted;
        }
        //return value instanceof Date ? value : new Date(value);
        default:
          return value;
      }
    } catch (e) {
      console.error(e);
      return null;
    }
  }

  _isValidType(value, type) {
    if (type === String) return typeof value === "string";
    if (type === Number) return typeof value === "number" && !isNaN(value);
    if (type === Boolean) return typeof value === "boolean";
    if (type === Date) return value instanceof Date && !isNaN(value);
    if (type === Array) return Array.isArray(value);
    if (type === Object) return typeof value === "object" && value !== null;
    return value instanceof type;
  }

  _matchesQuery(item, query) {
    return Object.entries(query).every(([key, value]) => {
      if (value && typeof value === "object") {
        return Object.entries(value).every(([operator, operand]) => {
          switch (operator) {
            case "$gt":
              return item[key] > operand;
            case "$gte":
              return item[key] >= operand;
            case "$lt":
              return item[key] < operand;
            case "$lte":
              return item[key] <= operand;
            case "$ne":
              return item[key] !== operand;
            case "$in":
              return operand.includes(item[key]);
            case "$nin":
              return !operand.includes(item[key]);
            default:
              return false;
          }
        });
      }
      return item[key] === value;
    });
  }

  // List databases in the current instance. Return an array of objects with name and version properties
  async databases() {
    return indexedDB.databases().then((dbs) => {
      return dbs.map((db) => ({ name: db.name, version: db.version }));
    });
  }

  async analyzeDB(dbName) {
    return new Promise((resolve, reject) => {
      try {
        const request = indexedDB.open(dbName);

        request.onsuccess = (event) => {
          const db = event.target.result;
          const dbInfo = {
            name: db.name,
            version: db.version,
            objectStores: [],
          };

          const objectStoreNames = db.objectStoreNames;

          for (let i = 0; i < objectStoreNames.length; i++) {
            const storeName = objectStoreNames[i];
            const transaction = db.transaction(storeName, "readonly");
            const store = transaction.objectStore(storeName);

            const objectStore = {
              name: storeName,
              indexes: [],
            };

            // Inspeccionar índices
            const indexNames = store.indexNames;
            for (let j = 0; j < indexNames.length; j++) {
              const index = store.index(indexNames[j]);
              objectStore.indexes.push({
                name: index.name,
                keyPath: index.keyPath,
                unique: index.unique,
              });
            }

            dbInfo.objectStores.push(objectStore);
          }

          db.close(); // Cerrar la conexión a la base de datos
          resolve(dbInfo); // Devolver la información recopilada
        };

        request.onerror = (event) => {
          reject(
            new Error(
              `No se pudo abrir la base de datos: ${event.target.error}`
            )
          );
        };
      } catch (error) {
        reject(
          new Error(`Error al analizar la base de datos: ${error.message}`)
        );
      }
    });
  }
}

export { Model };
