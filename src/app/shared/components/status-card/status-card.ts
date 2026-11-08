import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideChevronRight } from '@ng-icons/lucide';
import {
  HlmCard,
  HlmCardAction,
  HlmCardContent,
  HlmCardHeader,
  HlmCardTitle,
} from '@spartan-ng/helm/card';
import { HlmSeparator } from '@spartan-ng/helm/separator';
import { CardTrigger } from '../../directives/card-trigger';

/** Métrica mostrada dentro del contenedor de la tarjeta (p. ej. "50 · Casos"). */
export interface StatusCardMetric {
  readonly value: string;
  readonly label: string;
}

export type StatusCardHeadingLevel = 2 | 3 | 4 | 5 | 6;

let nextId = 0;

/**
 * "Cards de estado" del sistema de diseño.
 *
 * Toda la tarjeta es interactiva: si recibe `link` navega con el router; si no, se comporta
 * como un botón conmutador (`aria-pressed`) y emite `cardClick`. El estado "Select" se controla
 * con el input `selected` (expuesto desde `hlmCard`).
 */
@Component({
  selector: 'app-status-card',
  imports: [
    NgIcon,
    RouterLink,
    HlmCardAction,
    HlmCardContent,
    HlmCardHeader,
    HlmCardTitle,
    HlmSeparator,
    CardTrigger,
  ],
  providers: [provideIcons({ lucideChevronRight })],
  hostDirectives: [{ directive: HlmCard, inputs: ['selected', 'size'] }],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div hlmCardHeader>
      <div hlmCardTitle role="heading" [attr.aria-level]="headingLevel()" class="min-w-0 wrap-break-word">
        @if (link(); as link) {
          <a
            appCardTrigger
            [routerLink]="link"
            [attr.aria-current]="card.selected() ? 'true' : null"
            [attr.aria-describedby]="metricsId"
            >{{ title() }}</a
          >
        } @else {
          <button
            appCardTrigger
            type="button"
            [attr.aria-pressed]="card.selected()"
            [attr.aria-describedby]="metricsId"
            (click)="cardClick.emit()"
          >
            {{ title() }}
          </button>
        }
      </div>
      <span hlmCardAction aria-hidden="true" class="flex size-8 items-center justify-center rounded-full text-acento">
        <ng-icon name="lucideChevronRight" size="1.5rem" />
      </span>
    </div>

    <div hlmCardContent>
      <div
        [id]="metricsId"
        class="flex gap-4 rounded-xl bg-gris-inicial p-4 transition-colors group-hover/card:bg-gris-espacial"
      >
        @for (metric of metrics(); track metric.label) {
          @if (!$first) {
            <hlm-separator orientation="vertical" />
          }
          <p class="flex flex-1 flex-col gap-1">
            <span class="text-xl leading-6 font-semibold whitespace-nowrap text-foreground tabular-nums">
              {{ metric.value }}
            </span>
            <span class="text-sm leading-5 font-semibold whitespace-nowrap text-metric-label">{{ metric.label }}</span>
          </p>
        }
      </div>
    </div>
  `,
})
export class StatusCard {
  protected readonly card = inject(HlmCard);
  protected readonly metricsId = `app-status-card-metrics-${nextId++}`;

  /** Título de la tarjeta (nombre de la plataforma). */
  readonly title = input.required<string>();
  /** Métricas a mostrar; se separan automáticamente con `hlm-separator`. */
  readonly metrics = input<readonly StatusCardMetric[]>([]);
  /** Ruta destino. Si se omite, la tarjeta actúa como botón y emite `cardClick`. */
  readonly link = input<RouterLink['routerLink'] | null>(null);
  /** Nivel de encabezado del título dentro de la jerarquía de la página. */
  readonly headingLevel = input<StatusCardHeadingLevel>(3);

  /** Se emite al activar la tarjeta cuando no tiene `link`. */
  readonly cardClick = output<void>();
}
