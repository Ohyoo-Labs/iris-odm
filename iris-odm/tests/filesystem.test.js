/**
 * @file Pruebas unitarias para el módulo FileSystemManager.
 */

// Importar clases necesarias
import { FileSystemManager, Schema, Model } from "../src/iris.js";
// Mock de datos
const mockData = [
  { name: "Test 421", createdAt: new Date() },
  { name: "Test 522", createdAt: new Date() },
];
const mockData2 = [
  { name: "Test 123", createdAt: new Date() },
  { name: "Test 456", createdAt: new Date() },
];
const mockSchema = new Schema({
  _id: { type: String, unique: true },
  name: { type: String, required: true },
  createdAt: { type: Date, required: true },
});
// Crear instancia de un modelo simulado
const mockModel = new Model("testModel", mockSchema);
// Conectar a la base de datos simulada
await mockModel.connect();
// Test suite
(async () => {
  console.log("Iniciando tests para FileSystemManager...");
  console.log("List Databases:", await mockModel.databases());
  console.log("Database Info:", await mockModel.analyzeDB("testModel"));
  // Insertar datos simulados
  for (const record of mockData) {
    await mockModel.create(record);
  }
  const switchCollection = await mockModel.switchCollection("collectionFake")
  if (switchCollection) {
    for (const record of mockData2) {
      await mockModel.create(record);
    }
  }else{
    console.log(`Error switching collection: collectionFake not found. Current activecollection turned to ${mockModel.activeCollection}`);
  }
  const addCollection = await mockModel.addCollections(["collectionFake"]);
  console.log("Result adding: ", addCollection);
  // Crear instancia de FileSystemManager
  const fsManager = new FileSystemManager(mockModel);

  // Test 1: Verificar compatibilidad
  const compatibility = fsManager.checkCompatibility();
  console.assert(
    compatibility.fullSupport !== undefined,
    "Compatibilidad no evaluada correctamente"
  );
  console.log("✔️ Verificación de compatibilidad completada");

  // Test 2: Exportación con fallback
  const fallbackExportResult = await fsManager._fallbackExport(mockData);
  console.log("Exportación con fallback:", fallbackExportResult);
  console.assert(
    fallbackExportResult.success,
    "La exportación con fallback falló"
  );
  console.log("✔️ Exportación con fallback completada");

  // Test 3: Exportación nativa (si es compatible)
  if (FileSystemManager.isSupported()) {
    const nativeExportResult = await fsManager.exportToFile();
    console.log("Exportación nativa:", nativeExportResult);
    console.assert(nativeExportResult.success, "La exportación nativa falló");
    console.log("✔️ Exportación nativa completada");
  } else {
    console.log("⚠️ Exportación nativa omitida por falta de compatibilidad");
  }

  // Test 4: Importación con fallback
  try {
    const fallbackImportResult = await fsManager._fallbackImport();
    console.log(
      "✔️ Importación con fallback completada:",
      fallbackImportResult
    );
  } catch (error) {
    console.log("⚠️ La importación con fallback falló:", error.message);
  }

  // Test 5: Importación nativa (si es compatible)
  if (FileSystemManager.isSupported()) {
    try {
      const nativeImportResult = await fsManager.importFromFile();
      console.assert(nativeImportResult.success, "La importación nativa falló");
      console.log("✔️ Importación nativa completada:", nativeImportResult);
    } catch (error) {
      console.log("⚠️ La importación nativa falló:", error.message);
    }
  } else {
    console.log("⚠️ Importación nativa omitida por falta de compatibilidad");
  }

  // Test 6: Configuración de backup automático
  try {
    const intervalId = fsManager.setupAutoBackup(5000); // Backup cada 5 segundos (test rápido)
    console.assert(
      intervalId,
      "El intervalo para backup automático no fue configurado correctamente"
    );
    console.log("✔️ Configuración de backup automático completada");
    clearInterval(intervalId); // Limpiar intervalo al final del test
  } catch (error) {
    console.log("⚠️ Configuración de backup automático falló:", error.message);
  }

  console.log("Todos los tests completados");
})();
