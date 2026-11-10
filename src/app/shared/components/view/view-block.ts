import { ChangeDetectionStrategy, Component, computed, effect, input } from '@angular/core';
import type { ViewBlock } from '../../../core/data-access/vista.model';
import { ViewAccordion } from './view-accordion';
import { ViewTable } from './view-table';
import { ViewTabPanel, ViewTabs } from './view-tabs';

const KNOWN_TYPES: ReadonlySet<string> = new Set<ViewBlock['type']>(['accordion', 'tabs', 'table']);

/**
 * Pinta un bloque de la plantilla según su `type` (catálogo cerrado: `accordion`, `tabs`,
 * `table`). Las pestañas muestran otros bloques de la misma plantilla, por eso el componente se
 * usa a sí mismo. Un tipo desconocido no se pinta y se avisa en consola.
 */
@Component({
  selector: 'app-view-block',
  imports: [ViewAccordion, ViewTable, ViewTabs, ViewTabPanel],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    @if (accordion(); as block) {
      <app-view-accordion [block]="block" [params]="params()" />
    } @else if (table(); as block) {
      <app-view-table [block]="block" [params]="params()" [labelledBy]="labelledBy()" />
    } @else if (tabs(); as block) {
      <app-view-tabs [block]="block">
        <ng-template appViewTabPanel let-tab let-labelledBy="labelledBy">
          @if (children().get(tab.blockId); as child) {
            <app-view-block
              [block]="child"
              [blocks]="blocks()"
              [params]="params()"
              [labelledBy]="labelledBy"
              [ancestors]="trail()"
            />
          }
        </ng-template>
      </app-view-tabs>
    }
  `,
})
export class ViewBlockOutlet {
  /** Bloque a pintar. */
  readonly block = input.required<ViewBlock>();
  /** Todos los bloques de la plantilla, para resolver los `blockId` de las pestañas. */
  readonly blocks = input.required<readonly ViewBlock[]>();
  /** Parámetros de la ruta del front para resolver los `dataSource.path`. */
  readonly params = input.required<Readonly<Record<string, string>>>();
  /** Id de un elemento externo que ya nombra el bloque (p. ej. su pestaña). */
  readonly labelledBy = input<string>('');
  /** Ids de los bloques que contienen a este (evita referencias circulares). */
  readonly ancestors = input<readonly string[]>([]);

  protected readonly accordion = computed(() => {
    const block = this.block();
    return block.type === 'accordion' ? block : null;
  });
  protected readonly table = computed(() => {
    const block = this.block();
    return block.type === 'table' ? block : null;
  });
  protected readonly tabs = computed(() => {
    const block = this.block();
    return block.type === 'tabs' ? block : null;
  });

  protected readonly trail = computed(() => [...this.ancestors(), this.block().id]);

  /**
   * Bloque que pinta cada pestaña, por `blockId`. Se omite (con aviso en consola) el que no existe
   * en la plantilla o el que se contiene a sí mismo.
   */
  protected readonly children = computed(() => {
    const children = new Map<string, ViewBlock>();
    for (const { blockId } of this.tabs()?.tabs ?? []) {
      const child = this.blocks().find((block) => block.id === blockId);
      if (this.trail().includes(blockId)) {
        console.warn(`[vista paramétrica] El bloque "${blockId}" se referencia a sí mismo; no se pinta.`);
      } else if (!child) {
        console.warn(`[vista paramétrica] Una pestaña apunta al bloque "${blockId}", que no existe en la plantilla.`);
      } else {
        children.set(blockId, child);
      }
    }
    return children;
  });

  constructor() {
    effect(() => {
      const block = this.block() as { id: string; type: string };
      if (!KNOWN_TYPES.has(block.type)) {
        console.warn(`[vista paramétrica] Tipo de bloque desconocido "${block.type}" (${block.id}); no se pinta.`);
      }
    });
  }

}
