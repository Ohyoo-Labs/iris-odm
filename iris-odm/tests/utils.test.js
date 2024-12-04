/**
 * @file Unit tests for the IrisUtils module.
 */

import { IrisUtils } from '../src/IrisUtils.js';
import { Schema } from '../src/Schema.js';
import { Model } from '../src/Model.js';

// Mock para IndexedDB
/* window.indexedDB = {
  databases: async () => [
    { name: 'TestDB1', version: 1 },
    { name: 'TestDB2', version: 2 }
  ]
}; */

// Mock para navigator.storage.estimate
/* navigator.storage = {
  estimate: async () => ({
    quota: 1024 * 1024 * 500, // 500MB
    usage: 1024 * 1024 * 150 // 150MB usados
  })
}; */

// Tests
(async function testIrisUtils() {
  console.log('Iniciando tests para IrisUtils...\n');

  // Test: checkStorageQuota
  try {
    const quotaInfo = await IrisUtils.checkStorageQuota();
    console.log('checkStorageQuota PASSED:', quotaInfo);
  } catch (error) {
    console.error('checkStorageQuota FAILED:', error.message);
  }

  // Test: formatStorage
  try {
    const formatted = IrisUtils.formatStorage(1024 * 1024 * 10); // 10MB
    console.log('formatStorage PASSED:', formatted === '10 MB' ? formatted : 'FAILED');
  } catch (error) {
    console.error('formatStorage FAILED:', error.message);
  }

  // Test: getDatabaseSize
  try {
    const dbSize = await IrisUtils.getDatabaseSize('testdb');
    console.log('getDatabaseSize PASSED:', dbSize);
  } catch (error) {
    console.error('getDatabaseSize FAILED:', error.message);
  }

  // Test: checkBrowserSupport
  try {
    const browserSupport = await IrisUtils.checkBrowserSupport();
    console.log('checkBrowserSupport PASSED:', browserSupport);
  } catch (error) {
    console.error('checkBrowserSupport FAILED:', error.message);
  }

  // Test: getBrowserInfo
  try {
    const browserInfo = IrisUtils.getBrowserInfo();
    console.log('getBrowserInfo PASSED:', browserInfo);
  } catch (error) {
    console.error('getBrowserInfo FAILED:', error.message);
  }

  // Test: monitorStorageChanges
  try {
    let monitorCount = 0;
    const monitorId = await IrisUtils.monitorStorageChanges(change => {
      monitorCount++;
      console.log('monitorStorageChanges CALLBACK:', change);
      if (monitorCount > 1) clearInterval(monitorId);
    }, 1000);

    console.log('monitorStorageChanges PASSED (esperando cambios simulados)...');
  } catch (error) {
    console.error('monitorStorageChanges FAILED:', error.message);
  }

  // Test: cleanup
  try {
    // Mock Schema and Model for cleanup
    const schema = new Schema({
      //_id: { type: String, unique: true },
      name: { type: String },
      updatedAt: { type: Date }
    });

    const model = new Model('TestModel', schema);

    // Mock de datos en el modelo
    await model.create({ name: 'Test1', updatedAt: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000) });
    await model.create({ name: 'Test2', updatedAt: new Date() });

    await IrisUtils.cleanup(model, { olderThan: 30 * 24 * 60 * 60 * 1000 });

    const remaining = await model.find();
    console.log('cleanup PASSED:', remaining.length >= 1 ? remaining : 'FAILED');
  } catch (error) {
    console.error('cleanup FAILED:', error.message);
  }

  console.log('\nTests para IrisUtils completados.');
})();