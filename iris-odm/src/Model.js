import { IrisUtils } from "./IrisUtils.js";

class Model {
  constructor(name, schema, options = {}) {
    this.name = name;
    this.schema = schema;
    this.version = options.version || 1;
    this.primary = options.primary || "_id"; // Campo índice principal
    if (!this.schema.definition[this.primary]) {
      this.schema.definition[this.primary] = { type: String, unique: true };
    } else if (this.schema.definition[this.primary].type !== String) {
      console.warn(
        `We convert the ${this.primary} key to a string for better compatibility with non-relational databases`
      );
      this.schema.definition[this.primary].type = String;
    } else if (!this.schema.definition[this.primary]?.unique) {
      this.schema.definition[this.primary].unique = true;
    }
    this.db = null;
  }

  async connect() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.name, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

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
      };
    });
  }

  async disconnect() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

    async create(data, options = {}) {
    if (options.castToScheme) {
      data = this._prepare(data);
    }
    await this._validateData(data);

    return this._executeTransaction("readwrite", (store) => {
      return new Promise((resolve, reject) => {
        const request = store.add(!options?.castToScheme ? this._prepare(data) : data);
        request.onsuccess = () => resolve(data); // Retornar el objeto original con _id
        request.onerror = () => reject(request.error);
      });
    });
  }

  async findById(id) {
    return this._executeTransaction("readonly", (store) => { 
      return new Promise((resolve, reject) => {
        const request = store.get(id);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    });
  }

  async find(query = {}) {
    return this._executeTransaction("readonly", (store) => {
      return new Promise((resolve, reject) => {
        const results = [];
        const request = store.openCursor();

        request.onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor) {
            if (this._matchesQuery(cursor.value, query)) {
              results.push(cursor.value);
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

  async delete(id) {
    return this._executeTransaction("readwrite", (store) => {
      return new Promise((resolve, reject) => {
        const request = store.delete(id);
        request.onsuccess = () => resolve(true);
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
      operation === "update" && !id /* &&
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
        const existing = await this.find({ [field]: data[field] });
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
      const transaction = this.db.transaction(this.name, mode);
      const store = transaction.objectStore(this.name);

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);

      Promise.resolve(callback(store)).then(resolve).catch(reject);
    });
  }

  _prepare(data) {
    const prepared = {};
    for (const [key, value] of Object.entries(data)) {
      if (this.schema.definition[key]) {
        prepared[key] = this._castValue(value, this.schema.definition[key]?.type);
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
}

export { Model };
