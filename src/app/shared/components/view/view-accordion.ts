import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { HlmAccordionImports } from '@spartan-ng/helm/accordion';
import { HlmSkeleton } from '@spartan-ng/helm/skeleton';
import { tituloFuente } from '../../../core/data-access/fuentes';
import type {
  AccordionBlock,
  AccordionDefinition,
  AccordionItemDefinition,
  EmptyStateDefinition,
  FuenteDetalle,
  ValueCellRef,
  ViewRecord,
} from '../../../core/data-access/vista.model';
import {
  interpolateRow,
  isEmptyValue,
  resolveApiPath,
  resolveQuery,
} from '../../../core/data-access/vista.utils';
import { FUENTES, VistasService } from '../../../core/data-access/vistas.service';
import { cellForType, valueCellResolver } from '../data-table/cells/value-cell';
import { resourceValue } from '../../../core/resource/resource-value';
import { EmptyState } from '../empty-state/empty-state';
import { ErrorState } from '../error-state/error-state';
import { FieldList, type FieldListRow } from '../field-list/field-list';
import { SectionTitle } from '../section-title/section-title';

/** Acordeones de relleno mientras llegan las fuentes. */
const SKELETON_ITEMS = 6;

let nextId = 0;

interface AccordionItem {
  readonly key: string;
  readonly title: string;
  readonly defaultOpen: boolean;
  /** Título de la tarjeta; vacío si no hay o si le falta algún dato. */
  readonly cardTitle: string;
  readonly rows: readonly FieldListRow[];
  readonly empty: boolean;
  readonly emptyState?: EmptyStateDefinition;
}

/**
 * El contrato pide valores escalares (texto, número, booleano) o `null`. Un objeto o una lista
 * (p. ej. `{}` de un decimal mal serializado) se trata como dato vacío para no pintar "[object
 * Object]".
 */
function escalar(valor: unknown): unknown {
  return valor !== null && typeof valor === 'object' ? null : valor;
}

/** Datos de una fuente con búsqueda por `id` (el `accessorKey` de la columna), sin distinguir mayúsculas. */
class DatosFuente {
  private readonly porId = new Map<string, { valor: unknown; tipo: string | null }>();

  constructor(fuente: FuenteDetalle | undefined) {
    for (const dato of fuente?.datos ?? []) {
      if (dato?.id) {
        this.porId.set(normalize(dato.id), { valor: escalar(dato.valor), tipo: dato.tipo });
      }
    }
  }

  valor(id: string): unknown {
    return this.porId.get(normalize(id))?.valor;
  }

  tipo(id: string): string | null {
    return this.porId.get(normalize(id))?.tipo ?? null;
  }

  /** Para las celdas que leen otros campos (p. ej. `currencyField`). */
  get record(): ViewRecord {
    return new Proxy({}, { get: (_, key) => (typeof key === 'string' ? this.valor(key) : undefined) });
  }
}

const normalize = (value: string) => value.trim().toLowerCase();
const PLACEHOLDER = /\{([^{}]+)\}/g;

/** `id` de los datos que usa un título: "Guía {numeroGuia}" → {"numeroguia"}. */
function placeholders(template: string | undefined): Set<string> {
  return new Set([...(template ?? '').matchAll(PLACEHOLDER)].map(([, nombre]) => normalize(nombre)));
}

/** "Número de guía: {numeroGuia}" con los datos de la fuente; vacío si falta algún dato. */
function cardTitle(template: string | undefined, datos: DatosFuente): string {
  if (!template) {
    return '';
  }
  let completo = true;
  const title = template.replace(PLACEHOLDER, (_, nombre: string) => {
    const valor = datos.valor(nombre);
    if (isEmptyValue(valor)) {
      completo = false;
      return '';
    }
    return String(valor);
  });
  return completo ? title.trim() : '';
}

function row(
  header: string,
  nombre: string,
  cell: ValueCellRef | undefined,
  datos: DatosFuente,
  config: AccordionDefinition,
): FieldListRow & { readonly value: unknown } {
  const value = datos.valor(nombre);
  const resolve = valueCellResolver(cell ?? cellForType(datos.tipo(nombre), config.cellsByType), { wrap: true });
  return { header, value, view: resolve(value, datos.record) };
}

/** Acordeón definido en la plantilla: lee la fuente con su mismo `id`. */
function fromTemplate(
  item: AccordionItemDefinition,
  index: number,
  fuentes: ReadonlyMap<string, FuenteDetalle>,
  config: AccordionDefinition,
): AccordionItem {
  const fuente = fuentes.get(normalize(item.id));
  const datos = new DatosFuente(fuente);
  const rows = item.content.columns.map((column) => ({
    ...row(column.header, column.accessorKey, column.cell, datos, config),
    accessorKey: normalize(column.accessorKey),
  }));
  const title = cardTitle(item.content.title, datos);
  // Un dato que ya está en el título de la tarjeta no se repite en la lista (diseño).
  const enTitulo = title ? placeholders(item.content.title) : new Set<string>();
  return {
    key: `${index}-${item.id}`,
    title: item.title!,
    defaultOpen: item.defaultOpen ?? false,
    cardTitle: title,
    rows: rows.filter(({ accessorKey }) => !enTitulo.has(accessorKey)),
    empty: !fuente || rows.every(({ value }) => isEmptyValue(value)),
    emptyState: item.content.emptyState ?? config.emptyState,
  };
}

/** Sin `items` en la plantilla: un acordeón por fuente con todos sus datos, con sus etiquetas. */
function fromData(fuente: FuenteDetalle, index: number, config: AccordionDefinition): AccordionItem {
  const titleField = config.titleField ? normalize(config.titleField) : '';
  const todos = (fuente.datos ?? [])
    .filter((dato) => !!dato && !!(dato.nombre || dato.id))
    .map((dato) => ({ ...dato, valor: escalar(dato.valor), etiqueta: (dato.nombre || dato.id)! }));
  const esTitulo = (dato: (typeof todos)[number]) =>
    !!titleField && [dato.id, dato.nombre].some((clave) => !!clave && normalize(clave) === titleField);
  const titulo = todos.find(esTitulo);
  const rows = todos
    .filter((dato) => dato !== titulo)
    .map((dato) => ({
      header: dato.etiqueta,
      view: valueCellResolver(cellForType(dato.tipo, config.cellsByType), { wrap: true })(dato.valor, {}),
    }));
  const id = fuente.id?.trim() || fuente.nombre?.trim() || `Aplicativo ${index + 1}`;
  return {
    key: `${index}-${id}`,
    title: tituloFuente(id, fuente.nombre),
    defaultOpen: false,
    cardTitle: titulo && !isEmptyValue(titulo.valor) ? `${titulo.etiqueta}: ${String(titulo.valor)}` : '',
    rows,
    empty: todos.every((dato) => isEmptyValue(dato.valor)),
    emptyState: config.emptyState,
  };
}

/**
 * Bloque `accordion` de la vista paramétrica ("Contenedor acordeones" del handoff): pide las
 * fuentes declaradas en `dataSource` (forma de `GET /Conciliaciones/fuentes-detalle`) y pinta un
 * acordeón por fuente, con sus datos. En pantallas anchas los reparte en columnas.
 */
@Component({
  selector: 'app-view-accordion',
  imports: [EmptyState, ErrorState, FieldList, HlmAccordionImports, HlmSkeleton, SectionTitle],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <section class="flex flex-col gap-6" [attr.aria-labelledby]="titleId">
      <p class="sr-only" role="status">{{ fuentes.isLoading() ? 'Cargando la información…' : '' }}</p>

      @if (fuentes.error()) {
        <app-error-state title="No pudimos cargar esta información." (retry)="fuentes.reload()" />
      } @else if (fuentes.hasValue()) {
        @if (title(); as title) {
          <h2 appSectionTitle [id]="titleId">{{ title }}</h2>
        } @else {
          <!-- Sin título en la plantilla: los acordeones (h3) siguen colgando de un h2 (axe: heading-order). -->
          <h2 class="sr-only" [id]="titleId">{{ fallbackTitle }}</h2>
        }
        @if (items().length === 0) {
          <app-empty-state title="No hay información de los aplicativos para esta diferencia." />
        } @else {
          <div class="rounded-card bg-card p-4 shadow-capa-1">
            <!-- Un solo acordeón para todas las columnas: las flechas del teclado las recorren seguidas. -->
            <div hlmAccordion [type]="type()" class="md:flex-row md:gap-x-[4.125rem]">
              @for (column of layoutColumns(); track $index) {
                <div class="flex min-w-0 flex-1 flex-col gap-8">
                  @for (item of column; track item.key) {
                    <div hlmAccordionItem [isOpened]="item.defaultOpen">
                      <hlm-accordion-trigger>{{ item.title }}</hlm-accordion-trigger>
                      <hlm-accordion-content>
                        <app-field-list
                          [title]="item.cardTitle"
                          [rows]="item.rows"
                          [empty]="item.empty"
                          [emptyState]="item.emptyState"
                        />
                      </hlm-accordion-content>
                    </div>
                  }
                </div>
              }
            </div>
          </div>
        }
      } @else {
        <div class="flex flex-col gap-6" aria-hidden="true">
          @if (block().title) {
            <hlm-skeleton class="h-4 w-48 bg-foreground/10" />
          }
          <div class="rounded-card bg-card p-4 shadow-capa-1">
            <div class="flex flex-col gap-8 md:flex-row md:gap-x-[4.125rem]">
              @for (column of skeletonColumns(); track $index) {
                <div class="flex flex-1 flex-col gap-8">
                  @for (item of column; track item) {
                    <div class="flex h-8 items-start border-b border-gris-rafaga">
                      <hlm-skeleton class="h-5 w-56 max-w-full bg-foreground/10" />
                    </div>
                  }
                </div>
              }
            </div>
          </div>
        </div>
      }
    </section>
  `,
})
export class ViewAccordion {
  private readonly vistas = inject(VistasService);

  /** Bloque de la plantilla. */
  readonly block = input.required<AccordionBlock>();
  /** Parámetros de la ruta del front para resolver `dataSource.path` y `dataSource.query`. */
  readonly params = input.required<Readonly<Record<string, string>>>();

  protected readonly titleId = `app-view-accordion-title-${nextId++}`;
  protected readonly fallbackTitle = 'Información por aplicativo';

  /** La fuente es fija (`fuentes-detalle`); el `dataSource` de la plantilla se ignora. */
  protected readonly fuentes = rxResource({
    params: () => ({
      path: resolveApiPath(FUENTES.fuentesDetalle.path, this.params()),
      query: resolveQuery(FUENTES.fuentesDetalle.query, this.params()),
    }),
    stream: ({ params }) => this.vistas.getFuentes(params.path, params.query),
  });

  /** Los acordeones de la plantilla o, si no los trae, uno por fuente en el orden en que llegan. */
  protected readonly items = computed<AccordionItem[]>(() => {
    const config = this.block().accordion;
    const fuentes = (resourceValue(this.fuentes)?.data ?? []).filter(
      (fuente): fuente is FuenteDetalle => !!fuente,
    );
    if (config.items?.length) {
      // Unión por `id`: el orden de la respuesta no importa y una fuente que no llega queda vacía.
      const porId = new Map(
        fuentes.filter((fuente) => !!fuente.id).map((fuente) => [normalize(fuente.id!), fuente]),
      );
      return config.items.map((item, index) => fromTemplate(item, index, porId, config));
    }
    return fuentes.map((fuente, index) => fromData(fuente, index, config));
  });

  /** El título admite `{campo}` de la respuesta (p. ej. el nombre del cliente, si el back lo envía). */
  protected readonly title = computed(() => {
    const title = this.block().title;
    const respuesta = resourceValue(this.fuentes);
    return title && respuesta ? interpolateRow(title, respuesta).trim() : '';
  });

  protected readonly type = computed(() => this.block().accordion.type ?? 'multiple');

  private readonly columnCount = computed(() => this.block().accordion.layoutColumns ?? 1);
  private readonly skeletonCount = computed(() => this.block().accordion.items?.length || SKELETON_ITEMS);

  /** Reparte los acordeones en orden: la primera mitad a la izquierda y el resto a la derecha. */
  protected readonly layoutColumns = computed(() => split(this.items(), this.columnCount()));

  protected readonly skeletonColumns = computed(() =>
    split(
      Array.from({ length: this.skeletonCount() }, (_, index) => index),
      this.columnCount(),
    ),
  );
}

function split<T>(items: readonly T[], columns: number): T[][] {
  const count = Math.max(1, Math.min(columns, items.length));
  const perColumn = Math.ceil(items.length / count);
  return Array.from({ length: count }, (_, index) => items.slice(index * perColumn, (index + 1) * perColumn));
}
