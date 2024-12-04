/**
 * @file Pruebas unitarias para el módulo Schema.
 */

// Importar el módulo Schema para probarlo
import { Schema } from '../src/Schema.js';

// Función auxiliar para mostrar resultados de los tests
function logResult(testName, result) {
    console.log(`${testName}: ${result.success ? 'PASADO' : 'FALLADO'}`);
    if (!result.success) {
        console.error(result.error);
    }
}

// Test: Creación de esquema
async function testSchemaCreation() {
    const definition = {
        name: { type: 'string' },
        age: { type: 'number' }
    };
    const schema = new Schema(definition);
    const result = schema instanceof Schema;
    logResult('testSchemaCreation', { success: result });
}

// Test: Validación de datos válidos
async function testValidateDataValid() {
    const definition = {
        name: { type: 'string' },
        age: { type: 'number' }
    };
    const schema = new Schema(definition);
    const validData = { name: 'John Doe', age: 30 };

    try {
        schema.validate(validData);
        logResult('testValidateDataValid', { success: true });
    } catch (error) {
        logResult('testValidateDataValid', { success: false, error: error.message });
    }
}

// Test: Validación de datos inválidos (tipo incorrecto)
async function testValidateDataInvalid() {
    const definition = {
        name: { type: 'string' },
        age: { type: 'number' }
    };
    const schema = new Schema(definition);
    const invalidData = { name: 'John Doe', age: 'invalid' };

    try {
        schema.validate(invalidData);
        logResult('testValidateDataInvalid', { success: false, error: 'No se lanzó excepción' });
    } catch (error) {
        logResult('testValidateDataInvalid', { success: true });
    }
}

// Test: Validación asíncrona de datos válidos
async function testValidateAsyncDataValid() {
    const definition = {
        name: { type: 'string' },
        age: { type: 'number' }
    };
    const schema = new Schema(definition);
    const validData = { name: 'John Doe', age: 30 };

    try {
        await schema.validateAsync(validData);
        logResult('testValidateAsyncDataValid', { success: true });
    } catch (error) {
        logResult('testValidateAsyncDataValid', { success: false, error: error.message });
    }
}

// Test: Validación asíncrona de datos inválidos
async function testValidateAsyncDataInvalid() {
    const definition = {
        name: { type: 'string' },
        age: { type: 'number' }
    };
    const schema = new Schema(definition);
    const invalidData = { name: 'John Doe', age: 'invalid' };

    try {
        await schema.validateAsync(invalidData);
        logResult('testValidateAsyncDataInvalid', { success: false, error: 'No se lanzó excepción' });
    } catch (error) {
        logResult('testValidateAsyncDataInvalid', { success: true });
    }
}

// Test: Adición de índice
async function testAddIndex() {
    const schema = new Schema({ name: { type: 'string' } });
    schema.addIndex('name');
    const result = schema.indexes.length === 1 && schema.indexes[0].field === 'name';
    logResult('testAddIndex', { success: result });
}

// Test: Eliminación de índice
async function testRemoveIndex() {
    const schema = new Schema({ name: { type: 'string' } });
    schema.addIndex('name');
    schema.removeIndex('name');
    const result = schema.indexes.length === 0;
    logResult('testRemoveIndex', { success: result });
}

// Test: Conversión de objeto a documento
async function testToDocument() {
    const definition = {
        name: { type: 'string' },
        age: { type: 'number' }
    };
    const schema = new Schema(definition);
    const data = { name: 'John Doe', age: 30 };
    const document = schema.toDocument(data);
    const result = document.name === 'John Doe' && document.age === 30;
    logResult('testToDocument', { success: result });
}

// Test: Conversión de documento a objeto
async function testToObject() {
    const definition = {
        name: { type: 'string' },
        age: { type: 'number' }
    };
    const schema = new Schema(definition);
    const document = { name: 'John Doe', age: 30 };
    const object = schema.toObject(document);
    const result = object.name === 'John Doe' && object.age === 30;
    logResult('testToObject', { success: result });
}

// Ejecutar todos los tests
async function runTests() {
    await testSchemaCreation();
    await testValidateDataValid();
    await testValidateDataInvalid();
    await testValidateAsyncDataValid();
    await testValidateAsyncDataInvalid();
    await testAddIndex();
    await testRemoveIndex();
    await testToDocument();
    await testToObject();
}

// Ejecutar los tests
runTests();