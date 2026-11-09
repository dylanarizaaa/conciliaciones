# Contrato de la vista paramétrica (pantalla Regla)

La pantalla **Regla** (`/plataformas/:proyectoId/categorias/:procesoId/canales/:subProcesoId/reglas/:regla`)
no tiene columnas en código: pinta lo que describe la plantilla del back, con TanStack Table v9.

| Archivo | Para qué |
| --- | --- |
| `plantilla.schema.json` | JSON Schema (draft 2020-12) de la plantilla: layout, bloques, columnas, catálogo de componentes, selección y acciones. |
| `datos.schema.json` | JSON Schema de la página de datos de un bloque. |
| `src/app/core/mock-backend/fixtures/*.json` | Plantilla y datos estáticos de la pantalla (las 10 filas del diseño). Son válidos contra los esquemas. |

Todas las respuestas usan la envoltura habitual del API (`codigoEstado`, `respuestaEstado`, …, `resultado`).

## Endpoints pendientes del back

Todos cuelgan de `/Conciliaciones/subprocesos/{subProcesoId}/reglas/{regla}`:

| Método | Ruta | Respuesta (`resultado`) |
| --- | --- | --- |
| GET | `/plantilla` | Plantilla (`plantilla.schema.json`). |
| GET | `/casos?pageNumber=1&pageSize=10&sort=campo:asc` | Página de datos (`datos.schema.json`). `sort` se repite si hay orden múltiple. |
| GET | `/casos/reporte?sort=campo:asc` | Archivo (CSV) con el orden actual. Acción `download` de la barra de la tabla. |
| POST | `/casos/resolver` con cuerpo `{ "ids": [...] }` | Resultado de la acción `request` "Resolver diferencias". |

Las rutas de datos y acciones las declara la propia plantilla (`dataSource.path`, `actions[].path`), así
que el back puede cambiarlas sin tocar el front.

## Backend simulado

Mientras el back publica esos endpoints, `src/app/core/mock-backend` los atiende con los JSON estáticos
(ordena y pagina como el servidor, genera el CSV y marca los casos como "Resuelto"). Los demás
endpoints (proyectos, procesos, subprocesos) van al back real.

Se apaga con `mockPendingEndpoints: false` en `src/environments/environment.ts`.

## Cómo se pinta (front)

- `shared/components/data-table/template/template-table.ts`: traduce la plantilla a `ColumnDef[]` de
  TanStack y al estado inicial (`columnPinning` con `start`/`end`, `columnVisibility`, `getRowId`).
- `shared/components/data-table/cells/`: catálogo cerrado de componentes (`TextCell`, `CurrencyCell`,
  `DateCell`, `BadgeCell`, `LinkCell`, `RowCheckbox`, `SelectAllCheckbox`, `SortIndicator`, …). Un
  componente desconocido se pinta como texto.
- `shared/components/data-table/data-table.ts`: tabla con anchos fijos, columnas fijas al desplazar,
  divisores y región desplazable accesible por teclado.
- La selección se guarda por `rowId` (`rowSelection` de TanStack): sobrevive al orden y a la
  paginación, y es lo que se envía en `{ "ids": [...] }`.

Para agregar un componente al catálogo: crear la celda en `cells/`, sumarla al `switch` de
`template-table.ts` y a `plantilla.schema.json` (versión menor `1.x`).
