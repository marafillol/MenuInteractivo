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

Entidades candidatas a sincronización: plantillas, menús, fichas, etiquetas, relaciones ficha-etiqueta, relaciones entre fichas y metadatos multimedia.

La tabla `configuracion` queda fuera del protocolo: conserva sus claves y valores locales (incluidos cursores y ajustes propios de cada instalación). Usuarios, credenciales, hashes de contraseñas, sesiones y tokens también quedan excluidos de la replicación. Los usuarios locales se administran en cada instalación mediante un procedimiento propio y seguro.

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

### Protocolo incremental implementado en la rama de trabajo

- La outbox registra cambios de plantillas, menús, fichas, etiquetas, asociaciones ficha-etiqueta, relaciones entre fichas y multimedia tanto en SQLite como en PostgreSQL, siempre que el esquema de sincronización haya sido preparado.
- El endpoint remoto `POST /api/sync/v1/exchange` recibe lotes autenticados mediante `SYNC_SHARED_SECRET`, aplica eventos idempotentes, conserva conflictos y devuelve eventos posteriores al cursor del dispositivo.
- El cliente SQLite consulta su outbox, envía hasta 100 eventos por intercambio, recibe cambios remotos y se reintenta cada 30 segundos cuando están configuradas `SYNC_REMOTE_URL` y `SYNC_SHARED_SECRET`.
- Los eventos aplicados se registran con su UUID original para evitar ciclos y duplicaciones.
- Los cambios concurrentes con versiones incompatibles se guardan en `sync_conflictos`; no se sobrescribe silenciosamente la fila local.
- Los registros de la tabla `multimedia` se conservan en staging inmutable por UUID/versión, se suben a Supabase Storage y se descargan en cada nodo con verificación SHA-256.
- Las nuevas portadas de menús y fichas se guardan con `storage_key`, checksum SHA-256, MIME y tamaño; el cliente local las transfiere mediante staging y conserva una copia en `imagenes/menus` o `imagenes/fichas`.
- El receptor verifica el checksum real antes de aplicar el evento y el cliente verifica nuevamente al descargar la portada.
- Los padres se resuelven por `sync_id`, nunca por IDs enteros locales.

### Límites que siguen pendientes

- La limpieza/garbage collection de objetos Storage antiguos todavía no está implementada: se conservan para no borrar archivos antes de que las réplicas reciban los eventos.
- El manifiesto de reconciliación genera candidatos de forma dependiente: menú después de plantilla, ficha después de menú, multimedia después de ficha y relaciones después de reconciliar todos sus extremos. `ficha_etiqueta` conserva su clave primaria compuesta.
- El aplicador manual acepta únicamente candidatos aprobados, comprueba los padres y no sobrescribe `sync_id` existentes. Si las dos copias tienen UUID distintos para el mismo contenido, el manifiesto informa el conflicto.
- La reconciliación histórica todavía no se ejecutó sobre copias reales; los registros con `sync_id` NULL no se deben sincronizar hasta completar la revisión y aplicación en ambas copias.
- El manifiesto exige checksum SHA-256 y tamaño coincidentes para considerar verificada una portada. Para multimedia comprueba que el campo tenga formato de 64 caracteres hexadecimales, pero no lee por sí mismo los bytes del archivo. La verificación binaria debe completarse antes de aprobar candidatos multimedia; el protocolo de transferencia comprueba el SHA-256 real al subir y descargar.
- Las portadas históricas que todavía no tienen checksum requieren un backfill/verificación de sus archivos en ambas copias. El aplicador bloquea candidatos de menú/ficha cuya portada esté pendiente o en conflicto.
- La tabla `configuracion` queda fuera del protocolo incremental por diseño.
- La transferencia de nuevas portadas está implementada en esta rama de trabajo; falta validar el backfill de portadas históricas y la recuperación de archivos antiguos.
- La resolución de conflictos es de registro y detección; falta una interfaz/operación administrativa para resolverlos.
- La suite de CI de la rama de trabajo aprobó las pruebas automatizadas, incluidas las de reconciliación en SQLite temporal. Todavía faltan pruebas de integración con PostgreSQL descartable y una validación controlada con copias reales.

### Configuración y despliegue

- En el servidor remoto PostgreSQL: configurar `SYNC_SHARED_SECRET` con un secreto aleatorio de al menos 32 caracteres.
- En cada instalación SQLite: configurar el mismo `SYNC_SHARED_SECRET` y `SYNC_REMOTE_URL` con la URL base del servidor remoto (por ejemplo `https://tu-servidor.example`).
- Preparar el esquema por separado en copias descartables de SQLite y PostgreSQL mediante `npm run sync:preparar`, seleccionando explícitamente `MODO_SERVIDOR` y la base de pruebas correspondiente. El script exige `SYNC_ALLOW_SCHEMA_MIGRATION=true` y `SYNC_SCHEMA_CONFIRMATION=I_HAVE_A_BACKUP_AND_APPROVE`; en modo local también exige `DATABASE_SQLITE_PATH`.
- El script de preparación agrega columnas/tablas; no ejecutarlo contra bases reales sin backup, aprobación y plan de reversión.
- No desplegar esta rama ni apuntar instalaciones reales al endpoint hasta completar la reconciliación inicial, multimedia, pruebas PostgreSQL y revisión de seguridad.

La rama no está lista para producción ni para sincronizar los datos reales del museo. No se ejecutó ninguna migración contra Supabase ni se alteró `main`.
