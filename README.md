# IrisODM

IrisODM es un sistema de **Object Document Mapper (ODM)** diseñado para descentralizar bases de datos mediante el uso de **IndexedDB**, proporcionando una solución moderna, eficiente y flexible para la gestión de datos en aplicaciones del lado del cliente.

Este prototipo funcional incorpora varios módulos operativos que destacan por su enfoque en la **simplicidad**, la **eficiencia**, y la capacidad de ofrecer soluciones fuera de lo convencional.

---

## **¿Qué es IrisODM?**

IrisODM es una herramienta que redefine cómo las aplicaciones pueden trabajar con bases de datos tanto en el navegador como en webviews modernos si se trata de aplicaciones nativas, eliminando la dependencia exclusiva de servidores y promoviendo una arquitectura distribuida y portable.  
Con una estructura modular y extensible, permite a los desarrolladores gestionar datos locales de forma robusta, garantizando sincronización con servidores si lo requieren y opciones avanzadas como copias de respaldo portátiles **encriptadas** para mayor seguridad.

---

## **Ventajas de IrisODM**

- **Descentralización:** Aprovecha IndexedDB para almacenar y gestionar datos localmente, reduciendo la carga en servidores.
- **Modularidad:** Diseñado con cinco módulos principales que pueden integrarse según las necesidades del proyecto.
- **Simplicidad y eficiencia:** Abstracciones intuitivas que minimizan la complejidad del desarrollo sin sacrificar el rendimiento. Haciendo que se asemeje bastante a la experiencia de trabajar con otras Bases de Datos No-SQL.
- **Seguridad:** Los respaldos generados con extensión `.irisdb` están **encriptados**, garantizando la protección de los datos.
- **Portabilidad:** Integra una solución para respaldos locales mediante la **FileSystem API**, facilitando la exportación e importación de datos.
- **Sincronización remota:** Un módulo dedicado para sincronizar datos con un servidor, ideal para aplicaciones offline-first.
- **Escalabilidad:** Diseñado para adaptarse a proyectos de distintos tamaños, desde prototipos hasta implementaciones complejas.

---

## **Casos de uso**

1. **Aplicaciones offline-first:** Perfecto para apps que necesitan funcionar sin conexión, sincronizando los datos automáticamente cuando se restaure la conexión.
2. **Gestión de datos distribuidos:** Ideal para soluciones donde los usuarios deben trabajar con grandes volúmenes de datos localmente, sin depender de un servidor constante.
3. **Exportación e importación de datos:** Proyectos que requieran generar y gestionar copias de respaldo portátiles **seguras** de sus bases de datos.
4. **Aplicaciones basadas en la privacidad:** Almacena datos de forma local para maximizar el control del usuario sobre su información.

---

## **Módulos incluidos en el prototipo**

### 1. **Schema**
Define, valida y manipula esquemas de base de datos, incluyendo la creación de índices y la conversión de objetos a documentos.

### 2. **Model**  
Proporciona una interfaz para interactuar con los datos de forma estructurada, incluyendo operaciones CRUD (crear, leer, actualizar, eliminar) y soporte para validaciones personalizadas basadas en los esquemas definidos.

### 3. **IrisUtils**  
Incluye herramientas auxiliares para tareas comunes, como formateo de datos, manejo de errores y optimización de consultas, facilitando el desarrollo con IrisODM.


### 4. **Sync**
Permite conectar la base de datos local con un servidor para mantener los datos actualizados.

### 3. **FileSystemManager**
Facilita la exportación de datos locales en archivos para copias de seguridad y su posterior restauración.  
> **Nota:** Los respaldos generados con extensión `.irisdb` están encriptados, garantizando la seguridad de los datos.

*(Más módulos estarán disponibles en futuras versiones.)*

---

## **Tabla comparativa**

| Característica               | IrisODM       | Dexie.js      | PouchDB       |
|------------------------------|---------------|---------------|---------------|
| **Descentralización**        | ✔️            | ✔️            | ✔️            |
| **Sincronización remota**    | ✔️ (Módulo)   | ❌            | ✔️            |
| **Exportación encriptada**   | ✔️            | ❌            | ❌            |
| **Portabilidad de datos**    | ✔️ (FileSystem API) | ❌            | ✔️ (limitada) |
| **Definición de esquemas**   | ✔️ (Schema)   | ✔️ (básico)   | ❌            |
| **Modularidad**              | ✔️            | ✔️            | ❌            |

*(Esta tabla refleja el estado actual del prototipo y sus capacidades frente a otras soluciones populares establecidas.)*

---

## **Compromiso con la simplicidad y la eficiencia**

IrisODM nace del principio de que las herramientas deben ser poderosas pero fáciles de usar. Su diseño refleja un equilibrio entre funcionalidad avanzada y una experiencia de desarrollo fluida. Es una invitación a los desarrolladores a **pensar fuera de la caja** al abordar los desafíos de la gestión de datos modernos.

---

## **Estado del proyecto**

Actualmente, IrisODM está en su fase de prototipo funcional. Si bien no es una solución final, los módulos incluidos son operativos y ofrecen un punto de partida sólido para evaluar su utilidad en proyectos reales.

---

## **Contribuye al proyecto**

¡Tu colaboración es bienvenida! Si encuentras errores, tienes ideas para nuevos módulos o simplemente quieres ayudar a mejorar IrisODM, no dudes en abrir un issue o enviar un pull request.

---

## **Licencia**

Este proyecto se distribuye bajo la licencia [MIT](LICENSE).

---

**Explora IrisODM y descubre una forma más eficiente de trabajar con datos locales.**