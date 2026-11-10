# Contrato de la vista paramétrica (pantallas Regla y Detalle)

La pantalla **Regla** (`/plataformas/:proyectoId/categorias/:procesoId/canales/:subProcesoId/reglas/:regla`)
no tiene columnas en código: pinta la tabla que describe la plantilla del back, con TanStack Table v9.
Las acciones de la pantalla ("Resolver diferencias", "Descargar reporte" y el modal "Conciliación
procesada") son fijas del front: son las mismas en todas las reglas.

| Archivo | Para qué |
| --- | --- |
| `plantilla.schema.json` | JSON Schema (draft 2020-12) de la plantilla, versión 1.1: layout, bloques (`table`, `accordion`, `tabs`), columnas, catálogo de componentes y selección. |
| `datos.schema.json` | JSON Schema de la página de datos de un bloque de tabla. |
| `ejemplos/*.json` | Respuestas completas que debe devolver el back para las pantallas del diseño. Las pruebas del front las usan, así que siempre están al día. |

Todas las respuestas usan la envoltura habitual del API (`codigoEstado`, `respuestaEstado`, …, `resultado`);
los esquemas validan el contenido de `resultado`.

## Endpoints de la pantalla Regla

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

## Pantalla Detalle ("Detalle de la diferencia")

Ruta del front: `…/reglas/:regla/casos/:casoId` (a ella lleva el enlace "Ver detalle" de la tabla).
El encabezado (título, descripción, miga de pan y flecha de regreso) es fijo del front. El resto lo
decide la plantilla: qué bloques hay, en qué orden y de dónde sale cada dato.

Endpoints (cuelgan de `/Conciliaciones/subprocesos/{subProcesoId}/reglas/{regla}`):

| Método | Ruta | Ejemplo |
| --- | --- | --- |
| GET | `/casos/plantilla` | `ejemplos/detalle-plantilla.response.json`. Una plantilla por regla (no depende del caso): el front la pide una vez y la reutiliza al cambiar de caso. |
| GET | `/casos/{casoId}` | `ejemplos/detalle-caso.response.json`. Registro del caso: un objeto con los campos que usan los acordeones. La ruta la declara la plantilla (`dataSource.path` del bloque `accordion`). |
| GET | `/casos/{casoId}/historial` | `ejemplos/detalle-historial.response.json`. Misma forma que cualquier tabla (`datos.schema.json`). La ruta la declara la plantilla (`dataSource.path` del bloque `table`). |

Las rutas de los `dataSource.path` pueden usar `{proyectoId}`, `{procesoId}`, `{subProcesoId}`,
`{regla}` y `{casoId}`.

### Bloques nuevos (versión 1.1 del esquema)

Los bloques de `layout.items` se pintan en ese orden. Un bloque que no está en el layout solo se
pinta si otro lo referencia (hoy, una pestaña).

**Un mismo vocabulario en todos los bloques.** Cada bloque lleva su configuración bajo una clave con
el nombre de su `type` (`table`, `accordion`, `tabs`), y lo que se repite entre bloques se llama igual:

| Concepto | Nombre | Dónde |
| --- | --- | --- |
| Texto visible de una sección | `title` | Bloque (`table`, `accordion`), elemento de acordeón, pestaña y tarjeta de acordeón |
| Lista de elementos | `items` | `accordion.items`, `tabs.items` |
| Columnas de datos | `columns[]` con `id`, `accessorKey`, `header`, `cell` | `table.columns` y `content.columns` de cada acordeón |
| Estado sin datos | `emptyState` | `table` y `content` de cada acordeón |
| Celdas | Catálogo `{ component, inputs }` | Tablas y acordeones |

Las diferencias que quedan responden a la naturaleza del bloque: el acordeón lee **un registro**
(`dataSource` solo lleva `path`), no una página con paginación y orden, y su `header` es solo texto.

**`accordion`**: un registro, varios acordeones.

| Propiedad | Uso |
| --- | --- |
| `title` | Título de la sección. Admite `{campo}` del registro (en el diseño, el nombre del cliente). |
| `dataSource.path` | Endpoint que devuelve **un objeto** en `resultado` (no una página). |
| `accordion.type` | `multiple` (por defecto): varios abiertos a la vez. `single`: uno a la vez. |
| `accordion.layoutColumns` | `1` o `2`: cuántas columnas de la pantalla ocupan los acordeones. Con 2, en pantallas anchas la primera mitad de `items` va a la izquierda y el resto a la derecha. No es la lista de datos de cada acordeón (`content.columns`). |
| `accordion.items[]` | `id`, `title`, `defaultOpen` y `content`. |
| `content.title` | Título de la tarjeta. Admite `{campo}`: `"Número de guía: {pagoEnCasa.numeroGuia}"`. |
| `content.columns[]` | Un dato por columna: `id`, `accessorKey` (ruta con punto dentro del registro), `header` (texto de la etiqueta) y `cell` opcional. |
| `content.emptyState` | Mensaje cuando **ninguna** columna del acordeón trae dato (p. ej. el caso no existe en ese aplicativo). |

`cell` usa el mismo catálogo `{ component, inputs }` de las columnas de la tabla, solo con las celdas
que muestran un valor: `TextCell` (por defecto), `NumberCell`, `CurrencyCell`, `PercentCell`,
`DateCell`, `BooleanCell` y `BadgeCell`. Un dato sin valor va como `null` y se muestra "—"; si el
aplicativo completo no tiene datos, su objeto puede ir como `null`.

**`tabs`**: pestañas que muestran otros bloques.

| Propiedad | Uso |
| --- | --- |
| `tabs.items[]` | `id`, `title`, `blockId` (bloque que se pinta dentro) y `disabled` opcional. |
| `tabs.defaultTab` | `id` de la pestaña abierta al entrar. Por defecto, la primera habilitada. |

El contenido de cada pestaña se crea (y pide sus datos) la primera vez que se abre.

**`table`** dentro de una pestaña: igual que en la pantalla Regla. Dos opciones de `dataSource` que
usa el historial:

- `pagination.mode: "none"`: el front no envía `pageNumber` ni `pageSize` y no muestra paginador; el
  back devuelve todas las filas (`pageNumber: 1`, `totalPages: 1`, `pageSize` = `totalRows`).
- `sorting.mode: "client"`: el front ordena las filas que ya tiene y no envía `sort`. Con `"server"`
  envía `sort=campo:asc` igual que en la pantalla Regla.

El esquema no puede comprobar que cada `tabs.items[].blockId` y cada `layout.items[].blockId` exista:
conviene cubrirlo en las pruebas del back. Si falta, el front omite ese bloque y avisa en consola.

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
- `src/app/shared/components/view/`: un componente por tipo de bloque (`view-accordion.ts`,
  `view-tabs.ts`, `view-table.ts`) y `view-block.ts`, que elige cuál pintar según `type`.
- `src/app/shared/components/field-list/field-list.ts`: tarjeta de pares etiqueta / valor de un
  acordeón.
- `src/app/features/rule/detail/`: la pantalla Detalle (encabezado fijo + bloques del layout).

Para agregar un componente al catálogo: crear la celda en `cells/`, sumarla al `switch` de
`cells/value-cell.ts` (celdas de valor, sirven en tablas y campos) o de `template-table.ts` (celdas
que solo tienen sentido en una tabla) y a `plantilla.schema.json` (versión menor `1.x`).

Para agregar un tipo de bloque: tipo en `vista.model.ts`, componente en `view/`, caso en
`view-block.ts` y definición en `plantilla.schema.json` (versión menor `1.x`).
