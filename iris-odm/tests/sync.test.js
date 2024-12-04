/**
 *  @file Unit tests for the SyncManager module.
 */

// Importar las clases necesarias
import { SyncManager } from '../src/Sync.js';
import { Model } from '../src/Model.js';
import { Schema } from '../src/Schema.js';

// Simular una API local para los tests
const mockServer = (() => {
  let serverData = [
    { id: 1, name: 'John', age: 30, updatedAt: new Date() },
    { id: 2, name: 'Jane', age: 25, updatedAt: new Date() }
  ];

  return {
    async sync(changes) {
      const synchronized = [];

      // Procesar cambios del cliente
      for (const change of changes) {
        if (change.id) {
          const index = serverData.findIndex(item => item.id === change.id);
          if (index !== -1) {
            serverData[index] = { ...serverData[index], ...change.data };
          }
        } else {
          const newItem = { ...change.data, id: serverData.length + 1 };
          serverData.push(newItem);
          synchronized.push({ serverId: newItem.id, localId: change.localId });
        }
      }

      return {
        synchronized,
        items: serverData
      };
    },

    async get(lastSync) {
      if (!lastSync) return { items: serverData };
      return {
        items: serverData.filter(item => new Date(item.updatedAt) > new Date(lastSync))
      };
    }
  };
})();

// Configurar el modelo y el esquema
const schemaDefinition = new Schema({
  _id: { type: String, unique: true },
  name: { type: String, required: true },
  age: { type: Number },
  updatedAt: { type: Date }
});
const model = new Model('testdb', schemaDefinition);

// Configurar el SyncManager
const syncManager = new SyncManager(model, {
  syncUrl: 'mock', // No usamos una API real en este test
  batchSize: 2, // Tamaño de lote para la sincronización (esto se refiere a la cantidad de registros que se sincronizan a la vez). En este caso, se sincronizarán 2 registros a la vez. Esto es útil para evitar problemas de rendimiento al sincronizar grandes cantidades de datos. Es posible que desee ajustar este valor según sus necesidades y casos de uso específicos.
  idField: '_id',
  timestampField: 'updatedAt',
  conflictResolution: 'server-wins'
});

// Sobrescribir los métodos de fetch con la API simulada
window.fetch = async (url, options) => {
  const body = JSON.parse(options.body);
  if (options.method === 'POST') {
    return {
      json: async () => await mockServer.get(body.lastSync)
    };
  }
  if (options.method === 'PUT') {
    return {
      json: async () => await mockServer.sync(body.changes)
    };
  }
};

// Función principal de test
async function runSyncTests() {
  console.log('Preparando el esquema...');
  await syncManager.prepareSyncSchema();

  console.log('Realizando pull del servidor...');
  const pullResult = await syncManager.pullFromServer();
  console.log('Pull Result:', pullResult);

  console.log('Creando registros locales...');
  await model.create({ name: 'Alice', age: 28, updatedAt: new Date() });

  console.log('Realizando push al servidor...');
  const pushResult = await syncManager.pushToServer();
  console.log('Push Result:', pushResult);

  console.log('Ejecutando sincronización completa...');
  const syncResult = await syncManager.sync();
  console.log('Sync Result:', syncResult);

  console.log('Contenido del modelo después de la sincronización:', model);
}

// Ejecutar el test
runSyncTests().catch(console.error);