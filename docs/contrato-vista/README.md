# Contrato de la vista paramétrica (pantallas Regla y Detalle)

Este contrato está acoplado al swagger de `Conciliaciones.Api` (v1.0). Las pantallas **Regla** y
**Detalle de la diferencia** no tienen columnas ni bloques en código: pintan lo que describe la
plantilla del back. El encabezado de cada pantalla y las acciones de Regla ("Resolver diferencias",
"Descargar reporte" y el modal "Conciliación procesada") son fijos del front.

| Archivo | Para qué |
| --- | --- |
| `plantilla.schema.json` | JSON Schema (draft 2020-12) de la plantilla, versión 1.1: layout, bloques (`table`, `accordion`, `tabs`), columnas, catálogo de componentes y selección. Valida `resultado.plantilla`. |
| `datos.schema.json` | Página de datos de un bloque de tabla (forma de `GetConciliationRowsResponse`). |
| `fuentes.schema.json` | Fuentes de un bloque de acordeones (forma de `GetConciliationFuentesDetailResponse`). |
| `ejemplos/*.json` | Respuestas completas con la forma del swagger. Las pruebas del front las usan, así que siempre están al día. |

Las respuestas usan la envoltura del API (`codigoEstado`, `respuestaEstado`, …, `resultado`). El
swagger declara `proyectos`, `procesos` y `subprocesos` sin envoltura: el front acepta ambas formas.

## Rutas del front

| Pantalla | Ruta |
| --- | --- |
| Canal | `/plataformas/:proyectoId/categorias/:procesoId/canales/:subProcesoId` |
| Regla | `…/canales/:subProcesoId/reglas/:reglaId` (`idRegla` del listado de reglas) |
| Detalle | `…/reglas/:reglaId/casos/:conciliacionId` (`rowId` de la fila de la tabla de Regla) |

El nombre de la regla (título y miga de pan) sale del listado de reglas del canal: no hay endpoint de
una sola regla. Si se abre la URL directamente, el front recorre ese listado hasta encontrarla.

## Endpoints que usa el front

Todos bajo `/ms-conciliaciones/api/v1`:

| Uso | Método y ruta | Ejemplo |
| --- | --- | --- |
| Reglas de un canal | `GET /Conciliaciones/subprocesos/reglas?subProcesoId=&pageNumber=&pageSize=` | (en las pruebas de Canal) |
| Plantilla de Regla | `GET /Conciliaciones/subprocesos-ui/plantilla?reglaId=&tipoBlock=1` | `plantilla.response.json` |
| Casos de la regla | `GET /Conciliaciones/subprocesos-registros/reglas?reglaId=&pageNumber=&pageSize=` (lo declara la plantilla) | `registros.response.json` |
| Resolver diferencias | `PUT /Conciliaciones/cambio-estado` con `{ "conciliacionId": [...] }` | `cambio-estado.request.json`, `cambio-estado.response.json` |
| Descargar reporte | `GET /Informes/export-excel?reglaId=` | `reporte.response.json` |
| Plantilla de Detalle | `GET /Conciliaciones/subprocesos-ui/plantilla?reglaId=&tipoBlock=2` | `detalle-plantilla.response.json` |
| Fuentes del caso | `GET /Conciliaciones/fuentes-detalle?conciliacionId=` (lo declara la plantilla) | `fuentes-detalle.response.json` |
| Historial del caso | **No existe en el swagger.** Propuesta: `GET /Conciliaciones/historial-cambios?conciliacionId=` | `detalle-historial.response.json` |

`tipoBlock` (1 = Regla, 2 = Detalle) no está documentado en el swagger: el front lo define en
`TIPO_BLOCK` (`src/app/core/data-access/vistas.service.ts`). Si el back usa otros valores, se cambian
solo ahí.

### Plantilla (`resultado.plantilla`)

`plantilla` es la plantilla de este contrato. Puede llegar como objeto o como texto JSON (si el back la
guarda serializada). Si llega vacía, la pantalla muestra su estado de error.

Las fuentes de datos declaran la ruta en `dataSource.path` y los parámetros en `dataSource.query`. Ambos
admiten `{proyectoId}`, `{procesoId}`, `{subProcesoId}`, `{reglaId}` y `{conciliacionId}`:

```json
"dataSource": {
  "path": "/Conciliaciones/subprocesos-registros/reglas",
  "query": { "reglaId": "{reglaId}" },
  "pagination": { "mode": "server", "defaultPageSize": 10 },
  "sorting": { "mode": "client" }
}
```

### Casos de la regla

El front envía `pageNumber` y `pageSize` (`pagination.mode: "server"`) y lee la página del swagger:
`data` (filas), `totalCount`, `totalPages`, y `casosTotales` / `montoAfectado` para el resumen.

El swagger no admite orden en este endpoint, así que la plantilla declara `sorting.mode: "client"`: el
front ordena las filas de la página actual. Si el back agrega `sort=campo:asc`, basta cambiar la
plantilla a `"server"`.

La plantilla debe traer **selección de filas** (`table.selection` y una columna con `RowCheckbox`) y
`table.rowId` debe ser el campo con el id de la conciliación (`conciliacionId` en el ejemplo): es lo que
viaja a `cambio-estado` y a la URL del detalle. Sin esa columna, "Resolver diferencias" queda
deshabilitado y el front avisa en consola.

### Resolver diferencias

Envía los `rowId` marcados como `{ "conciliacionId": [...] }`. Con la respuesta, el modal "Conciliación
procesada" muestra:

| Dato del modal | De dónde sale |
| --- | --- |
| Validado por | `validadoPor`, **no está en el swagger**. Solo se muestra si el back lo agrega. |
| Fecha de validación | `fechaValidacion` si el back la agrega; si no, la hora en que llegó la respuesta. |
| Casos actualizados | Cantidad de `actualizados`. |
| Casos no encontrados | Cantidad de `noEncontrados` (solo si hay). |

Después la lista se recarga: los casos resueltos dejan de aparecer.

### Descargar reporte

`export-excel` devuelve el archivo en base64 (`archivoBase64`), con `nombreArchivo` y `contentType`. El
front lo convierte en el archivo y usa `nombreArchivo` sin tildes ni espacios; si no llega, usa
`diferencias-<regla>.xlsx`.

## Pantalla Detalle

Los bloques de `layout.items` se pintan en ese orden. Un bloque que no está en el layout solo se pinta
si otro lo referencia (hoy, una pestaña).

**`accordion`**: un acordeón por cada fuente de `fuentes-detalle`, en el orden en que llegan. Cada
dato es una fila etiqueta (`nombre`) / valor (`valor`), y `tipo` elige la celda. La plantilla solo
decide la presentación:

| Propiedad | Uso |
| --- | --- |
| `title` | Título de la sección. Admite `{campo}` de la respuesta (fuera de `data`). El swagger no trae el nombre del cliente; si el back lo agrega (p. ej. `nombreCliente`), basta con `"title": "{nombreCliente}"`. Sin título, el front agrega uno solo para lectores de pantalla. |
| `dataSource` | `path` y `query` de la fuente (`/Conciliaciones/fuentes-detalle`, `{ "conciliacionId": "{conciliacionId}" }`). |
| `accordion.type` | `multiple` (por defecto): varios abiertos a la vez. `single`: uno a la vez. |
| `accordion.layoutColumns` | `1` o `2`. Con 2, en pantallas anchas la primera mitad de las fuentes va a la izquierda y el resto a la derecha. |
| `accordion.titleField` | `nombre` del dato que va como título de la tarjeta: `"Número de guía"` → "Número de guía: 70002333336". |
| `accordion.cellsByType` | Celda para cada `tipo`: `{ "decimal": { "component": "CurrencyCell" } }`. Mismo catálogo de la tabla, solo celdas de valor. |
| `accordion.emptyState` | Mensaje de una fuente sin datos. |

Sin `cellsByType`, el front reconoce los tipos habituales (sin distinguir mayúsculas):

| `tipo` | Celda |
| --- | --- |
| `moneda`, `currency`, `money`, `dinero`, `valor` | `CurrencyCell` (COP) |
| `int`, `integer`, `int32`, `int64`, `long`, `entero` | `NumberCell` sin decimales |
| `decimal`, `double`, `float`, `number`, `numero`, `numeric` | `NumberCell` |
| `date`, `fecha` | `DateCell` (19/08/2026) |
| `datetime`, `fechahora`, `timestamp` | `DateCell` con hora |
| `bool`, `boolean`, `booleano` | `BooleanCell` (Sí / No) |
| cualquier otro | `TextCell` |

Un `valor` `null` se muestra "—". Una fuente con `datos` vacío o sin valores muestra `emptyState`.

**`tabs`**: `tabs.items[]` con `id`, `title`, `blockId` (bloque que se pinta dentro) y `disabled`
opcional; `tabs.defaultTab` abre una pestaña al entrar. El contenido de cada pestaña se crea, y pide
sus datos, la primera vez que se abre.

**`table`** dentro de una pestaña: igual que en Regla. El historial usa `pagination.mode: "none"` (no
envía `pageNumber` ni `pageSize`) y `sorting.mode: "client"`.

El esquema no puede comprobar que cada `tabs.items[].blockId` y cada `layout.items[].blockId` exista:
conviene cubrirlo en las pruebas del back. Si falta, el front omite ese bloque y avisa en consola.

## Cómo se pinta (front)

- `src/app/core/data-access/`: servicios acoplados al swagger (`reglas.service.ts`, `vistas.service.ts`)
  y el modelo del contrato (`vista.model.ts`).
- `src/app/shared/components/data-table/template/template-table.ts`: traduce la plantilla a
  `ColumnDef[]` de TanStack y al estado inicial (`columnPinning` con `start`/`end`, `columnVisibility`,
  `getRowId`).
- `src/app/shared/components/data-table/cells/`: catálogo cerrado de componentes (`TextCell`,
  `CurrencyCell`, `DateCell`, `BadgeCell`, `LinkCell`, `RowCheckbox`, `SelectAllCheckbox`,
  `SortIndicator`, …). Un componente desconocido se pinta como texto. `value-cell.ts` tiene el mapeo
  de `tipo` a celda.
- `src/app/shared/components/view/`: un componente por tipo de bloque (`view-accordion.ts`,
  `view-tabs.ts`, `view-table.ts`) y `view-block.ts`, que elige cuál pintar según `type`.
- `src/app/features/rule/` y `src/app/features/rule/detail/`: las pantallas Regla y Detalle.

Para agregar un componente al catálogo: crear la celda en `cells/`, sumarla al `switch` de
`cells/value-cell.ts` (celdas de valor) o de `template-table.ts` (celdas que solo tienen sentido en una
tabla) y a `plantilla.schema.json` (versión menor `1.x`).
