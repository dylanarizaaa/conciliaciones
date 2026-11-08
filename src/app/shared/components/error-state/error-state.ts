import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCircleAlert, lucideRefreshCw } from '@ng-icons/lucide';
import { HlmButton } from '@spartan-ng/helm/button';

/** Mensaje de error de carga con acción de reintento. Se anuncia como `role="alert"`. */
@Component({
  selector: 'app-error-state',
  imports: [NgIcon, HlmButton],
  providers: [provideIcons({ lucideCircleAlert, lucideRefreshCw })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: 'alert',
    class:
      'flex flex-col items-start gap-4 rounded-card bg-gris-inicial p-6 sm:flex-row sm:items-center',
  },
  template: `
    <ng-icon name="lucideCircleAlert" class="shrink-0 text-destructive" size="1.5rem" aria-hidden="true" />
    <div class="flex flex-1 flex-col gap-1">
      <p class="font-semibold text-foreground">{{ title() }}</p>
      <p class="text-sm text-muted-foreground">{{ description() }}</p>
    </div>
    <button hlmBtn variant="outline" size="sm" type="button" (click)="retry.emit()">
      <ng-icon name="lucideRefreshCw" data-icon="inline-start" aria-hidden="true" />
      {{ retryLabel() }}
    </button>
  `,
})
export class ErrorState {
  readonly title = input<string>('No pudimos cargar la información.');
  readonly description = input<string>('Verifica tu conexión e inténtalo de nuevo.');
  readonly retryLabel = input<string>('Reintentar');

  readonly retry = output<void>();
}
