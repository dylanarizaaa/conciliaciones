import type { BooleanInput } from '@angular/cdk/coercion';
import { booleanAttribute, ChangeDetectionStrategy, Component, input, output } from '@angular/core';
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

export type DifferenceCardHeadingLevel = 2 | 3 | 4 | 5 | 6;

let nextId = 0;

/**
 * "Card inicio" del sistema de diseño: diferencias de una categoría (casos y monto afectado).
 *
 * - Default / Hover: toda la tarjeta navega a `link` (o emite `cardClick` si no hay `link`).
 * - Inactivo (`inactive`): sin interacción y con cifras en gris, p. ej. cuando no hay casos.
 * - Si `amount` es `null` solo se muestran los casos (categorías sin valores monetarios).
 */
@Component({
  selector: 'app-difference-card',
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
  hostDirectives: [HlmCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[attr.data-inactive]': 'inactive() ? "true" : null' },
  template: `
    <div hlmCardHeader>
      <div
        hlmCardTitle
        role="heading"
        [attr.aria-level]="headingLevel()"
        class="min-w-0 leading-5 wrap-break-word text-muted-foreground"
      >
        @if (inactive()) {
          {{ title() }}
        } @else if (link(); as link) {
          <a appCardTrigger [routerLink]="link" [attr.aria-describedby]="figuresId">{{ title() }}</a>
        } @else {
          <button appCardTrigger type="button" [attr.aria-describedby]="figuresId" (click)="cardClick.emit()">
            {{ title() }}
          </button>
        }
      </div>
      <span
        hlmCardAction
        aria-hidden="true"
        class="flex size-6 items-center justify-center"
        [class]="inactive() ? 'text-gris-medio' : 'text-acento'"
      >
        <ng-icon name="lucideChevronRight" size="1.5rem" />
      </span>
    </div>

    <div hlmCardContent>
      <div [id]="figuresId" class="flex gap-4">
        <p class="flex max-w-28 shrink-0 flex-col gap-2">
          <span
            class="text-[2rem] leading-[2.125rem] font-semibold wrap-anywhere tabular-nums"
            [class]="inactive() ? 'text-gris-medio' : 'text-gris-oscuro'"
          >
            {{ count() }}
          </span>
          <span class="text-xs leading-4 text-muted-foreground">{{ countLabel() }}</span>
        </p>
        @if (amount(); as amount) {
          <hlm-separator orientation="vertical" />
          <p class="flex min-w-0 flex-1 flex-col gap-2">
            <span
              class="text-[2rem] leading-[2.125rem] font-semibold wrap-anywhere tabular-nums"
              [class]="inactive() ? 'text-gris-medio' : 'text-foreground'"
            >
              {{ amount }}
            </span>
            <span class="text-xs leading-4 text-muted-foreground">{{ amountLabel() }}</span>
          </p>
        }
      </div>
    </div>
  `,
})
export class DifferenceCard {
  protected readonly figuresId = `app-difference-card-figures-${nextId++}`;

  /** Nombre de la categoría. */
  readonly title = input.required<string>();
  /** Cantidad de casos, ya formateada. */
  readonly count = input.required<string>();
  readonly countLabel = input<string>('Casos');
  /** Monto afectado ya formateado; `null` lo oculta junto con su separador. */
  readonly amount = input<string | null>(null);
  readonly amountLabel = input<string>('Monto afectado');
  /** Ruta destino. Si se omite, la tarjeta actúa como botón y emite `cardClick`. */
  readonly link = input<RouterLink['routerLink'] | null>(null);
  /** Estado "inactivo": la tarjeta no es interactiva. */
  readonly inactive = input<boolean, BooleanInput>(false, { transform: booleanAttribute });
  /** Nivel de encabezado del título dentro de la jerarquía de la página. */
  readonly headingLevel = input<DifferenceCardHeadingLevel>(3);

  /** Se emite al activar la tarjeta cuando no tiene `link`. */
  readonly cardClick = output<void>();
}
