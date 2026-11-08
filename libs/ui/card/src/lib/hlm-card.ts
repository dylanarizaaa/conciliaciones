import type { BooleanInput } from '@angular/cdk/coercion';
import { booleanAttribute, Directive, input } from '@angular/core';
import { classes } from '@spartan-ng/helm/utils';
import { HlmCardConfig, injectHlmCardConfig } from './hlm-card.token';

/**
 * Tarjeta base del sistema de diseño ("Cards de estado").
 *
 * - Default: fondo "Blanco digital" + "Shadow 1° Capa".
 * - Hover: fondo "Gris inicial" (solo si contiene un elemento con `data-slot="card-trigger"`).
 * - Select: borde "Acento" (input `selected`).
 */
@Directive({
  selector: '[hlmCard],hlm-card',
  exportAs: 'hlmCard',
  host: {
    'data-slot': 'card',
    '[attr.data-size]': 'size()',
    '[attr.data-selected]': 'selected() ? "true" : null',
  },
})
export class HlmCard {
  private readonly _defaultConfig = injectHlmCardConfig();
  public readonly size = input<HlmCardConfig['size']>(this._defaultConfig.size);
  /** Estado "Select" del diseño: resalta la tarjeta con el color de acento. */
  public readonly selected = input<boolean, BooleanInput>(false, { transform: booleanAttribute });

  constructor() {
    classes(
      () =>
        'group/card relative flex flex-col gap-(--card-gap) overflow-hidden rounded-card bg-card py-(--card-spacing) text-sm text-card-foreground shadow-capa-1 transition-colors [--card-gap:--spacing(6)] [--card-spacing:--spacing(4)] data-[size=sm]:[--card-gap:--spacing(4)] data-[size=sm]:[--card-spacing:--spacing(3)] has-data-[slot=card-footer]:pb-0 data-[size=sm]:has-data-[slot=card-footer]:pb-0 has-[>img:first-child]:pt-0 *:[img:first-child]:rounded-t-card *:[img:last-child]:rounded-b-card has-data-[slot=card-trigger]:hover:bg-gris-inicial has-[[data-slot=card-trigger]:focus-visible]:outline-2 has-[[data-slot=card-trigger]:focus-visible]:outline-offset-2 has-[[data-slot=card-trigger]:focus-visible]:outline-ring data-selected:ring-1 data-selected:ring-acento data-selected:ring-inset',
    );
  }
}
