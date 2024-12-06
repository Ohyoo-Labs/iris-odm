/**
 * @file Pruebas unitarias para el módulo Model.
 */

// Importar el módulo Model y Schema para probar
import { Model, Schema } from '../src/iris.js';

// Definición del esquema para pruebas
const userSchema = new Schema({
    name: { type: String, required: true },
    age: { type: Number, required: true }
});

// Función auxiliar para mostrar resultados de los tests
function logResult(testName, result) {
    console.log(`${testName}: ${result.success ? 'PASADO' : 'FALLADO'}`);
    if (!result.success) {
        console.error(result.error);
    }
}

// Test: Conexión a la base de datos
async function testConnect() {
    const model = new Model('users', userSchema);
    try {
        await model.connect();
        logResult('testConnect', { success: true });
    } catch (error) {
        logResult('testConnect', { success: false, error: error.message });
    }
}

// Test: Crear un registro
async function testCreate() {
    const model = new Model('users', userSchema);
    const data = { name: 'John Doe', age: 30 };    
    try {
        await model.connect();
        const result = await model.create(data);
        const isValid = result.name === data.name && result.age === data.age;
        logResult('testCreate', { success: isValid });
    } catch (error) {
        logResult('testCreate', { success: false, error: error.message });
    }
}

// Test: Encontrar por ID
async function testFindById() {
    const model = new Model('users', userSchema);
    const data = { name: 'John Doe', age: 30 };
    let id;
    
    try {
        await model.connect();
        const createResult = await model.create(data);
        id = createResult._id;        
        const findResult = await model.findById(id);
        const isValid = findResult && findResult._id === id;
        logResult('testFindById', { success: isValid });
    } catch (error) {
        logResult('testFindById', { success: false, error: error.message });
    }
}

// Test: Buscar registros con consulta
async function testFind() {
    const model = new Model('users', userSchema);
    const data = [
        { name: 'John Doe', age: 30 },
        { name: 'Jane Smith', age: 25 }
    ];

    try {
        await model.connect();
        await Promise.all(data.map(user => model.create(user)));

        const findResult = await model.find({ age: 30 });
        const isValid = findResult.length >= 1 && findResult[0].name === 'John Doe';
        logResult('testFind', { success: isValid });
    } catch (error) {
        logResult('testFind', { success: false, error: error.message });
    }
}

// Test: Actualizar un registro
async function testUpdate() {
    const model = new Model('users', userSchema);
    const data = { name: 'John Doe', age: 30 };
    let id;

    try {
        await model.connect();
        const createResult = await model.create(data);
        id = createResult._id;

        const updatedData = { name: 'Johnathan Doe', age: 31 };
        const updateResult = await model.update(updatedData, id);

        const isValid = updateResult.name === updatedData.name && updateResult.age === updatedData.age;
        logResult('testUpdate', { success: isValid });
    } catch (error) {
        logResult('testUpdate', { success: false, error: error.message });
    }
}

// Test: Eliminar un registro
async function testDelete() {
    const model = new Model('users', userSchema);
    const data = { name: 'John Doe', age: 30 };
    let id;

    try {
        await model.connect();
        const createResult = await model.create(data);
        id = createResult._id;

        const deleteResult = await model.delete(id);
        const findResult = await model.findById(id);
        const isValid = deleteResult === true && findResult === undefined;
        logResult('testDelete', { success: isValid });
    } catch (error) {
        logResult('testDelete', { success: false, error: error.message });
    }
}

// Test: Eliminar múltiples registros
async function testDeleteMany() {
    const model = new Model('users', userSchema);
    const data = [
        { name: 'John Doe', age: 30 },
        { name: 'Jane Smith', age: 25 }
    ];

    try {
        await model.connect();
        await Promise.all(data.map(user => model.create(user)));

        const deleteResult = await model.deleteMany({ age: 30 });
        const findResult = await model.find({ age: 30 });
        const isValid = deleteResult.length >= 1 && findResult.length === 0;
        logResult('testDeleteMany', { success: isValid });
    } catch (error) {
        logResult('testDeleteMany', { success: false, error: error.message });
    }
}

async function testConnect2() {
    const dbName = 'testDB';
    const dbVersion = 1;    
    const model = new Model(dbName, userSchema, {version: dbVersion, collections: ['collection1', 'collection2']} );
  
    model.connect().then((db) => {
      // Verifica que la base de datos se haya conectado
      console.assert(db.name === dbName, `La base de datos debería llamarse ${dbName}`);
  
      // Verifica que la colección principal sea 'testDB' (si no se especifica, el nombre de la DB debería usarse)     
  
      // Verifica que las colecciones adicionales 'collection1' y 'collection2' hayan sido creadas
      console.assert(db.objectStoreNames.contains('collection1'), 'La colección collection1 debería haber sido creada');
      console.assert(db.objectStoreNames.contains('collection2'), 'La colección collection2 debería haber sido creada');
    }).catch((error) => {
      console.error('Error en testConnect:', error);
    });
  }
  
  async function testAddCollections() {
    const dbName = 'testDB';
    const dbVersion = 1;
    const model = new Model( dbName, userSchema, { version: dbVersion, collections: ['collection1'] });
  
    model.connect().then(() => {
      // Agregar nuevas colecciones después de la conexión
      model.addCollections(['collection2', 'collection3']).then((result) => {
        console.log(result);
        // Verifica que las nuevas colecciones hayan sido creadas
        const db = model.db;
  
        console.assert(db.objectStoreNames.contains('collection2'), 'La colección collection2 debería haber sido creada');
        console.assert(db.objectStoreNames.contains('collection3'), 'La colección collection3 debería haber sido creada');
        // Verifica que 'this.collections' ahora contenga 'collection1', 'collection2' y 'collection3'
        console.assert(model.collections.length === 3, 'El tamaño de this.collections debería ser 3');
        console.assert(model.collections.includes('collection2'), 'this.collections debería incluir collection2');
        console.assert(model.collections.includes('collection3'), 'this.collections debería incluir collection3');
      }).catch((error) => {
        console.error('Error en testAddCollections:', error);
      });
    }).catch((error) => {
      console.error('Error en testConnect para testAddCollections:', error);
    });
  }  

  async function testNoDuplicateCollections() {
    const dbName = 'testDB';
    const dbVersion = 1;
    const model = new Model(dbName, userSchema, { version: dbVersion, collections: ['collection1', 'collection2'] });
  
    model.connect().then(() => {
      model.addCollections(['collection2', 'collection3']).then(() => {
        const db = model.db;
  
        // Verifica que 'collection2' no se haya duplicado
        console.assert(model.collections.filter((col) => col === 'collection2').length === 1, 'collection2 no debe estar duplicada');
  
        // Verifica que 'collection3' fue añadida correctamente
        console.assert(model.collections.includes('collection3'), 'this.collections debería incluir collection3');
  
        console.log('testNoDuplicateCollections pasó correctamente');
      }).catch((error) => {
        console.error('Error en testNoDuplicateCollections:', error);
      });
    }).catch((error) => {
      console.error('Error en testConnect para testNoDuplicateCollections:', error);
    });
  } 
  
  async function testConnectWithoutAdditionalCollections() {
    const dbName = 'testDB1';
    const dbVersion = 1;
    const model = new Model(dbName, userSchema, { version: dbVersion, collections: [] });
  
    model.connect().then((db) => {
      // Verifica que la base de datos se haya conectado
      console.assert(db.name === dbName, `La base de datos debería llamarse ${dbName}`);
  
      // Verifica que la colección principal sea el nombre de la DB
      console.log(db.objectStoreNames.contains(dbName));
      console.assert(db.objectStoreNames.contains(dbName), `La base de datos debería tener la colección principal ${dbName}`);
      console.log('testConnectWithoutAdditionalCollections pasó correctamente');
    }).catch((error) => {
      console.error('Error en testConnectWithoutAdditionalCollections:', error);
    });
  } 
  
  async function testMainCollectionName() {
    const dbName = 'testDB1';
    const model = new Model(dbName, userSchema, { collections: [] });
  
    model.connect().then((db) => {
      // Verifica que la colección principal tenga el nombre correcto
      console.assert(db.objectStoreNames.contains(dbName), `La base de datos debería tener la colección principal ${dbName}`);
      console.log('testMainCollectionName pasó correctamente');
    }).catch((error) => {
      console.error('Error en testMainCollectionName:', error);
    });
  }  

// Ejecutar todos los tests
async function runTests() {
    await testConnect();
    await testCreate();
    await testFindById();
    await testFind();
    await testUpdate();
    await testDelete();
    await testDeleteMany();
    await testConnect2();
    await testAddCollections();
    await testNoDuplicateCollections();
    await testConnectWithoutAdditionalCollections();
    await testMainCollectionName();
}

// Ejecutar los tests
runTests();