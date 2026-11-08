# Arquitectura offline-first y sincronización — estado de desarrollo

## Objetivo del proyecto

El Menú Interactivo debe seguir funcionando aunque Internet sea lento, intermitente o no esté disponible. A largo plazo, el museo debe poder operar desde una PC-servidor propia, sin que Render, Supabase u otro proveedor externo sean requisitos para abrir y utilizar el sistema.

La nube se considera una integración/proveedor reemplazable y opcional para el funcionamiento local futuro; no debe ser una dependencia obligatoria del núcleo de la aplicación.

## Arquitectura objetivo

### Etapa actual: servicios externos disponibles
- Render aloja actualmente la aplicación.
- Supabase proporciona PostgreSQL y Storage.
- Se incorpora una instancia local con SQLite y archivos locales para sostener la operación cuando no haya conectividad.
- La aplicación debe indicar claramente si está online, offline o con sincronización pendiente.

### Operación sin conectividad
- El servidor local y los equipos conectados a la red LAN del museo deben poder seguir utilizando el menú sin acceso a Internet.
- Las lecturas y escrituras necesarias para la operación deben resolverse localmente.
- Cada escritura debe persistirse primero en el almacenamiento local y registrarse en una cola durable de cambios pendientes.
- La recuperación de Internet no debe bloquear la operación local.

### Futuro: servidor propio del museo
- Una PC-servidor del museo alojará la aplicación, la base de datos y los archivos multimedia.
- Los tótems y equipos de la red local accederán a ese servidor por LAN.
- El servidor del museo debe poder funcionar por sí solo, incluso si no existen cuentas o servicios activos en Render o Supabase.
- La sincronización con servicios externos podrá mantenerse como respaldo o integración opcional, pero no será necesaria para el uso diario local.

## Principios de diseño

1. **Independencia del proveedor:** separar la lógica de negocio de los adaptadores de persistencia y almacenamiento. No acoplar el motor de sincronización a APIs exclusivas de Supabase o Render.
2. **Persistencia local primero para operación offline:** ninguna escritura realizada sin conexión puede depender de una llamada remota exitosa.
3. **Identidad compartida:** usar UUID estables (sync_id) además de los IDs enteros existentes. Un mismo registro debe conservar el mismo UUID en todos los nodos.
4. **Versionado:** mantener versión por registro y metadatos de origen para detectar cambios concurrentes.
5. **Borrado replicable:** utilizar tombstones (sync_deleted_at) para propagar eliminaciones sin perderlas antes de que todos los nodos las reciban.
6. **Idempotencia:** cada evento debe tener un UUID único, origen y cursor/posición para que reintentos no dupliquen operaciones.
7. **Conflictos explícitos:** conservar las versiones en conflicto y aplicar una política documentada; no sobrescribir silenciosamente. La resolución manual es la opción inicial.
8. **Multimedia independiente:** transferir archivos por checksum, tamaño y tipo MIME; no asumir que una ruta local equivale a una URL de Storage.
9. **Seguridad:** autenticar nodos, autorizar operaciones, proteger secretos y no replicar contraseñas, sesiones ni tokens.
10. **Observabilidad:** mostrar estado de conectividad, última sincronización, operaciones pendientes, errores y conflictos.

## Datos incluidos y excluidos

Entidades candidatas a sincronización: plantillas, menús, fichas, etiquetas, relaciones ficha-etiqueta, relaciones entre fichas, configuración y metadatos multimedia.

Usuarios, credenciales, hashes de contraseñas, sesiones y tokens quedan excluidos de la replicación inicial. Los usuarios locales se administran en cada instalación mediante un procedimiento propio y seguro.

## Etapas de implementación

### Etapa 0 — aislamiento y pruebas locales
- Probar el modo local con una base SQLite descartable y archivos multimedia de prueba.
- Confirmar que la aplicación arranca y que las operaciones principales funcionan sin Internet.
- Confirmar que el modo local no intenta conectarse a Supabase ni modifica la base versionada o datos de producción.

### Etapa 1 — metadatos de sincronización
El script scripts/preparar-esquema-sincronizacion.js agrega columnas y tablas auxiliares de manera aditiva. No borra contenido ni cambia claves primarias. Ejecutar manualmente con npm run sync:preparar, por separado contra copias de SQLite y PostgreSQL, después de hacer backups.

**Identidad inicial:** el script NO asigna UUID aleatorios a los registros existentes. Hacerlo independientemente en cada base rompería la correspondencia entre el registro local y el remoto. Los sync_id existentes quedan NULL hasta completar una reconciliación explícita de ambas bases (manifiesto, comparación y aprobación de coincidencias).

### Etapa 2 — registro transaccional de cambios
- Registrar altas, modificaciones y eliminaciones dentro de las mismas transacciones de escritura.
- Persistir eventos localmente aunque no haya conectividad.
- Garantizar que la cola sobreviva reinicios y cortes de energía.

### Etapa 3 — protocolo y motor de sincronización
- Definir un protocolo neutral respecto del proveedor y versionado.
- Implementar autenticación entre nodos, intercambio incremental, cursores, reintentos e idempotencia.
- Resolver referencias mediante UUID compartidos.
- Evitar que la sincronización remota bloquee la operación local.

### Etapa 4 — multimedia y conflictos
- Transferir multimedia con checksum y reintentos.
- Implementar detección, visualización y resolución de conflictos.
- No eliminar archivos remotos/locales hasta confirmar que la política de retención lo permite.

### Etapa 5 — servidor propio del museo
- Desplegar aplicación, base de datos y archivos en la PC-servidor del museo.
- Configurar acceso por LAN para tótems y equipos.
- Verificar funcionamiento completo sin Internet ni credenciales de proveedores externos.
- Probar restauración de backups y recuperación ante fallos.

## Criterios de aceptación

- El menú de visitante y las funciones administrativas definidas como esenciales siguen operativas al desconectar Internet.
- Las escrituras offline permanecen después de reiniciar el servidor.
- Al recuperar conectividad, los cambios se intercambian sin duplicarse ni perderse.
- Se propagan altas, modificaciones y eliminaciones.
- Se detectan conflictos concurrentes y no se sobrescriben silenciosamente.
- Los archivos multimedia llegan íntegros, verificados por checksum.
- El servidor propio puede funcionar sin Render ni Supabase.
- Las pruebas se realizan primero con bases y archivos descartables; nunca contra producción.

## Estado actual y precauciones

La rama actual solo prepara metadatos y documentación. **Todavía no implementa el motor de sincronización ni garantiza operación offline integrada con el proyecto principal.**

No ejecutar el script en producción, no habilitar sincronización contra datos reales y no fusionar/desplegar estas ramas hasta completar las pruebas y la revisión.