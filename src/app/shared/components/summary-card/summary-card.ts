import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideClock } from '@ng-icons/lucide';
import { HlmSeparator } from '@spartan-ng/helm/separator';
import {
  formatCurrency,
  formatInteger,
  formatLongDate,
  formatTime,
} from '../../../core/format/formatters';

/** Cifra del resumen (p. ej. "50 · Casos totales"). */
export interface SummaryMetric {
  readonly value: string;
  readonly label: string;
}

/** Métricas estándar de un resumen de diferencias: casos totales y monto afectado. */
export function totalsToSummaryMetrics(totals: {
  readonly casosTotales: number;
  readonly totalAfectado: number;
}): readonly SummaryMetric[] {
  return [
    { value: formatInteger(totals.casosTotales), label: 'Casos totales' },
    { value: formatCurrency(totals.totalAfectado), label: 'Monto afectado' },
  ];
}

/**
 * "Card actualización" del sistema de diseño: totales de la vista y, si se conoce,
 * la fecha y hora de la última actualización. Cada bloque se separa con `hlm-separator`.
 */
@Component({
  selector: 'app-summary-card',
  imports: [NgIcon, HlmSeparator],
  providers: [provideIcons({ lucideClock })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class:
      'flex w-fit max-w-full flex-wrap items-center gap-x-6 gap-y-4 rounded-card bg-gris-inicial p-4 md:min-h-20 md:flex-nowrap md:gap-x-10',
  },
  template: `
    @for (metric of metrics(); track metric.label) {
      @if (!$first) {
        <hlm-separator orientation="vertical" class="data-vertical:h-12 data-vertical:self-center" />
      }
      <p class="flex flex-col gap-2">
        <span class="text-2xl leading-5 font-semibold whitespace-nowrap text-foreground tabular-nums">
          {{ metric.value }}
        </span>
        <span class="text-xs leading-4 font-bold text-muted-foreground">{{ metric.label }}</span>
      </p>
    }

    @if (lastUpdate(); as lastUpdate) {
      <hlm-separator orientation="vertical" class="hidden data-vertical:h-12 data-vertical:self-center md:block" />
      <p class="flex w-full items-start gap-2 md:w-auto md:min-w-[12.3125rem]">
        <ng-icon name="lucideClock" size="1.5rem" class="shrink-0 text-gris-medio" aria-hidden="true" />
        <time [attr.datetime]="isoDate()" class="flex flex-col text-foreground">
          <span class="text-base leading-[1.375rem] font-semibold">{{ date() }}</span>
          <span class="text-sm leading-[1.375rem]">Última actualización {{ time() }}</span>
        </time>
      </p>
    }
  `,
})
export class SummaryCard {
  /** Totales a mostrar en orden. */
  readonly metrics = input<readonly SummaryMetric[]>([]);
  /** Fecha de la última actualización; si es `null` el bloque de fecha no se muestra. */
  readonly lastUpdate = input<Date | null>(null);

  protected readonly date = computed(() => {
    const value = this.lastUpdate();
    return value ? formatLongDate(value) : '';
  });
  protected readonly time = computed(() => {
    const value = this.lastUpdate();
    return value ? formatTime(value) : '';
  });
  protected readonly isoDate = computed(() => this.lastUpdate()?.toISOString() ?? null);
}
