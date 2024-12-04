// IndexedDB ORM Library

class Schema {
  constructor(definition) {
    this.definition = definition;
    this.indexes = [];
  }
  // Método para añadir un índice
  addIndex(field, options = {}) {
    this.indexes.push({ field, ...options });
    return this;
  }
  // Método para eliminar un índice
  removeIndex(field) {
    this.indexes = this.indexes.filter(index => index.field !== field);
    return this;
  }
  // Método síncrono para validar un objeto
  validate(data) {
    for (const field in this.definition) {
      const value = data[field];
      const type = this.definition[field].type;

      if (value && type && typeof value !== type) {
        throw new Error(`Invalid type for field ${field}. Expected ${type}, got ${typeof value}`);
      }
    }
  }
  // Método asíncrono para validar un objeto
  async validateAsync(data) {
    for (const field in this.definition) {
      const value = data[field];
      const type = this.definition[field].type;

      if (value && type && typeof value !== type) {
        throw new Error(`Invalid type for field ${field}. Expected ${type}, got ${typeof value}`);
      }
    }
  }
  // Método estático para crear un esquema a partir de un objeto
  static fromObject(definition) {
    return new Schema(definition);
  }
  // Método estático para crear un esquema a partir de un array
  static fromArray(definition) {
    const schema = {};
    definition.forEach(field => {
      schema[field] = { type: String };
    });
    return new Schema(schema);
  }
  // Método estático para crear un esquema a partir de un string
  static fromString(definition) {
    const schema = {};
    definition.split(',').forEach(field => {
      schema[field] = { type: String };
    });
    return new Schema(schema);
  }

  // Método para convertir un objeto en un documento
  toDocument(data) {
    const document = { ...data };
    for (const field in this.definition) {
      if (document[field] === undefined) {
        document[field] = null;
      }
    }
    return document;
  }

  // Método para convertir un documento en un objeto
  toObject(document) {
    const object = { ...document };
    for (const field in this.definition) {
      if (object[field] === null) {
        object[field] = undefined;
      }
    }
    return object;
  }
}
export { Schema };