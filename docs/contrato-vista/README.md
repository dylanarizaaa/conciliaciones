# Contrato de la vista paramétrica (pantalla Regla)

La pantalla **Regla** (`/plataformas/:proyectoId/categorias/:procesoId/canales/:subProcesoId/reglas/:regla`)
no tiene columnas en código: pinta la tabla que describe la plantilla del back, con TanStack Table v9.
Las acciones de la pantalla ("Resolver diferencias", "Descargar reporte" y el modal "Conciliación
procesada") son fijas del front: son las mismas en todas las reglas.

| Archivo | Para qué |
| --- | --- |
| `plantilla.schema.json` | JSON Schema (draft 2020-12) de la plantilla: layout, bloque de tabla, columnas, catálogo de componentes y selección. |
| `datos.schema.json` | JSON Schema de la página de datos de la tabla. |
| `ejemplos/*.json` | Respuestas completas que debe devolver el back para la pantalla del diseño. Las pruebas del front las usan, así que siempre están al día. |

Todas las respuestas usan la envoltura habitual del API (`codigoEstado`, `respuestaEstado`, …, `resultado`);
los esquemas validan el contenido de `resultado`.

## Endpoints

Todos cuelgan de `/Conciliaciones/subprocesos/{subProcesoId}/reglas/{regla}`:

| Método | Ruta | Ejemplo |
| --- | --- | --- |
| GET | `/plantilla` | `ejemplos/plantilla.response.json` |
| GET | `/casos?pageNumber=1&pageSize=10&sort=campo:asc` | `ejemplos/casos.response.json`. `sort` se repite si hay orden múltiple. La ruta la declara la plantilla (`dataSource.path`). |
| POST | `/casos/resolver` | Cuerpo: `ejemplos/resolver.request.json` (`{ "ids": [...] }`, los `rowId` seleccionados). Respuesta: `ejemplos/resolver.response.json`. |
| GET | `/casos/reporte?sort=campo:asc` | Archivo CSV (`text/csv`) con el orden actual de la tabla. |

Respuesta de "Resolver diferencias" (`resultado`):

| Campo | Uso en el front |
| --- | --- |
| `procesados` | Casos resueltos: salen de la lista al recargarla. |
| `pendientes` | Casos que requieren una nueva validación: siguen en estado Pendiente. |
| `validadoPor` | "Validado por" en el modal "Conciliación procesada". |
| `fechaValidacion` | "Fecha de validación" en el modal (ISO 8601; se muestra como 19/08/2026). |

## Requisito de la plantilla de la pantalla Regla

La plantilla debe traer **selección de filas**: `table.selection` y una columna con `RowCheckbox`
(y `SelectAllCheckbox` en el encabezado). "Resolver diferencias" envía las filas marcadas; sin esa
columna el botón queda deshabilitado y el front avisa en consola. El esquema es genérico y no puede
exigirlo solo para esta pantalla, así que conviene cubrirlo en las pruebas del back.

## Cómo se pinta (front)

- `src/app/shared/components/data-table/template/template-table.ts`: traduce la plantilla a
  `ColumnDef[]` de TanStack y al estado inicial (`columnPinning` con `start`/`end`, `columnVisibility`,
  `getRowId`).
- `src/app/shared/components/data-table/cells/`: catálogo cerrado de componentes (`TextCell`,
  `CurrencyCell`, `DateCell`, `BadgeCell`, `LinkCell`, `RowCheckbox`, `SelectAllCheckbox`,
  `SortIndicator`, …). Un componente desconocido se pinta como texto.
- `src/app/shared/components/data-table/data-table.ts`: tabla con anchos fijos, columnas fijas al
  desplazar, divisores y región desplazable accesible por teclado.
- `src/app/features/rule/`: la pantalla con sus acciones fijas; los endpoints de las acciones están en
  `src/app/core/data-access/reglas.service.ts`.

Para agregar un componente al catálogo: crear la celda en `cells/`, sumarla al `switch` de
`template-table.ts` y a `plantilla.schema.json` (versión menor `1.x`).
