/**
 * Contrato de la vista paramétrica (ver `docs/contrato-vista/*.schema.json`).
 *
 * Los nombres de tipos y propiedades siguen el JSON del contrato, que a su vez usa el
 * vocabulario de TanStack Table v9 (`accessorKey`, `enableSorting`, `pin: 'start' | 'end'`, ...).
 */

export type Scalar = string | number | boolean | null;

/** Tono semántico de un badge; el front lo traduce a colores de marca con contraste AA. */
export type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

/** Énfasis del valor: `lead` = texto principal (Negro digital), `highlight` = cifra destacada (Acento). */
export type Emphasis = 'default' | 'lead' | 'highlight';

// ---------------------------------------------------------------------------------------------
// Plantilla
// ---------------------------------------------------------------------------------------------

export interface ViewTemplate {
  /** Versión del contrato (`1.x`). Si falta, se asume la 1. */
  readonly schemaVersion?: string;
  readonly id?: string;
  /** Cambia cuando el back modifica la plantilla (sirve para invalidar la caché). */
  readonly revision?: string;
  readonly title?: string;
  readonly layout: ViewLayout;
  readonly blocks: readonly ViewBlock[];
}

export interface ViewLayout {
  readonly type: 'stack';
  readonly items: readonly { readonly blockId: string }[];
}

/**
 * Bloques que puede traer una plantilla. Los que se nombran en `layout.items` se pintan en ese
 * orden; los demás solo se pintan si otro bloque los referencia (p. ej. una pestaña).
 */
export type ViewBlock = TableBlock | AccordionBlock | TabsBlock;

export interface TableBlock {
  readonly id: string;
  readonly type: 'table';
  readonly title?: string;
  readonly dataSource: DataSource;
  readonly table: TableDefinition;
}

/**
 * Parámetros de consulta de una fuente de datos. Cada valor admite llaves `{param}` con los
 * parámetros de la ruta del front: `{ "reglaId": "{reglaId}" }` → `?reglaId=<id de la URL>`.
 */
export type QueryParams = Readonly<Record<string, string>>;

/** Fuente de un registro único (un objeto, no una lista paginada). */
export interface RecordSource {
  /** Ruta relativa al API base con llaves `{param}` (parámetros de la ruta del front). */
  readonly path: string;
  readonly query?: QueryParams;
}

/**
 * Acordeones (v1.1). Los datos salen siempre de `GET /Conciliaciones/fuentes-detalle` (fuente fija
 * del front): cada fuente (`id`) tiene sus datos (`id`, `nombre`, `tipo`, `valor`).
 *
 * - Con `accordion.items`, hay un acordeón por elemento: lee la fuente cuyo `id` es el del
 *   elemento, y cada columna lee el dato cuyo `id` es su `accessorKey`.
 * - Sin `items`, hay un acordeón por fuente, con todos sus datos.
 */
export interface AccordionBlock {
  readonly id: string;
  readonly type: 'accordion';
  /** Título de la sección; admite plantillas `{campo}` de la respuesta (fuera de `data`). */
  readonly title?: string;
  /** Se ignora: la fuente de los acordeones es fija del front. */
  readonly dataSource?: RecordSource;
  readonly accordion: AccordionDefinition;
}

export interface AccordionItemDefinition {
  /** `id` de la fuente en `fuentes-detalle` (p. ej. `fuentePrepagoMovimiento`). */
  readonly id: string;
  /**
   * Texto del acordeón. Si falta o es igual al `id`, el front usa el nombre que tiene asociado a
   * esa fuente (`tituloFuente`).
   */
  readonly title?: string;
  readonly defaultOpen?: boolean;
  readonly content: FieldListDefinition;
}

/** Contenido de un acordeón: título opcional y una columna por cada dato (encabezado / valor). */
export interface FieldListDefinition {
  /** Admite `{campo}` con los datos de la fuente: "Número de guía: {numeroGuia}". */
  readonly title?: string;
  /** Mensaje cuando ninguna columna trae dato (o la fuente no llegó). */
  readonly emptyState?: EmptyStateDefinition;
  readonly columns: readonly FieldColumnDefinition[];
}

/**
 * Columna de un acordeón: el mismo vocabulario que la columna hoja de una tabla (`id`, `header`,
 * `accessorKey`, `cell`), con encabezado de texto y solo celdas que muestran un valor.
 */
export interface FieldColumnDefinition {
  readonly id: string;
  readonly header: string;
  /** `id` del dato en la fuente. */
  readonly accessorKey: string;
  /** Si falta, la celda sale del `tipo` del dato (`cellsByType` o la celda por defecto). */
  readonly cell?: ValueCellRef;
}

export interface AccordionDefinition {
  /** `multiple` (por defecto) permite varios abiertos a la vez; `single`, solo uno. */
  readonly type?: 'single' | 'multiple';
  /** En pantallas anchas los acordeones se reparten, en orden, en 1 o 2 columnas de la pantalla. */
  readonly layoutColumns?: 1 | 2;
  /** Acordeones y columnas; sin `items`, un acordeón por fuente con todos sus datos. */
  readonly items?: readonly AccordionItemDefinition[];
  /**
   * Sin `items`: `nombre` del dato que va como título de la tarjeta ("Número de guía" →
   * "Número de guía: 70002333336"). Ese dato no se repite en la lista.
   */
  readonly titleField?: string;
  /**
   * Celda con la que se pinta cada dato según su `tipo` (`{ "decimal": { "component":
   * "CurrencyCell" } }`). Un tipo que no está aquí usa la celda por defecto del front.
   */
  readonly cellsByType?: Readonly<Record<string, ValueCellRef>>;
  /** Mensaje de una fuente sin datos, o cuando no llega ninguna fuente. */
  readonly emptyState?: EmptyStateDefinition;
}

export interface EmptyStateDefinition {
  readonly title: string;
  readonly description?: string;
}

/** Respuesta de la fuente de un bloque `accordion` (`GetConciliationFuentesDetailResponse`). */
export interface FuentesDetalle {
  readonly data?: readonly FuenteDetalle[] | null;
  /** Campos adicionales, disponibles para `{campo}` en el título del bloque. */
  readonly [campo: string]: unknown;
}

/** Un aplicativo y sus datos (`FuenteDetalleDto`). */
export interface FuenteDetalle {
  /** Identifica la fuente: es el `id` del acordeón en la plantilla (`accordion.items[].id`). */
  readonly id: string | null;
  /** Nombre visible de la fuente; solo se usa como título cuando la plantilla no trae `items`. */
  readonly nombre: string | null;
  readonly datos: readonly DatoDetalle[] | null;
}

/** Un dato de un aplicativo (`DatoDetalleDto`). */
export interface DatoDetalle {
  /** Identifica el dato: es el `accessorKey` de la columna en la plantilla. */
  readonly id: string | null;
  /** Etiqueta visible; solo se usa cuando la plantilla no trae `items`. */
  readonly nombre: string | null;
  /** Tipo del valor según el back (p. ej. `string`, `decimal`, `date`). */
  readonly tipo: string | null;
  /** Texto, número, booleano o `null`. Fechas en ISO 8601. */
  readonly valor: string | number | boolean | null;
}

/** Pestañas (v1.1): cada una muestra otro bloque de la plantilla. */
export interface TabsBlock {
  readonly id: string;
  readonly type: 'tabs';
  readonly tabs: TabsDefinition;
}

export interface TabsDefinition {
  /** `id` de la pestaña abierta al entrar; por defecto, la primera habilitada. */
  readonly defaultTab?: string;
  readonly items: readonly TabDefinition[];
}

export interface TabDefinition {
  readonly id: string;
  /** Texto de la pestaña. */
  readonly title: string;
  /** `id` del bloque que se pinta dentro de la pestaña. */
  readonly blockId: string;
  readonly disabled?: boolean;
}

export interface ColumnSortDefinition {
  readonly id: string;
  readonly desc: boolean;
}

export interface DataSource {
  /**
   * Ruta relativa al API base con llaves `{param}`. La tabla de la pantalla Regla no la necesita:
   * su fuente es fija del front (`/Conciliaciones/subprocesos-registros/reglas`).
   */
  readonly path?: string;
  readonly query?: QueryParams;
  readonly pagination?: {
    readonly mode?: 'server' | 'none';
    readonly defaultPageSize?: number;
    readonly pageSizeOptions?: readonly number[];
  };
  readonly sorting?: {
    readonly mode?: 'server' | 'client';
    readonly multi?: boolean;
    readonly default?: readonly ColumnSortDefinition[];
  };
  readonly filtering?: { readonly mode?: 'server' | 'client' };
}

export interface TableSelection {
  readonly mode: 'multi';
  /** Conserva lo marcado al cambiar de página (la selección se guarda por `rowId`). */
  readonly persistAcrossPages?: boolean;
}

export interface TableDefinition {
  /** Campo de la fila que la identifica de forma única y estable (`getRowId`). */
  readonly rowId: string;
  readonly density?: 'default' | 'compact';
  readonly emptyState?: EmptyStateDefinition;
  readonly selection?: TableSelection;
  readonly columns: readonly ColumnDefinition[];
}

export type ColumnDefinition = LeafColumnDefinition | GroupColumnDefinition;

export interface GroupColumnDefinition {
  readonly id: string;
  readonly header: HeaderRef;
  readonly columns: readonly ColumnDefinition[];
}

export interface LeafColumnDefinition {
  readonly id: string;
  /** Campo de la fila; admite rutas con punto (`cliente.nombre`). */
  readonly accessorKey?: string;
  readonly header: HeaderRef;
  /** Si falta, la columna se pinta con `TextCell`. */
  readonly cell?: CellRef;
  readonly meta?: {
    readonly align?: 'start' | 'center' | 'end';
    readonly width?: 'fill' | 'hug' | number;
  };
  readonly enableSorting?: boolean;
  readonly sortType?: 'alphanumeric' | 'text' | 'basic' | 'datetime';
  readonly enableColumnFilter?: boolean;
  readonly filter?: FilterRef;
  readonly hidden?: boolean;
  readonly enableHiding?: boolean;
  readonly pin?: 'start' | 'end';
}

export function isGroupColumn(column: ColumnDefinition): column is GroupColumnDefinition {
  return 'columns' in column && Array.isArray(column.columns);
}

// --- Encabezados ------------------------------------------------------------------------------

export interface SortIndicatorRef {
  readonly component: 'SortIndicator';
  readonly inputs: { readonly label: string };
}

export interface SelectAllCheckboxRef {
  readonly component: 'SelectAllCheckbox';
  readonly inputs: { readonly ariaLabel: string };
}

export type HeaderRef = string | SortIndicatorRef | SelectAllCheckboxRef;

// --- Celdas -----------------------------------------------------------------------------------

export interface TextCellInputs {
  readonly emphasis?: Emphasis;
  /** Segunda línea en gris bajo el valor principal. */
  readonly secondaryAccessorKey?: string;
  /** Corta el texto largo con puntos suspensivos y lo muestra completo como título. */
  readonly truncate?: boolean;
}

export interface NumberCellInputs {
  readonly emphasis?: Emphasis;
  readonly minimumFractionDigits?: number;
  readonly maximumFractionDigits?: number;
}

export interface CurrencyCellInputs extends NumberCellInputs {
  /** ISO 4217; por defecto COP. */
  readonly currency?: string;
  /** Campo de la fila con la moneda (tiene prioridad sobre `currency`). */
  readonly currencyField?: string;
  readonly signDisplay?: 'auto' | 'always' | 'exceptZero' | 'never';
}

export type PercentCellInputs = NumberCellInputs;

export interface DateCellInputs {
  readonly dateStyle?: 'short' | 'medium' | 'long';
  readonly timeStyle?: 'short' | 'medium';
  /** Zona IANA del negocio (p. ej. `America/Bogota`); si falta, la del navegador. */
  readonly timeZone?: string;
}

export interface BooleanCellInputs {
  readonly trueLabel?: string;
  readonly falseLabel?: string;
}

export interface BadgeVariant {
  readonly label: string;
  readonly tone: Tone;
}

export interface BadgeCellInputs {
  /** Valor de la fila → etiqueta y tono. */
  readonly variants: Readonly<Record<string, BadgeVariant>>;
  /** Para valores que no están en `variants`. */
  readonly fallback?: BadgeVariant;
}

export interface VisibleWhen {
  readonly field: string;
  readonly equals: Scalar;
}

export interface LinkCellInputs {
  readonly label: string;
  /** Nombre accesible con plantillas `{campo}` (p. ej. "Ver detalle de {cliente.nombre}"). */
  readonly ariaLabel: string;
  /** Segmentos relativos a la ruta actual con plantillas `{campo}`. */
  readonly route: readonly string[];
  readonly visibleWhen?: VisibleWhen;
}

export interface RowCheckboxInputs {
  /** Nombre accesible con plantillas `{campo}`. */
  readonly ariaLabel: string;
}

export type CellRef =
  | { readonly component: 'TextCell'; readonly inputs?: TextCellInputs }
  | { readonly component: 'NumberCell'; readonly inputs?: NumberCellInputs }
  | { readonly component: 'CurrencyCell'; readonly inputs?: CurrencyCellInputs }
  | { readonly component: 'PercentCell'; readonly inputs?: PercentCellInputs }
  | { readonly component: 'DateCell'; readonly inputs?: DateCellInputs }
  | { readonly component: 'BooleanCell'; readonly inputs?: BooleanCellInputs }
  | { readonly component: 'BadgeCell'; readonly inputs: BadgeCellInputs }
  | { readonly component: 'LinkCell'; readonly inputs: LinkCellInputs }
  | { readonly component: 'RowCheckbox'; readonly inputs: RowCheckboxInputs };

/** Celdas que solo muestran un valor: sirven en tablas y en listas de campos. */
export type ValueCellRef = Exclude<CellRef, { readonly component: 'LinkCell' | 'RowCheckbox' }>;

// --- Filtros (el contrato los admite; el front aún no los pinta) ------------------------------

export type FilterRef =
  | {
      readonly component: 'TextFilter';
      readonly inputs?: { readonly placeholder?: string; readonly minLength?: number };
    }
  | {
      readonly component: 'SelectFilter';
      readonly inputs: {
        readonly multiple?: boolean;
        readonly options: readonly { readonly value: string | number | boolean; readonly label: string }[];
      };
    }
  | {
      readonly component: 'DateRangeFilter' | 'NumberRangeFilter';
      readonly inputs?: { readonly fromLabel?: string; readonly toLabel?: string };
    };

// ---------------------------------------------------------------------------------------------
// Datos
// ---------------------------------------------------------------------------------------------

export type TableRow = Readonly<Record<string, unknown>>;

/** Objeto del que una celda lee sus campos (una fila o una respuesta completa). */
export type ViewRecord = Readonly<Record<string, unknown>>;

export interface TablePageSummary {
  readonly casosTotales: number;
  readonly montoAfectado: number;
}

/** Página de datos de un bloque de tabla, ya normalizada por el front. */
export interface TablePage {
  readonly pageNumber: number;
  readonly pageSize: number;
  readonly totalRows: number;
  readonly totalPages: number;
  /** Orden realmente aplicado por el back. */
  readonly sort?: readonly ColumnSortDefinition[];
  readonly filters?: Readonly<Record<string, unknown>>;
  readonly summary?: TablePageSummary;
  readonly rows: readonly TableRow[];
}

/**
 * Página tal como la devuelve el back en el swagger
 * (`GET /Conciliaciones/subprocesos-registros/reglas`, `GetConciliationRowsResponse`).
 */
export interface RegistrosPagina {
  readonly casosTotales?: number | null;
  readonly montoAfectado?: number | null;
  readonly totalCount?: number | null;
  readonly totalPages?: number | null;
  readonly pageNumber?: number | null;
  readonly pageSize?: number | null;
  readonly data?: readonly TableRow[] | null;
}

/** Página de datos junto con la hora de la consulta ("Última actualización"). */
export type TablePageConsulta = TablePage & { readonly consultadoEn: Date };
