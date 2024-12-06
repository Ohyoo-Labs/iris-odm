# **Módulo: Schema**

El módulo `Schema` es responsable de definir, validar y manipular la estructura de documentos dentro de IrisODM. Proporciona una interfaz flexible para la creación de esquemas, la definición de índices, la validación de datos y la conversión entre objetos y documentos.

---

## **Métodos principales**

### **Constructor**
```javascript
new Schema(definition)
```
- definition (Object): Define los campos y sus tipos esperados en el esquema.
- Descripción: Inicializa un esquema con la estructura especificada.

### addIndex(field, options = {})
```javascript
schema.addIndex('campo', { unique: true });
```
- field (String): Campo al que se le asignará un índice.
- options (Object): Opciones adicionales, como { unique: true }.
- Retorno: La instancia del esquema para encadenar métodos.
- Descripción: Añade un índice al esquema, útil para optimizar consultas.

### removeIndex(field)
```javascript
schema.removeIndex('campo');
```
- field (String): Campo cuyo índice será eliminado.
- Retorno: La instancia del esquema para encadenar métodos.
- Descripción: Elimina un índice previamente definido.

### validate(data)
```javascript
schema.validate({ campo: 'valor' });
```
- data (Object): Objeto a validar contra la definición del esquema.
- Retorno: True o Error.
- Descripción: Valida de forma síncrona los datos proporcionados según el esquema. Lanza un error si algún campo no cumple con su tipo definido.

### validateAsync(data)
```javascript
await schema.validateAsync({ campo: 'valor' });
```
- data (Object): Objeto a validar contra la definición del esquema.
- Retorno: True o Error.
- Descripción: Valida de forma asíncrona los datos proporcionados según el esquema. Lanza un error si algún campo no cumple con su tipo definido.

### toDocument(data)
```javascript
const document = schema.toDocument({ campo: 'valor' });
```
- data (Object): Objeto que se convertirá en un documento.
- Retorno: Un documento que incluye todos los campos definidos en el esquema, asignando null a los campos faltantes.
- Descripción: Convierte un objeto en un documento que cumple con el esquema.

### toObject(document)
```javascript
const object = schema.toObject(document);
```
- document (Object): Documento que se convertirá en un objeto plano.
- Retorno: Un objeto donde los campos con valor null se convierten en undefined.
- Descripción: Convierte un documento en un objeto, facilitando su uso en operaciones comunes.

## Métodos estáticos

### fromObject(definition)
```javascript
const schema = Schema.fromObject({ campo: { type: 'string' } });
```
- definition (Object): Definición del esquema en formato objeto.
- Retorno: Una instancia de Schema.
- Descripción: Crea un esquema a partir de un objeto.

### fromArray(definition)
```javascript
const schema = Schema.fromArray(['campo1', 'campo2']);
```
- definition (Array): Lista de campos a incluir en el esquema.
- Retorno: Una instancia de Schema.
- Descripción: Crea un esquema a partir de un array, asignando el tipo String por defecto a todos los campos.

### fromString(definition)
```javascript
const schema = Schema.fromString('campo1,campo2');
```
- definition (String): Lista de campos separada por comas.
- Retorno: Una instancia de Schema.
- Descripción: Crea un esquema a partir de una cadena de texto, asignando el tipo String por defecto a todos los campos.

## Ejemplo de uso
```javascript
import { Schema } from './Schema';

// Definición del esquema
const userSchema = new Schema({
  name: { type: 'string' },
  age: { type: 'number' },
});

// Añadir un índice
userSchema.addIndex('name', { unique: true });

// Validar datos
try {
  userSchema.validate({ name: 'John Doe', age: 30 });
} catch (error) {
  console.error(error.message);
}

// Convertir entre objetos y documentos
const doc = userSchema.toDocument({ name: 'John Doe' });
const obj = userSchema.toObject(doc);

console.log(doc); // { name: 'John Doe', age: null }
console.log(obj); // { name: 'John Doe', age: undefined }
```

# Model - IrisODM
El módulo `Model` de IrisODM es responsable de la interacción con las bases de datos `IndexedDB`. Este módulo abstrae operaciones complejas como crear, leer, actualizar, y eliminar datos, además de funcionalidades avanzadas como validación, creación de índices, manejo de múltiples colecciones, y operaciones de migración.

### Características principales

- Soporte para múltiples colecciones dentro de una misma base de datos.
- Gestión automática de versiones para manejar cambios en los esquemas o colecciones.
- Validación de datos basada en esquemas definidos.
- Creación de índices para optimizar las consultas.
- Métodos para búsquedas avanzadas, ordenación, y limitación de resultados.
- Seguridad de datos al recomendar claves primarias únicas y de longitud fija.

### Ejemplos de uso
### 1. Creación de una instancia del modelo
```javascript
import { Model } from './Model.js';
import { Schema } from './Schema.js';

const userSchema = new Schema({
  _id: { type: String, unique: true }, // Esta propiedad es opcional, si no se declara se genera por defecto. Recomendamos no agregarla manualmente al Schema y de hacerlo, siempre utilizar el type String. El indice unique tambien se creara por defecto.
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: () => new Date() },
});

const userModel = new Model('UserDatabase', userSchema, {
  version: 1,
  primary: '_id',
  collections: ['users', 'admins'],
  active: 'users',
});
```

### 2. Conectar y desconectar la base de datos
```javascript
await userModel.connect();
console.log('Base de datos conectada');

// Desconectar la base de datos
await userModel.disconnect();
console.log('Base de datos desconectada');
```
### 3. Métodos CRUD
Crear un registro
```javascript
await userModel.connect();
const newUser = await userModel.create({
  name: 'John Doe',
  email: 'john.doe@example.com',
});
console.log('Nuevo usuario creado:', newUser);
```

Leer un registro por ID
```javascript
const user = await userModel.findById(newUser._id);
console.log('Usuario encontrado:', user);
```
Leer múltiples registros con filtros
```javascript
const users = await userModel.find({ email: 'john.doe@example.com' });
console.log('Usuarios encontrados:', users);
```
Actualizar un registro
```javascript
const updatedUser = await userModel.update(
  { name: 'Johnathan Doe' },
  newUser._id
);
console.log('Usuario actualizado:', updatedUser);
```

Eliminar un registro
```javascript
await userModel.delete(newUser._id);
console.log('Usuario eliminado');
```
### Búsqueda avanzada con operadores
```javascript
// Datos de ejemplo en la colección "users"
const sampleData = [
  { _id: '1', name: 'Alice', age: 25, role: 'user' },
  { _id: '2', name: 'Bob', age: 30, role: 'admin' },
  { _id: '3', name: 'Charlie', age: 35, role: 'user' },
  { _id: '4', name: 'Diana', age: 40, role: 'admin' },
];

// Insertar los datos en la base de datos
await userModel.connect();
await userModel.switchCollection('users');
for (const user of sampleData) {
  await userModel.create(user);
}

// Búsqueda avanzada: usuarios mayores de 30 años y con rol "user"
const query = {
  age: { $gt: 30 }, // Edad mayor a 30
  role: { $in: ['user'] }, // Rol debe estar incluido en el array ['user']
};

const results = await userModel.find(query);
console.log('Resultados de la búsqueda avanzada:', results);
// Salida esperada:
// [
//   { _id: '3', name: 'Charlie', age: 35, role: 'user' }
// ]
```

### Explicación del query
1. Operador $gt: Filtra documentos donde el valor de la clave es mayor que el operando especificado.
2. En este caso, age: { $gt: 30 } busca usuarios con una edad mayor a 30.
3. Operador $in: Filtra documentos donde el valor de la clave está incluido en un array especificado.
4. Aquí, role: { $in: ['user'] } asegura que solo se devuelvan usuarios cuyo rol sea "user".

### Uso de otros operadores
Buscar usuarios entre 30 y 40 años excluyendo administradores:
```javascript
const query = {
  age: { $gte: 30, $lte: 40 }, // Edad entre 30 y 40 (inclusive)
  role: { $ne: 'admin' }, // Excluir administradores
};

const results = await userModel.find(query);
console.log('Usuarios entre 30 y 40 años (no admins):', results);
// Salida esperada:
// [
//   { _id: '3', name: 'Charlie', age: 35, role: 'user' }
// ]
```
Excluir roles específicos:
```javascript
const query = {
  role: { $nin: ['admin'] }, // Excluir el rol "admin"
};

const results = await userModel.find(query);
console.log('Usuarios sin rol admin:', results);
// Salida esperada:
// [
//   { _id: '1', name: 'Alice', age: 25, role: 'user' },
//   { _id: '3', name: 'Charlie', age: 35, role: 'user' }
// ]
```
Operadores permitidos en IrisODM
| Operador | Descripción                                   | Ejemplo de uso                             |
|----------|-----------------------------------------------|-------------------------------------------|
| `$gt`    | Mayor que.                                   | `{ age: { $gt: 25 } }` busca valores mayores a 25. |
| `$gte`   | Mayor o igual que.                           | `{ age: { $gte: 25 } }` busca valores mayores o iguales a 25. |
| `$lt`    | Menor que.                                   | `{ age: { $lt: 25 } }` busca valores menores a 25. |
| `$lte`   | Menor o igual que.                           | `{ age: { $lte: 25 } }` busca valores menores o iguales a 25. |
| `$ne`    | Diferente de.                                | `{ name: { $ne: "John" } }` busca valores diferentes de "John". |
| `$in`    | Dentro de un conjunto de valores.            | `{ status: { $in: ["active", "pending"] } }` busca valores que coincidan con "active" o "pending". |
| `$nin`   | Fuera de un conjunto de valores.             | `{ status: { $nin: ["inactive", "banned"] } }` busca valores que no coincidan con "inactive" ni "banned". |

### Ejemplo resumen de uso de operadores
1. `$gt` y `$gte`:
  - Buscar valores mayores o mayores o iguales:
```javascript
{ age: { $gt: 25 } } // Mayor que 25
{ age: { $gte: 25 } } // Mayor o igual a 25
```
2. `$lt` y `$lte`:
  - Buscar valores menores o menores o iguales:
```javascript
{ age: { $lt: 40 } } // Menor que 40
{ age: { $lte: 40 } } // Menor o igual a 40
```
3. $ne:
  - Excluir valores específicos:
```javascript
{ role: { $ne: 'admin' } } // Todos menos "admin"
```
4. `$in` y `$nin`:
  - Incluir o excluir múltiples valores:
```javascript
{ role: { $in: ['admin', 'user'] } } // Roles permitidos: admin o user
{ role: { $nin: ['guest'] } } // Excluir "guest"
```

### Nota importante
Si no usas un operador, IrisODM compara directamente el valor de la clave con el valor proporcionado:
```javascript
{ name: 'Alice' } // Coincide solo con documentos donde "name" sea exactamente "Alice".
```
Esto es lo que hace que el sistema sea tan flexible y fácil de usar para búsquedas simples y complejas.

### Caso de uso final: Sistema de gestión de usuarios
#### Escenario
Queremos implementar un sistema donde se puedan gestionar usuarios y administradores. Cada tipo de usuario debe estar en una colección separada, pero ambos comparten el mismo esquema.

#### Implementación:
```javascript
import { Model } from './Model.js';
import { Schema } from './Schema.js';

// Definir el esquema de usuarios
const userSchema = new Schema({
  _id: { type: String, unique: true }, // Esta propiedad es opcional, si no se declara se genera por defecto. Recomendamos no agregarla manualmente al Schema y de hacerlo, siempre utilizar el type String. El indice unique tambien se creara por defecto.
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  role: { type: String, enum: ['user', 'admin'], required: true },
  createdAt: { type: Date, default: () => new Date() },
});

// Crear el modelo de usuarios
const userModel = new Model('ManagementSystem', userSchema, {
  version: 1,
  primary: '_id',
  collections: ['users', 'admins'],
});

// Conectar a la base de datos
await userModel.connect();

// Crear usuarios
await userModel.switchCollection('users');
await userModel.create({ name: 'John Doe', email: 'john@example.com', role: 'user' });
await userModel.create({ name: 'Jane Smith', email: 'jane@example.com', role: 'user' });

// Crear administradores
await userModel.switchCollection('admins');
await userModel.create({ name: 'Admin User', email: 'admin@example.com', role: 'admin' });

// Leer y mostrar todos los usuarios
await userModel.switchCollection('users');
const users = await userModel.find();
console.log('Usuarios:', users);

// Leer y mostrar todos los administradores
await userModel.switchCollection('admins');
const admins = await userModel.find();
console.log('Administradores:', admins);

// Ordenar y mostrar usuarios por fecha de creación
const sortedUsers = await userModel.sort({
  fields: users,
  keyField: { name: 'createdAt', type: 'date' },
  order: 'asc',
});
console.log('Usuarios ordenados por fecha:', sortedUsers);

// Contar registros en cada colección
await userModel.switchCollection('users');
console.log('Total de usuarios:', await userModel.count());

await userModel.switchCollection('admins');
console.log('Total de administradores:', await userModel.count());

// Desconectar la base de datos
await userModel.disconnect();
```

Este caso de uso muestra cómo aprovechar todas las funcionalidades del módulo Model para implementar un sistema robusto de gestión de usuarios y administradores.

# IrisUtils - IrisODM

`IrisUtils` es una clase que contiene métodos auxiliares para gestionar almacenamiento, bases de datos y utilidades relacionadas con `IndexedDB`, Service Workers, y la manipulación de datos en el navegador o webview donde se utilice.

## Métodos

### `checkStorageQuota()`

Verifica el estado del almacenamiento disponible en el navegador.

#### Retorno:
Un objeto con información sobre el espacio total, utilizado, disponible y el porcentaje utilizado:

```javascript
{
  total: number, // Espacio total en bytes
  used: number, // Espacio utilizado en bytes
  available: number, // Espacio disponible en bytes
  percentageUsed: number, // Porcentaje de espacio utilizado
  formattedTotal: string, // Espacio total formateado
  formattedUsed: string, // Espacio utilizado formateado
  formattedAvailable: string, // Espacio disponible formateado
}
```

## Ejemplo de uso:
```javascript
const storageInfo = await IrisUtils.checkStorageQuota();
console.log(storageInfo);
```

### formatStorage(bytes)
Convierte una cantidad de bytes a una representación legible (KB, MB, GB, etc.).

**Parámetros:**

- bytes (number): Cantidad de bytes a convertir.

**Retorno:**

- Una cadena con el valor formateado (ej. "10 MB").

### Ejemplo de uso:
```javascript
const formattedStorage = IrisUtils.formatStorage(1048576);
console.log(formattedStorage); // "1 MB"
```

### getDatabaseSize(dbName)
Obtiene el tamaño aproximado de una base de datos `IndexedDB`.

**Parámetros:**

- dbName (string): El nombre de la base de datos.

**Retorno:**

- Un objeto con el nombre de la base de datos y el tamaño aproximado en formato legible:
```javascript
{
  databaseName: string,
  approximateSize: number,
  formatted: string
}
```
### Ejemplo de uso:
```javascript
const dbSize = await IrisUtils.getDatabaseSize('myDatabase');
console.log(dbSize);
```

### checkBrowserSupport()
- Verifica la compatibilidad del navegador o entorno virtual donde corra IrisDB con diversas APIs como `IndexedDB`, Storage API, Service Workers y Web Workers, etc.

**Retorno:**

- Un objeto con la compatibilidad registrada:
```javascript
{
  indexedDB: boolean, // Soporte para IndexedDB
  storageAPI: boolean, // Soporte para la Storage API
  serviceWorker: boolean, // Soporte para Service Worker
  webWorker: boolean, // Soporte para Web Worker
  browserInfo: object, // Información sobre el navegador o webview
  storageQuota: object | null, // Cuota de almacenamiento, si es soportada
}
```

### Ejemplo de uso:
```javascript
const browserSupport = await IrisUtils.checkBrowserSupport();
console.log(browserSupport);
```
### getBrowserInfo()

- Obtiene información sobre el navegador o webview, como su nombre, versión y User Agent.

**Retorno:**

- Un objeto con el nombre, versión y User Agent del navegador:
```javascript
{
  name: string, // Nombre del navegador
  version: string, // Versión del navegador
  userAgent: string, // User Agent
}
Ejemplo de uso:

const browserInfo = IrisUtils.getBrowserInfo();
console.log(browserInfo);
```
### monitorStorageChanges(callback, interval = 5000)
- Monitorea los cambios en el uso del almacenamiento y ejecuta una función de callback cuando detecta un cambio.

**Parámetros:**

- callback (function): Función que se ejecutará cuando cambie el uso del almacenamiento. Recibe un objeto con los datos anteriores y actuales.
- interval (number): Intervalo en milisegundos entre chequeos (por defecto, 5000ms).

**Retorno:**

- El ID del intervalo de ejecución.

### Ejemplo de uso:
```javascript
const monitorId = await IrisUtils.monitorStorageChanges((change) => {
  console.log(change);
});
```
### cleanup(model, options = {})
- Limpia los datos almacenados en `IndexedDB` según ciertas condiciones como antigüedad o número de entradas.

**Parámetros:**

- model (object): El modelo de datos sobre el que realizar la limpieza.
- options (object): Opciones para personalizar el comportamiento de la limpieza:
- olderThan (number): Tiempo en milisegundos (por defecto, 30 días).
- maxEntries (number): Número máximo de entradas a mantener.
- minSpaceRequired (number): Espacio mínimo requerido en bytes (por defecto, 100MB).

### Ejemplo de uso:
```javascript
await IrisUtils.cleanup(myModel, { olderThan: 15 * 24 * 60 * 60 * 1000 });
```

### generateUUIDv4()
- Genera un UUID versión 4.

**Retorno:**

- Un UUID generado aleatoriamente en formato de cadena.

### Ejemplo de uso:
```javascript
const uuid = await IrisUtils.generateUUIDv4();
console.log(uuid);
```

### generateObjectId()
- Genera un ObjectId con base en el tiempo actual y valores aleatorios basado en unicidad

**Retorno:**

- Un ObjectId generado en formato de cadena.

### Ejemplo de uso:
```javascript
const objectId = await IrisUtils.generateObjectId();
console.log(objectId);
```

### Resumen

La clase IrisUtils proporciona diversas utilidades relacionadas con la gestión de almacenamiento y bases de datos en el navegador, webview o entornos virtuales basados en estas tecnologías, incluyendo funciones para monitorear el uso del almacenamiento, limpiar datos, generar identificadores únicos, y obtener información sobre la compatibilidad del navegador.

# Sync Module - IrisODM

El módulo Sync de IrisODM permite realizar sincronización bidireccional entre una base de datos local basada en `IndexedDB` y un servidor remoto. Facilita la gestión de conflictos, la sincronización periódica, y el manejo de cambios locales y remotos de manera eficiente. Los usuarios pueden configurar la sincronización a su medida, incluyendo el control del espacio mínimo requerido, la estrategia de resolución de conflictos y los tamaños de los lotes de datos.

### Módulos Relacionados
Este módulo se integra con el modelo de datos de `IrisODM` para permitir la sincronización de registros. Funciona conjuntamente con los módulos `Schema` y `Model`, extendiendo el esquema de los modelos con campos específicos para la sincronización.

### Métodos
```javascript
constructor(model, options = {})
```
Crea una instancia de SyncManager para gestionar la sincronización entre el modelo local y el servidor remoto.

**Parámetros:**
- **model:** El modelo de datos con el que se va a trabajar.
- **options:** Configuraciones opcionales que incluyen:
- **syncUrl:** URL para realizar las operaciones de sincronización.
- **idField:** El campo que representa el identificador único (por defecto `_id`).
- **timestampField:** El campo que representa el timestamp de la última actualización (por defecto `updatedAt`).
- **minRequiredSpace:** Espacio mínimo requerido en el dispositivo (por defecto `50 MB`).
- **syncStatusField:** Campo que indica el estado de sincronización (por defecto `_syncStatus`).
- **serverIdField:** Campo que almacena el ID en el servidor (por defecto `_id`). Debe tener el mismo type que el identificador local o se intentara convertir antes de ejecutar la transacción de actualización.
- **lastSyncField:** El campo que guarda el timestamp de la última sincronización (por defecto `_lastSync`).
- **batchSize:** Tamaño del lote para las sincronizaciones (por defecto `50`).
- **conflictResolution:** Estrategia para resolver conflictos entre los datos locales y del servidor (por defecto `server-wins`).

### prepareSyncSchema()

- Añade campos adicionales al esquema del modelo para gestionar la sincronización, como el estado de sincronización, el último timestamp de sincronización, y campos para manejar errores y actualizaciones locales.

- **Devuelve:** `void` o `Error`

### pullFromServer(lastSyncTimestamp = null)

- Realiza una operación de pull (obtención de datos) desde el servidor, sincronizando los datos locales con los cambios remotos.

**Parámetros:**
- **lastSyncTimestamp:** El timestamp de la última sincronización (por defecto null).
**Devuelve:**
- Un objeto con los resultados de la sincronización:
```javascript
{
  success: Boolean,
  synchronized: Number, // Número de items sincronizados
  error: String | null   // Mensaje de error si ocurre uno
}
```

### pushToServer()

- Envía los cambios locales modificados al servidor. Los items marcados como `modified` se incluyen en el conjunto de cambios y se sincronizan con el servidor.

**Devuelve:**
- Un objeto con los resultados de la sincronización:
```javascript
{
  success: Boolean,
  synchronized: Number, // Número de items sincronizados
  error: String | null   // Mensaje de error si ocurre uno
}
```

### sync()

- Realiza una operación completa de sincronización. Primero, empuja los cambios locales al servidor, luego obtiene los cambios del servidor y los sincroniza con la base de datos local.

**Devuelve:**
- Un objeto con los resultados de la sincronización:
```javascript
{
  success: Boolean,
  pushed: Number,   // Número de items empujados al servidor
  pulled: Number,   // Número de items obtenidos del servidor
  error: String | null // Mensaje de error si ocurre uno
}
```

### handleConflict(localItem, serverItem)

- Resuelve los conflictos entre un item local y un item remoto del servidor. La estrategia de resolución de conflictos se configura con el parámetro `conflictResolution`.

**Parámetros:**

- **localItem:** El item local que tiene un conflicto.
- **serverItem:** El item remoto del servidor que tiene el conflicto.

**Devuelve:** 
- `Promise` con la actualización del item.

### getLastSyncTimestamp()

- Obtiene el timestamp de la última sincronización exitosa.

**Devuelve:** 
- El último timestamp de sincronización o null si no se encuentra.

### prepareForSync(item)

- Prepara un item para sincronizarlo, eliminando los campos locales que no deben enviarse al servidor, como el estado de sincronización, el ID del servidor y otros.

**Parámetros:**
- **item:** El item que se va a preparar para la sincronización.

**Devuelve:** 
- El item preparado para sincronización.

### watchChanges()

- Monitorea los cambios realizados en los items y marca los items modificados para su sincronización. Sobrescribe los métodos create y update del modelo para añadir la lógica de sincronización.

**Devuelve:** `void`

### setupAutoSync(interval = 300000)

- Configura la sincronización automática periódica, que por defecto ocurre cada 5 minutos (300,000 ms). 
- Llama al método sync() en intervalos regulares para mantener los datos sincronizados.

**Parámetros:**
- **interval:** El intervalo en milisegundos entre cada sincronización automática (por defecto 300,000 ms).

## Casos de Uso

### Sincronización de Datos Offline-First

- Ideal para aplicaciones móviles, web progresivas o IoT donde los usuarios pueden realizar cambios sin conexión a Internet y luego sincronizarlos cuando se restablezca la conexión.

### Gestión de Conflictos de Datos

- El módulo permite la configuración de diversas estrategias para resolver conflictos entre los datos locales y los remotos, lo que es útil en escenarios donde múltiples usuarios pueden modificar los mismos datos simultáneamente.

### Sincronización Periódica Automática

- Permite configurar la sincronización automática a intervalos específicos, asegurando que los datos locales y remotos estén siempre actualizados sin intervención del usuario.

### Especificaciones Técnicas
- **Dependencias:** Este módulo depende de la integración con el sistema de almacenamiento local de `IndexedDB` y el servidor remoto que proporcione las operaciones de sincronización.
- **Requisitos de Espacio:** La configuración permite definir un espacio mínimo requerido para realizar la sincronización, asegurando que el dispositivo tenga suficiente espacio disponible para la operación.
- **Manejo de Errores:** Los errores durante las operaciones de sincronización son gestionados y pueden ser reportados mediante un campo de errores en los items.

### Resumen
El Sync Module de IrisODM ofrece una solución completa para mantener los datos sincronizados entre una base de datos local y un servidor remoto. Con un enfoque flexible para resolver conflictos, manejar cambios y configurar la sincronización automática, permite que las aplicaciones mantengan la coherencia de los datos incluso en condiciones de conectividad limitada.

# FileSystemManager - IrisODM
El módulo `FileSystemManager` permite exportar e importar registros de base de datos utilizando la `API de Acceso al Sistema de Archivos`. Ofrece soporte nativo si el navegador o webview donde se ejecuta `IrisODM` lo permite, y un método alternativo de exportación e importación en caso de que la `API` no esté disponible. También proporciona la opción de configurar copias de seguridad periódicas de la base de datos asegurando la portabilidad y seguridad de la información de forma totalmente independiente de cualquier sistema externo o remoto.

## Especificaciones Técnicas

- **Compatibilidad con la API de Sistema de Archivos:** Usa la `FileSystem Access API` para interactuar con el sistema de archivos.
- **Cifrado de datos:** Los registros exportados se cifran utilizando el módulo `Crypto` para asegurar la integridad y privacidad de los datos.
- **Métodos Fallback:** Si la `API` no está disponible, el módulo usa un enfoque alternativo basado en la descarga y carga de archivos especifícos `.irisdb`.

## Métodos del Módulo

### static isSupported()

- Verifica si el entorno donde se ejecuta `IrisODM` soporta la `API de Acceso al Sistema de Archivos`.

**Retorno:**

- `true` si el entono soporta las funciones necesarias.
- `false` si no las soporta.

### checkCompatibility()

- Realiza una verificación detallada de la compatibilidad del navegador o webview y devuelve la información de soporte.

**Retorno:**

- Un objeto con:

    - **fullSupport:** `true` si el entorno soporta la `API de Acceso al Sistema de Archivos`. En caso contrario `false`.
    - **browserInfo:** Información sobre el entorno de ejecución actual.
    - **recommendedAction:** Acción recomendada si el entorno de ejecución no es completamente compatible.

### exportToFile()

- Exporta todos los registros de la base de datos a un archivo utilizando la `API de Sistema de Archivos` o un método alternativo si la `API` no está disponible.

**Retorno:**

- Un objeto con:
    - **success:** `true` si la exportación fue exitosa. en caso contrario `false`
    - **recordsExported:** Número de registros exportados.
    - method: Método usado para la exportación (`native` o `fallback`).
    - **fileName:** Nombre del archivo exportado (solo si se usa la exportación nativa).

### _fallbackExport(allData)

- Método privado que maneja la exportación de datos cuando la `API de Acceso al Sistema de Archivos` no está disponible, creando un archivo descargable.

**Retorno:**

- Un objeto con:
    - **success:** `true` si la exportación fue exitosa. en caso contrario `false`.
    - **method:** `fallback`.
    - **recordsExported:** Número de registros exportados.

### importFromFile()

- Importa registros desde un archivo utilizando la `API de Sistema de Archivos` o un método alternativo si la `API` no está disponible.

**Retorno:**

- Un objeto con:
    - **success:** `true` si la importación fue exitosa. Encaso contrario `false`.
    - **recordsImported:** Número de registros importados.
    - **fileName:** Nombre del archivo importado (solo si se usa la importación nativa).
    - **method:** Método usado para la importación (`native` o `fallback`).
    
### _fallbackImport()

- Método privado que maneja la importación de datos cuando la `API de Acceso al Sistema de Archivos` no está disponible, permitiendo al usuario seleccionar un archivo a cargar.

**Retorno:**

- Un objeto con:
    - **success:** `true` si la importación fue exitosa. En caso contrario `false`.
    - **method:** `fallback`.
    - **recordsImported:** Número de registros importados.

### _confirmClearExistingData()

- Método privado que solicita al usuario confirmar si desea eliminar los registros existentes antes de realizar una importación.

**Retorno:**

- `true` si el usuario confirma.
- `false` si el usuario cancela.

### setupAutoBackup(interval)

- Configura una copia de seguridad automática de la base de datos en intervalos definidos (por defecto, cada 24 horas).

**Parámetros:**

- **interval:** El intervalo en `milisegundos` entre cada copia de seguridad. El valor predeterminado es 24 horas (86400000 ms).

**Retorno:**

- Un identificador del intervalo de copia de seguridad, que se puede usar para cancelar la operación si es necesario.

## Casos de Uso

### Exportación de la Base de Datos

**Especificaciones:**

Utiliza la `API de Sistema de Archivos` si el entorno es compatible.
Si la `API` no está disponible, la exportación se realiza mediante la creación de un archivo descargable.
Los datos exportados son cifrados para asegurar la privacidad.

### Ejemplo de uso:
```javascript
const fileManager = new FileSystemManager(model);
const result = await fileManager.exportToFile();
console.log(result);
```
### Importación de Registros

**Especificaciones:**

Permite importar registros desde un archivo.
Si el entorno es compatible, usa la `API de Sistema de Archivos` para abrir el archivo.
Si la API no está disponible, el usuario debe seleccionar un archivo manualmente.

### E```jemplo de uso:
```javascript
const fileManager = new FileSystemManager(model);
const result = await fileManager.importFromFile();
console.log(result);
```

### Copias de Seguridad Automáticas

**Especificaciones:**

Configura una copia de seguridad automática de la base de datos que se ejecuta en intervalos definidos.
Se puede usar para mantener respaldos frecuentes sin intervención manual.

### Ejemplo de uso:
```javascript
const fileManager = new FileSystemManager(model);
fileManager.setupAutoBackup(); // Copia de seguridad cada 24 horas
```

### Conclusión
El módulo `FileSystemManager` es ideal para usuarios que necesitan exportar e importar registros de bases de datos de forma segura y con respaldo en caso de que la `API` nativa no esté disponible. Es una herramienta esencial para la gestión de datos en aplicaciones o sistemas que requieren portabilidad y seguridad en el manejo de información en un entorno altamente seguro.

# Crypto - IrisODM

El módulo `Crypto` proporciona funciones de encriptación y desencriptación de datos utilizando el algoritmo `AES-GCM`. Su objetivo principal es asegurar la privacidad de los datos dentro de la aplicación al cifrar los registros antes de almacenarlos o exportarlos, y desencriptarlos al importarlos.

- **Encriptación:** El método `encrypt` toma los datos que se desean encriptar y una contraseña (que por defecto es una contraseña fija). Usa el algoritmo `AES-GCM` para encriptar los datos y devuelve tanto los datos encriptados como el `vector de inicialización (IV)` utilizado para la operación.
- **Desencriptación:** El método `decrypt` toma los datos encriptados y el `IV` asociado. Luego, usa la misma contraseña (por defecto la misma fija) para generar la clave de descifrado y devuelve los datos en su formato origianl.

>El uso de este módulo es completamente interno y el usuario no debería necesitar interactuar directamente con él. Es importante resaltar que el módulo gestiona automáticamente la generación de claves y la encriptación/desencriptación de datos, brindando una capa de seguridad para la manipulación de la base de datos.

# iris.js

El archivo iris.js es el archivo principal que sirve como interfaz de acceso al sistema `IrisODM`. Su propósito es importar todas las clases y funciones necesarias para el correcto funcionamiento del sistema y luego exportarlas de manera centralizada. Este archivo no está destinado a pruebas, sino a ejecutar la aplicación, asegurando que todas las dependencias sean gestionadas de forma adecuada.

En su inicio, realiza una verificación de compatibilidad del navegador con `IndexedDB`, asegurándose de que el entorno de ejecución soporte el almacenamiento local necesario para las operaciones del sistema. Además, verifica que no se haya alcanzado el límite de cuota de almacenamiento, deteniendo la ejecución si alguno de estos requisitos no se cumple para evitar posibles brechas de seguridad.

**El archivo importa los siguientes módulos esenciales:**

- **IrisUtils:** Contiene funciones auxiliares para operaciones generales dentro del sistema.
- **Schema:** Define y gestiona los esquemas de las bases de datos.
- **Model:** Proporciona la interfaz principal para interactuar con los datos y las colecciones.
- **SyncManager:** Maneja la sincronización de datos con un servidor remoto.
- **FileSystemManager:** Permite la exportación e importación de datos mediante la `API` de acceso al sistema de archivos.

Al final, exporta estas clases para que puedan ser utilizadas de manera modular en otras partes de la aplicación.

# Conclusión

`IrisODM` es un prototipo funcional que busca ofrecer una solución eficiente para la gestión de bases de datos descentralizadas basadas en `IndexedDB`. Actualmente, el sistema está en una fase temprana de desarrollo y pruebas, por lo que puede presentar limitaciones o comportamientos no óptimos en ciertos escenarios. Sin embargo, sus módulos clave, como la gestión de esquemas, la sincronización remota y el acceso al sistema de archivos, proporcionan una base sólida para la expansión futura.

A medida que se continúe evaluando y probando `IrisODM`, es importante tener en cuenta que algunas características aún pueden estar en desarrollo o sujetas a cambios. El enfoque en la simplicidad, seguridad (como los respaldos encriptados) y la portabilidad de los datos son pilares fundamentales en su diseño.

Este prototipo está destinado principalmente a desarrolladores que deseen explorar su funcionalidad y ofrecer retroalimentación, ayudando así a mejorar el sistema. A largo plazo, `IrisODM` tiene el potencial de convertirse en una herramienta robusta para aplicaciones que necesiten gestionar datos de manera eficiente y segura, sin depender de soluciones centralizadas.