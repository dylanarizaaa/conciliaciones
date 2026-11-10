import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  contentChild,
  Directive,
  inject,
  input,
  linkedSignal,
  TemplateRef,
} from '@angular/core';
import { HlmTabsImports } from '@spartan-ng/helm/tabs';
import type { TabDefinition, TabsBlock } from '../../../core/data-access/vista.model';

/** Contexto de la plantilla de cada pestaña. */
export interface ViewTabPanelContext {
  /** Pestaña cuyo contenido se pinta. */
  readonly $implicit: TabDefinition;
  /** Id del botón de la pestaña: sirve para nombrar su contenido (`aria-labelledby`). */
  readonly labelledBy: string;
}

/**
 * Plantilla del contenido de una pestaña de `app-view-tabs`:
 *
 * ```html
 * <app-view-tabs [block]="block">
 *   <ng-template appViewTabPanel let-tab let-labelledBy="labelledBy">…</ng-template>
 * </app-view-tabs>
 * ```
 */
@Directive({ selector: 'ng-template[appViewTabPanel]' })
export class ViewTabPanel {
  readonly template = inject<TemplateRef<ViewTabPanelContext>>(TemplateRef);

  static ngTemplateContextGuard(_: ViewTabPanel, context: unknown): context is ViewTabPanelContext {
    return true;
  }
}

/**
 * Bloque `tabs` de la vista paramétrica ("Pestañas" del handoff). El contenido de cada pestaña se
 * crea la primera vez que se abre, así sus datos no se piden antes.
 */
@Component({
  selector: 'app-view-tabs',
  imports: [HlmTabsImports, NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <div hlmTabs [tab]="active()" (tabActivated)="active.set($event)">
      <div hlmTabsList>
        @for (tab of block().tabs; track tab.id) {
          <button [hlmTabsTrigger]="key(tab)" [disabled]="tab.disabled ?? false">
            <!-- Reserva el ancho del texto en SemiBold (hover / seleccionada) para que la fila no salte. -->
            <span
              class="inline-flex flex-col items-center after:invisible after:h-0 after:overflow-hidden after:font-semibold after:content-[attr(data-label)]"
              [attr.data-label]="tab.label"
            >
              {{ tab.label }}
            </span>
          </button>
        }
      </div>
      @for (tab of block().tabs; track tab.id) {
        <div [hlmTabsContent]="key(tab)">
          <ng-template hlmTabsContentLazy>
            <ng-container
              *ngTemplateOutlet="panel().template; context: { $implicit: tab, labelledBy: labelId(tab) }"
            />
          </ng-template>
        </div>
      }
    </div>
  `,
})
export class ViewTabs {
  /** Bloque de la plantilla. */
  readonly block = input.required<TabsBlock>();

  protected readonly panel = contentChild.required(ViewTabPanel);

  /** Pestaña abierta: `defaultTab` o la primera habilitada. Se reinicia si cambia el bloque. */
  protected readonly active = linkedSignal(() => {
    const { tabs, defaultTab } = this.block();
    const enabled = tabs.filter((tab) => !tab.disabled);
    const initial = enabled.find((tab) => tab.id === defaultTab) ?? enabled[0] ?? tabs[0];
    return initial ? this.key(initial) : '';
  });

  /** Clave única en la página: `brain/tabs` deriva de ella los ids de pestaña y panel. */
  protected key(tab: TabDefinition): string {
    return `${this.block().id}-${tab.id}`;
  }

  protected labelId(tab: TabDefinition): string {
    return `brn-tabs-label-${this.key(tab)}`;
  }
}
