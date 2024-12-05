/**
 * Manager class for exporting and importing database records to/from files using the File System Access API.
 */

import { Crypto as crypto } from './Crypto.js';

class FileSystemManager {
  constructor(model, options = {}) {
    this.model = model;
    this.defaultFileName = options.defaultFileName || `${model.name}_backup`;
    this.supportInfo = this.checkCompatibility();
  }

  // Verificar soporte completo de la API
  static isSupported() {
    return 'showOpenFilePicker' in window 
        && 'showSaveFilePicker' in window 
        && 'FileSystemFileHandle' in window;
  }

  // Verificación detallada de compatibilidad del navegador
  checkCompatibility() {
    return {
      fullSupport: FileSystemManager.isSupported(),
      browserInfo: {
        isChrome: /Chrome/.test(navigator.userAgent),
        isFirefox: /Firefox/.test(navigator.userAgent),
        isSafari: /Safari/.test(navigator.userAgent) && !(/Chrome/.test(navigator.userAgent)),
        isEdge: /Edge/.test(navigator.userAgent)
      },
      recommendedAction: this.getRecommendedAction()
    };
  }

  // Obtener recomendación según compatibilidad del navegador
  getRecommendedAction() {
    if (!FileSystemManager.isSupported()) {
      return 'Su navegador no soporta completamente la API de Sistema de Archivos. Se utilizará un método de descarga alternativo.';
    }
    return null;
  }

  // Método fallback para exportación cuando no hay soporte nativo
  async _fallbackExport(allData) {    
    const jsonData = await crypto.encrypt({
      modelName: this.model.name,
      timestamp: new Date().toISOString(),
      data: allData
    });

    const blob = new Blob([JSON.stringify(jsonData)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${this.defaultFileName}_${new Date().toISOString().replace(/:/g, '-')}.irisdb`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return {
      success: true,
      method: 'fallback',
      recordsExported: allData.length
    };
  }

  // Exportar toda la base de datos a un archivo
  async exportToFile() {
    try {
      // Obtener todos los registros
      const allData = await this.model.find();
      // Si no hay soporte nativo, usar método fallback
      if (!FileSystemManager.isSupported()) {
        return await this._fallbackExport(allData);
      }

      // Configurar opciones para guardar archivo
      const options = {
        types: [{
          description: 'Iris Database Backup',
          accept: {'application/json': ['.irisdb']}
        }],
        suggestedName: `${this.defaultFileName}_${new Date().toISOString().replace(/:/g, '-')}.irisdb`
      };      
      // Abrir diálogo para seleccionar ubicación si es compatible y permitido      
      const fileHandle = await window.showSaveFilePicker(options);
      const writable = await fileHandle.createWritable();

      // Preparar datos para exportación
      const exportData = {
        modelName: this.model.name,
        timestamp: new Date().toISOString(),
        data: allData
      };
      const encryptedData = await crypto.encrypt(exportData);
      // Escribir datos
      await writable.write(JSON.stringify(encryptedData));
      await writable.close();

      return {
        success: true,
        recordsExported: allData.length,
        fileName: fileHandle.name,
        method: 'native'
      };
    } catch (error) {      
      console.warn('Error en exportación:', error);
      
      // Si falla la exportación nativa, intentar fallback
      if (!FileSystemManager.isSupported()) {
        try {
          const allData = await this.model.find();          
          return await this._fallbackExport(allData);
        } catch (fallbackError) {
          console.error('Error en fallback de exportación:', fallbackError);
        }
      }

      return {
        success: false,
        error: error.message,
        supportInfo: this.supportInfo
      };
    }
  }

  // Método fallback para importación
  async _fallbackImport() {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json,.irisdb';
      
      input.onchange = async (event) => {
        try {
          const file = event.target.files[0];
          const fileContent = await file.text();
          //const importData = JSON.parse(fileContent);
          const importData = await crypto.decrypt(JSON.parse(fileContent));
          // Validar datos importados
          if (importData.modelName !== this.model.name) {
            throw new Error('El archivo no corresponde a este modelo de base de datos');
          }

          // Limpiar datos existentes (opcional, configurable)
          const clearExisting = await this._confirmClearExistingData();
          if (clearExisting) {
            const existingRecords = await this.model.find();
            for (const record of existingRecords) {
              await this.model.delete(record[this.model.primary]);
            }
          }

          // Import new records
          const importedRecords = [];
          for (const record of importData.data) {
            const imported = await this.model.create(record, { castToScheme: true });
            importedRecords.push(imported);
          }

          resolve({
            success: true,
            method: 'fallback',
            recordsImported: importedRecords.length,
            timestamp: importData.timestamp
          });
        } catch (error) {
          console.warn('Error en importación fallback:', error);
          reject({
            success: false,
            error: error.message
          });
        }
      };

      //input.click();
      document.body.appendChild(input);
    });
  }

  // Importar datos desde un archivo
  async importFromFile() {
    try {
      // Si no hay soporte nativo, usar método fallback
      if (!FileSystemManager.isSupported()) {
        return await this._fallbackImport();
      }

      // Open file picker dialog if supported
      const [fileHandle] = await window.showOpenFilePicker({
        types: [{
          description: 'Iris Database Backup',
          accept: {'application/json': ['.irisdb']}
        }],
        multiple: false
      });

      const file = await fileHandle.getFile();
      const fileContent = await file.text();
      const importData = await crypto.decrypt(JSON.parse(fileContent));
      //const importData = JSON.parse(fileContent);

      // Validate imported data
      if (importData.modelName !== this.model.name) {
        throw new Error('El archivo no corresponde a este modelo de base de datos');
      }

      // Limpiar datos existentes (opcional, configurable)
      const clearExisting = await this._confirmClearExistingData();
      if (clearExisting) {
        const existingRecords = await this.model.find();
        for (const record of existingRecords) {
          await this.model.delete(record.id);
        }
      }

      // Importar nuevos registros
      const importedRecords = [];
      for (const record of importData.data) {
        const imported = await this.model.create(record);
        importedRecords.push(imported);
      }

      return {
        success: true,
        recordsImported: importedRecords.length,
        fileName: fileHandle.name,
        timestamp: importData.timestamp,
        method: 'native'
      };
    } catch (error) {
      console.warn('Error en importación:', error);
      
      // Si falla la importación nativa, intentar fallback
      if (!FileSystemManager.isSupported()) {
        try {
          return await this._fallbackImport();
        } catch (fallbackError) {
          console.error('Error en fallback de importación:', fallbackError);
        }
      }

      return {
        success: false,
        error: error.message,
        supportInfo: this.supportInfo
      };
    }
  }

  // Método privado para confirmar limpieza de datos
  async _confirmClearExistingData() {
    return new Promise((resolve) => {
      const confirmed = confirm('¿Desea eliminar los datos existentes antes de importar?');
      resolve(confirmed);
    });
  }

  // Método para crear copia de seguridad periódica
  setupAutoBackup(interval = 24 * 60 * 60 * 1000) { // Cada 24 horas por defecto
    return setInterval(async () => {
      try {
        await this.exportToFile();
      } catch (error) {
        console.error('Error en backup automático:', error);
      }
    }, interval);
  }
}

export { FileSystemManager };