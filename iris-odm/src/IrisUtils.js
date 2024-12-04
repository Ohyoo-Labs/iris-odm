// IrisUtils class for helper methods

class IrisUtils {
  static async checkStorageQuota() {
    try {
      if (!navigator.storage || !navigator.storage.estimate) {
        throw new Error("Storage API no soportada en este navegador");
      }

      const estimate = await navigator.storage.estimate();
      const totalSpace = estimate.quota;
      const usedSpace = estimate.usage;
      const availableSpace = totalSpace - usedSpace;

      return {
        total: totalSpace,
        used: usedSpace,
        available: availableSpace,
        percentageUsed: (usedSpace / totalSpace) * 100,
        formattedTotal: this.formatStorage(totalSpace),
        formattedUsed: this.formatStorage(usedSpace),
        formattedAvailable: this.formatStorage(availableSpace),
      };
    } catch (error) {
      throw new Error(`Error al verificar almacenamiento: ${error.message}`);
    }
  }

  static formatStorage(bytes) {
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    if (bytes === 0) return "0 Bytes";
    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
    return Math.round(bytes / Math.pow(1024, i), 2) + " " + sizes[i];
  }

  static async getDatabaseSize(dbName) {
    try {
      const dbs = await window.indexedDB.databases();
      const targetDb = dbs.find((db) => db.name === dbName);
      if (!targetDb) {
        throw new Error("Base de datos no encontrada");
      }

      const estimate = await navigator.storage.estimate();
      // Aproximación del tamaño de la base de datos específica
      return {
        databaseName: dbName,
        approximateSize: estimate.usage, // Este es el uso total de IndexedDB
        formatted: this.formatStorage(estimate.usage),
      };
    } catch (error) {
      throw new Error(
        `Error al obtener tamaño de la base de datos: ${error.message}`
      );
    }
  }

  static async checkBrowserSupport() {
    return {
      indexedDB: !!window.indexedDB,
      storageAPI: !!(navigator.storage && navigator.storage.estimate),
      serviceWorker: "serviceWorker" in navigator,
      webWorker: !!window.Worker,
      browserInfo: this.getBrowserInfo(),
      storageQuota: await this.checkStorageQuota().catch(() => null),
    };
  }

  static getBrowserInfo() {
    const userAgent = navigator.userAgent;
    let browserName;
    let browserVersion;

    if (userAgent.match(/chrome|chromium|crios/i)) {
      browserName = "Chrome";
    } else if (userAgent.match(/firefox|fxios/i)) {
      browserName = "Firefox";
    } else if (userAgent.match(/safari/i)) {
      browserName = "Safari";
    } else if (userAgent.match(/opr\//i)) {
      browserName = "Opera";
    } else if (userAgent.match(/edg/i)) {
      browserName = "Edge";
    } else {
      browserName = "Unknown";
    }

    const match = userAgent.match(
      /(chrome|safari|firefox|opera|edge?)\/?\s*(\d+)/i
    );
    browserVersion = match ? match[2] : "Unknown";

    return {
      name: browserName,
      version: browserVersion,
      userAgent: userAgent,
    };
  }

  static async monitorStorageChanges(callback, interval = 5000) {
    let lastUsage = (await this.checkStorageQuota()).used;

    return setInterval(async () => {
      const currentQuota = await this.checkStorageQuota();
      const changed = currentQuota.used !== lastUsage;

      if (changed && callback) {
        callback({
          previous: lastUsage,
          current: currentQuota.used,
          difference: currentQuota.used - lastUsage,
          formattedDifference: this.formatStorage(
            currentQuota.used - lastUsage
          ),
        });
      }

      lastUsage = currentQuota.used;
    }, interval);
  }

  static async cleanup(model, options = {}) {
    const {
      olderThan = 30 * 24 * 60 * 60 * 1000, // 30 días por defecto
      maxEntries = null,
      minSpaceRequired = 100 * 1024 * 1024, // 100MB por defecto
    } = options;

    const quota = await this.checkStorageQuota();

    if (quota.available < minSpaceRequired) {
      const cutoffDate = new Date(Date.now() - olderThan);

      // Si existe un campo de fecha, lo usamos
      if (
        model.schema.definition.createdAt ||
        model.schema.definition.updatedAt
      ) {
        const dateField = model.schema.definition.updatedAt
          ? "updatedAt"
          : "createdAt";
        await model.deleteMany({ [dateField]: { $lt: cutoffDate } });
      }

      // Si se especificó un máximo de entradas
      if (maxEntries) {
        const allEntries = await model.find();
        if (allEntries.length > maxEntries) {
          const entriesToDelete = allEntries
            .sort(
              (a, b) =>
                (a.updatedAt || a.createdAt) - (b.updatedAt || b.createdAt)
            )
            .slice(0, allEntries.length - maxEntries);

          for (const entry of entriesToDelete) {
            await model.delete(entry.id);
          }
        }
      }
    }
  }

  static async generateUUIDv4() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  static async generateObjectId() {
    const timestamp = Math.floor(Date.now() / 1000).toString(16); // Tiempo en segundos en hexadecimal
    const randomBytes = Array.from(crypto.getRandomValues(new Uint8Array(5))) // 5 bytes aleatorios
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    const counter = Math.floor(Math.random() * 0xffffff)
      .toString(16)
      .padStart(6, "0"); // Contador aleatorio
    return timestamp + randomBytes + counter;
  }

  static Stringify(obj, schema, replacer = null, space = 2) {
    return JSON.stringify(obj, (key, value) => {
      console.log('Stringify', schema.definition[key]?.type === Date);
      if (schema.definition[key]?.type === Date) {
        alert('Date', value);
        // Usar Date.prototype.toString para formatear como "Wed Dec 04 2024 15:35:27 GMT-0300"
        return value.toString();
      }
      return value;
    }, space);
  }
}
export { IrisUtils };
