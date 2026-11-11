# Delta de identidades observado en Supabase vivo — 2026-11-11

## Fuente y alcance

Se consultó Supabase en modo exclusivamente lectura el 11/11/2026. Conteos actuales observados:

- plantilla: 3
- menu: 3
- ficha: 59
- etiqueta: 5
- multimedia: 21
- relacion_ficha: 1
- ficha_etiqueta: 39

El dump del 10/11/2026 contenía 55 fichas y 34 asociaciones ficha-etiqueta. Por lo tanto, el candidato histórico de 122 identidades no cubre por sí solo el estado vivo.

## Delta identificado

Cuatro fichas nuevas, todas bajo menu 1, visibles y sin portada:

| id_ficha | título | etiqueta |
|---:|---|---:|
| 89 | BARRÍA CÉSAR LEONEL | 10 |
| 90 | BARRILIN RAUL ATILIO | 7 |
| 91 | BAZÁN RAMÓN NICOLÁS | 6 |
| 92 | BENAVIDÉZ DOMINGO | 7 |

También existe la asociación (33,6), que no estaba incluida en el candidato extraído del dump. El delta total son cinco asociaciones: (33,6), (89,10), (90,7), (91,6), (92,7).

## Identidades propuestas

Se conserva el namespace UUIDv5 del plan histórico `473fa076-fa8c-5182-a396-f772c5a8fca1` y la convención `UUIDv5(namespace, entidad + ':' + clave)`.

- ficha 89: `1e767600-0128-5594-9ee9-7f8977af6093`
- ficha 90: `6048126e-4a4f-54f7-9996-85790094962a`
- ficha 91: `e7cfbac1-9709-50df-94fd-3770650ec339`
- ficha 92: `93256373-3612-5a42-ac91-fa74cf84d4c2`
- ficha_etiqueta 33:6: `75e03d61-1027-582b-9fcf-aeb3a12a5aae`
- ficha_etiqueta 89:10: `4639536b-25e5-5a0c-86eb-dd911ef61133`
- ficha_etiqueta 90:7: `a4b6ea7a-3200-53a9-bc12-fc6ebf0f6a35`
- ficha_etiqueta 91:6: `5ce910e4-42c1-5ccd-98f5-e222faeaccf2`
- ficha_etiqueta 92:7: `35589c61-addd-5b1f-9c08-525f0a5f67b3`

## Validación y límites

`migraciones/migracion-identidades-supabase-delta-vivo-2026-11-11.sql` es una prueba transaccional candidata: comprueba conteos, padres reconciliados, ausencia de identidades previas, asigna temporalmente las nueve identidades y termina con ROLLBACK. No se ejecutó contra Supabase.

La migración histórica original sigue intacta porque está vinculada al dump y a sus pruebas de CI (55 fichas y 34 asociaciones). El delta es un complemento separado, no reemplaza ni altera el respaldo histórico.

Todavía no se verificó que los cuatro registros nuevos coincidan con alguna copia SQLite local ni que sus identidades estén persistidas en ambos nodos. Tampoco se ha aplicado el backfill histórico ni el delta en producción. Las fichas nuevas no tienen portada; esto evita agregar una dependencia de Storage para estas cuatro filas, pero no resuelve el backfill de multimedia y portadas históricas.
