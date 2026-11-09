import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCircleCheck, lucideX } from '@ng-icons/lucide';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';

/** Dato del modal ("Validado por: Alexander Tipacoque"). */
export interface ResultDialogItem {
  readonly label: string;
  readonly value: string;
}

/**
 * "Modal Solicitud recibida" del sistema de diseño, sobre el dialog de spartan.ng: confirma el
 * resultado de una acción (p. ej. "Conciliación procesada") con su descripción y datos.
 *
 * El dialog atrapa el foco, se cierra con Escape, con la X o con el botón principal, y al
 * cerrarse devuelve el foco a `restoreFocus` (un selector o, por defecto, a quien lo abrió).
 */
@Component({
  selector: 'app-result-dialog',
  imports: [HlmDialogImports, HlmButton, NgIcon],
  providers: [provideIcons({ lucideCircleCheck, lucideX })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Al abrir, el foco va al botón principal: Enter cierra y vuelve a la lista. -->
    <hlm-dialog
      [state]="open() ? 'open' : 'closed'"
      [restoreFocus]="restoreFocus()"
      autoFocus="[data-dialog-primary]"
      (closed)="closed.emit()"
    >
      <hlm-dialog-content
        *hlmDialogPortal="let ctx"
        [showCloseButton]="false"
        class="flex w-[calc(100vw-2rem)] flex-col items-center gap-8 rounded-card bg-card px-8 pt-12 pb-8 text-center ring-0 shadow-capa-1 sm:max-w-[41rem]"
      >
        <button
          hlmBtn
          hlmDialogClose
          variant="ghost"
          size="icon-sm"
          type="button"
          class="absolute end-5 top-5 [&_ng-icon]:text-[length:--spacing(6)]"
          aria-label="Cerrar"
        >
          <ng-icon name="lucideX" aria-hidden="true" />
        </button>

        <ng-icon name="lucideCircleCheck" size="4rem" strokeWidth="2.5" class="text-exito" aria-hidden="true" />

        <div class="flex w-full flex-col gap-4">
          <h2 hlmDialogTitle class="text-xl leading-6">{{ title() }}</h2>
          <div class="flex flex-col gap-10">
            @if (description(); as description) {
              <p hlmDialogDescription class="text-base leading-6 text-muted-foreground">{{ description }}</p>
            }
            @if (items().length > 0) {
              <dl class="flex flex-col gap-1 text-xs leading-4 text-muted-foreground">
                @for (item of items(); track item.label) {
                  <div class="flex flex-wrap justify-center gap-1">
                    <dt>{{ item.label }}:</dt>
                    <dd class="font-semibold text-foreground">{{ item.value }}</dd>
                  </div>
                }
              </dl>
            }
          </div>
        </div>

        <button hlmBtn hlmDialogClose data-dialog-primary type="button">{{ closeLabel() }}</button>
      </hlm-dialog-content>
    </hlm-dialog>
  `,
})
export class ResultDialog {
  /** Abre o cierra el modal. */
  readonly open = input<boolean>(false);
  readonly title = input.required<string>();
  readonly description = input<string>('');
  readonly items = input<readonly ResultDialogItem[]>([]);
  /** Texto del botón principal, que cierra el modal. */
  readonly closeLabel = input<string>('Volver a la lista');
  /** Dónde queda el foco al cerrar: selector CSS, o `true` para volver a quien lo abrió. */
  readonly restoreFocus = input<string | boolean>(true);

  /** El usuario cerró el modal (botón, X, Escape o clic fuera). */
  readonly closed = output<void>();
}
