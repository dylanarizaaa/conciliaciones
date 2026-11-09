import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { BadgeVariant } from '../../../../core/data-access/vista.model';
import { TONE_CLASS, toText } from './cell-styles';
import { EmptyValue } from './empty-value';

/**
 * `BadgeCell` del catálogo ("Tabla estado"): traduce el valor de la fila a una etiqueta y un
 * tono. Un valor sin variante usa `fallback` o, si no hay, el propio valor en tono neutro.
 */
@Component({
  selector: 'app-badge-cell',
  imports: [EmptyValue],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (variant(); as variant) {
      <span
        class="inline-flex h-8 max-w-full min-w-40 items-center justify-center rounded-full px-4 text-sm"
        [class]="toneClass()"
      >
        <span class="truncate">{{ variant.label }}</span>
      </span>
    } @else {
      <app-empty-value />
    }
  `,
})
export class BadgeCell {
  readonly value = input<unknown>(null);
  /** Valor de la fila → etiqueta y tono. */
  readonly variants = input<Readonly<Record<string, BadgeVariant>>>({});
  readonly fallback = input<BadgeVariant | undefined>(undefined);

  protected readonly variant = computed<BadgeVariant | null>(() => {
    const text = toText(this.value());
    if (text === null) {
      return null;
    }
    return this.variants()[text] ?? this.fallback() ?? { label: text, tone: 'neutral' };
  });
  protected readonly toneClass = computed(() => {
    const variant = this.variant();
    return variant ? (TONE_CLASS[variant.tone] ?? TONE_CLASS.neutral) : '';
  });
}
