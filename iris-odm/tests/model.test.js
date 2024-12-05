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

// Ejecutar todos los tests
async function runTests() {
    await testConnect();
    await testCreate();
    await testFindById();
    await testFind();
    await testUpdate();
    await testDelete();
    await testDeleteMany();
}

// Ejecutar los tests
runTests();