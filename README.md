# Menú Interactivo — Museo Malvinas

Aplicación web para administrar y consultar contenido histórico y multimedia del Museo Malvinas de San Carlos de Bariloche.

## Arquitectura

- **Aplicación:** Node.js + Express.
- **Modo online actual:** PostgreSQL y Storage mediante Supabase; despliegue web en Render.
- **Modo local/offline en desarrollo:** SQLite y archivos locales, con acceso por la red LAN del museo.
- **Sincronización:** protocolo incremental bidireccional en desarrollo, con outbox durable, UUID compartidos, versionado, cursores, detección de conflictos y transferencia multimedia verificada por SHA-256.

El modo local está pensado para que el museo pueda seguir operando sin Internet. La sincronización con servicios externos es complementaria: no debe ser requisito para abrir la aplicación local.

## Requisitos

- Node.js 22 LTS.
- npm.
- Para pruebas de integración PostgreSQL: PostgreSQL 17 y una base descartable local.
- Para el modo local: un archivo SQLite nuevo, una carpeta de datos y un secreto local propio.

## Desarrollo

Instalar dependencias:

```bash
npm ci
```

Ejecutar la aplicación según el modo y las variables de entorno configuradas:

```bash
npm start
```

Ejecutar la suite automatizada:

```bash
npm test
```

Las pruebas de esquema PostgreSQL y de integración bidireccional se ejecutan en los workflows de GitHub Actions sobre bases descartables; no apuntan a Supabase de producción.

## Documentación operativa

- [Instalación de una réplica local](docs/INSTALACION_SERVIDOR_LOCAL.md)
- [Inicialización segura desde Supabase](docs/BOOTSTRAP_SUPABASE_A_SQLITE.md)
- [Arquitectura y estado de la sincronización](docs/SINCRONIZACION_BIDIRECCIONAL.md)
- [Auditoría de solo lectura del Supabase observado el 11/11/2026](docs/AUDITORIA_SUPABASE_VIVO_2026-11-11.md)
- [Delta de identidades observado después del backup](docs/DELTA_IDENTIDADES_SUPABASE_VIVO_2026-11-11.md)

## Estado y precauciones

La sincronización bidireccional continúa en una rama de validación. Las pruebas automatizadas cubren SQLite y PostgreSQL descartables, incluidos eventos fuera de orden, reintentos, conflictos y transferencia multimedia simulada.

**No está habilitada para producción.** La auditoría del 11/11/2026 observó que el Supabase real todavía no tenía el esquema auxiliar ni los metadatos completos requeridos por el protocolo. Las migraciones e identidades candidatas del repositorio son material de revisión y prueba: no se deben ejecutar contra producción sin backup verificado, plan de rollback y aprobación explícita.

No usar `database/museo.db` como origen para inicializar una réplica nueva. No incluir respaldos, secretos ni archivos de datos reales en Git. Configurar siempre `DATABASE_SQLITE_PATH` con una ruta de datos local explícita.

## Repositorio

[GitHub — marafillol/MenuInteractivo](https://github.com/marafillol/MenuInteractivo)
