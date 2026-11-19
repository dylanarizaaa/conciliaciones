# Contrato de la vista paramétrica (pantallas Regla y Detalle)

Este contrato está acoplado al swagger de `Conciliaciones.Api` (v1.0). Las pantallas **Regla** y
**Detalle de la diferencia** no tienen columnas ni bloques en código: pintan lo que describe la
plantilla del back. El encabezado de cada pantalla y las acciones de Regla ("Resolver diferencias",
"Descargar reporte" y el modal "Conciliación procesada") son fijos del front.

| Archivo | Para qué |
| --- | --- |
| `plantilla.schema.json` | JSON Schema (draft 2020-12) de la plantilla, versión 1.1: layout, bloques (`table`, `accordion`, `tabs`), columnas, catálogo de componentes y selección. Valida la plantilla (`resultado`). |
| `datos.schema.json` | Página de datos de un bloque de tabla (forma de `GetConciliationRowsResponse`). |
| `fuentes.schema.json` | Fuentes de un bloque de acordeones (forma de `GetConciliationFuentesDetailResponse`). |
| `ejemplos/*.json` | Respuestas recomendadas, con la forma del swagger. Las pruebas del front las usan, así que siempre están al día. |
| `ejemplos/back/*.json` | Plantillas tal como las devuelve hoy el back. Las pruebas comprueban que el front las pinta. |

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
| Casos de la regla | `GET /Conciliaciones/subprocesos-registros/reglas?reglaId=&pageNumber=&pageSize=` (fijo del front) | `registros.response.json` |
| Resolver diferencias | `PUT /Conciliaciones/cambio-estado` con `{ "conciliacionId": [...] }` | `cambio-estado.request.json`, `cambio-estado.response.json` |
| Descargar reporte | `GET /Informes/export-excel?reglaId=` | `reporte.response.json` |
| Plantilla de Detalle | `GET /Conciliaciones/subprocesos-ui/plantilla?reglaId=&tipoBlock=2` | `detalle-plantilla.response.json` |
| Fuentes del caso | `GET /Conciliaciones/fuentes-detalle?conciliacionId=` (fijo del front) | `fuentes-detalle.response.json` |
| Historial del caso | **No existe en el swagger.** Propuesta: `GET /Conciliaciones/historial-cambios?conciliacionId=` | `detalle-historial.response.json` |

`tipoBlock` (1 = Regla, 2 = Detalle) no está documentado en el swagger: el front lo define en
`TIPO_BLOCK` (`src/app/core/data-access/vistas.service.ts`). Si el back usa otros valores, se cambian
solo ahí.

### Plantilla

El back devuelve la plantilla directamente en `resultado`. El front también acepta la forma del
swagger (`resultado.plantilla`), como objeto o como texto JSON. Si no llega, la pantalla muestra su
estado de error.

`schemaVersion` e `id` son opcionales: sin versión, el front asume la 1. Los `id` de bloque admiten
UUID.

**Lo fijo en el front.** La plantilla dice cómo se presentan los datos; el front pone lo que es igual
en todas las reglas:

| Qué | Dónde está |
| --- | --- |
| Fuente de la tabla de Regla (`subprocesos-registros/reglas`) | `FUENTES.casosRegla` en `vistas.service.ts`. Se ignora `dataSource.path`; de `dataSource` solo se usan `pagination` y `sorting`. |
| Fuente de los acordeones (`fuentes-detalle`) | `FUENTES.fuentesDetalle`. Se ignora el `dataSource` del bloque `accordion`. |
| Título de la tabla de Regla: "Diferencias por resolver" | `rule.ts`. Una plantilla puede cambiarlo con el `title` del bloque. |
| Encabezados de las pantallas ("Detalle de la diferencia", …) | Cada pantalla. El `title` raíz de la plantilla no se usa. |
| Nombre visible de cada fuente ("Prepago · Movimiento") | `TITULOS_FUENTE` en `src/app/core/data-access/fuentes.ts`. Se usa cuando el `title` del acordeón falta o es el mismo id técnico. Una fuente que no está en la lista se nombra a partir de su id ("fuenteNuevaFuente" → "Nueva fuente"). |

Solo una tabla dentro de una pestaña (p. ej. el historial) declara su fuente en `dataSource.path` y
`dataSource.query`. Ambos admiten `{proyectoId}`, `{procesoId}`, `{subProcesoId}`, `{reglaId}` y
`{conciliacionId}`.

### Casos de la regla

El front envía `pageNumber` y `pageSize` (`pagination.mode: "server"`) y lee la página del swagger:
`data` (filas), `totalCount`, `totalPages`, y `casosTotales` / `montoAfectado` para el resumen.

El swagger no admite orden en este endpoint, así que la plantilla declara `sorting.mode: "client"`: el
front ordena las filas de la página actual. Si el back agrega `sort=campo:asc`, basta cambiar la
plantilla a `"server"`.

"Ver detalle" debe usar `"route": ["casos", "{conciliacionId}"]`. La plantilla actual del back usa
`["conciliacionId", "{conciliacionId}"]`; el front redirige esa ruta al detalle mientras se corrige.

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

**`accordion`**: los datos salen de `fuentes-detalle`. Cada fuente tiene un `nombre` y sus `datos`
(`nombre`, `tipo`, `valor`).

Con `accordion.items` (así lo usa el back), hay un acordeón por elemento:

| Propiedad | Uso |
| --- | --- |
| `items[].id` | `nombre` de la fuente en `fuentes-detalle` (sin distinguir mayúsculas). Si la fuente no llega, el acordeón muestra `emptyState`. |
| `items[].title` | Texto del acordeón. Si falta o es igual al `id`, el front usa el nombre asociado a la fuente. |
| `items[].defaultOpen` | Abierto al entrar. |
| `content.title` | Título de la tarjeta, con `{campo}` de los datos: `"Número de guía: {numeroGuia}"`. Si falta algún dato, no se muestra. Los datos del título no se repiten en la lista. |
| `content.columns[]` | `id`, `accessorKey` (el `nombre` del dato), `header` y `cell` opcional. Sin `cell`, la celda sale del `tipo` del dato. |
| `content.emptyState` | Mensaje cuando la fuente no llega o ninguna columna trae dato. |

Sin `items`, hay un acordeón por fuente con todos sus datos; `accordion.titleField` dice qué dato va
como título de la tarjeta.

En los dos casos:

| Propiedad | Uso |
| --- | --- |
| `title` (del bloque) | Título de la sección. Admite `{campo}` de la respuesta (fuera de `data`). Sin título, el front agrega uno solo para lectores de pantalla. |
| `accordion.type` | `multiple` (por defecto): varios abiertos a la vez. `single`: uno a la vez. |
| `accordion.layoutColumns` | `1` o `2`. Con 2, en pantallas anchas la primera mitad va a la izquierda y el resto a la derecha. |
| `accordion.cellsByType` | Celda para cada `tipo` cuando la columna no trae `cell`: `{ "decimal": { "component": "CurrencyCell" } }`. |
| `accordion.emptyState` | Mensaje por defecto de una fuente sin datos. |

Sin `cell` ni `cellsByType`, el front reconoce los tipos habituales (sin distinguir mayúsculas):

| `tipo` | Celda |
| --- | --- |
| `moneda`, `currency`, `money`, `dinero`, `valor` | `CurrencyCell` (COP) |
| `int`, `integer`, `int32`, `int64`, `long`, `entero` | `NumberCell` sin decimales |
| `decimal`, `double`, `float`, `number`, `numero`, `numeric` | `NumberCell` |
| `date`, `fecha` | `DateCell` (19/08/2026) |
| `datetime`, `fechahora`, `timestamp` | `DateCell` con hora |
| `bool`, `boolean`, `booleano` | `BooleanCell` (Sí / No) |
| cualquier otro | `TextCell` |

Un `valor` `null` se muestra "—".

**`tabs`**: `tabs.items[]` con `id`, `title`, `blockId` (bloque que se pinta dentro) y `disabled`
opcional; `tabs.defaultTab` abre una pestaña al entrar. El contenido de cada pestaña se crea, y pide
sus datos, la primera vez que se abre.

**`table`** dentro de una pestaña: igual que en Regla. El historial usa `pagination.mode: "none"` (no
envía `pageNumber` ni `pageSize`) y `sorting.mode: "client"`.

El esquema no puede comprobar que cada `tabs.items[].blockId` y cada `layout.items[].blockId` exista:
conviene cubrirlo en las pruebas del back. Si falta, el front omite ese bloque y avisa en consola.

## Observaciones sobre las plantillas actuales del back

- Ids y documentos con `CurrencyCell` (`numeroDocumento`, `idMovimiento`, `idMovimientoPrepago`, `idFormaPago`, …) se muestran como dinero ("$ 3.452"). Para ids va `TextCell`, o `NumberCell` sin decimales.
- Las fechas con `TextCell` (`fechaCreacion` en la tabla de Regla) se muestran en ISO. Va `DateCell`.
- La columna "Tipo Movimiento" de la tabla de Regla lee `idMovimiento`.
- `fuentePrepagoDetalleCliente` repite la columna `primerNombre`.
- El `ariaLabel` de los checks y de "Ver detalle" usa `{conciliacionId}`: el lector de pantalla lee un UUID. Conviene el nombre del cliente (`{primerNombre} {primerApellido}`).

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
