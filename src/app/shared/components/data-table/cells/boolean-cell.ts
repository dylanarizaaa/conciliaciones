import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { EmptyValue } from './empty-value';

/** `BooleanCell` del catálogo: `true` → "Sí", `false` → "No" (etiquetas configurables). */
@Component({
  selector: 'app-boolean-cell',
  imports: [EmptyValue],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (label(); as label) {
      <span>{{ label }}</span>
    } @else {
      <app-empty-value />
    }
  `,
})
export class BooleanCell {
  readonly value = input<unknown>(null);
  readonly trueLabel = input<string>('Sí');
  readonly falseLabel = input<string>('No');

  protected readonly label = computed(() => {
    const value = this.value();
    if (value === true || value === 'true') {
      return this.trueLabel();
    }
    if (value === false || value === 'false') {
      return this.falseLabel();
    }
    return null;
  });
}
