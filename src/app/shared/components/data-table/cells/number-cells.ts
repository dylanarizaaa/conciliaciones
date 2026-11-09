import { ChangeDetectionStrategy, Component, computed, Directive, input } from '@angular/core';
import type { Emphasis } from '../../../../core/data-access/vista.model';
import { formatMoney, formatNumber, formatPercent } from '../../../../core/format/formatters';
import { EMPHASIS_CLASS, toFiniteNumber } from './cell-styles';
import { EmptyValue } from './empty-value';

const NUMBER_TEMPLATE = `
  @if (formatted(); as formatted) {
    <span class="tabular-nums" [class]="emphasisClass()">{{ formatted }}</span>
  } @else {
    <app-empty-value />
  }
`;

/** Base común: valor numérico, decimales y énfasis. */
@Directive()
abstract class NumericCell {
  readonly value = input<unknown>(null);
  readonly emphasis = input<Emphasis>('default');
  readonly minimumFractionDigits = input<number | undefined>(undefined);
  readonly maximumFractionDigits = input<number | undefined>(undefined);

  protected readonly emphasisClass = computed(() => EMPHASIS_CLASS[this.emphasis()] ?? '');
  protected readonly formatted = computed(() => {
    const value = toFiniteNumber(this.value());
    return value === null ? null : this.format(value);
  });

  protected abstract format(value: number): string;

  protected get fractionOptions() {
    return {
      minimumFractionDigits: this.minimumFractionDigits(),
      maximumFractionDigits: this.maximumFractionDigits(),
    };
  }
}

/** `NumberCell` del catálogo: 1250.5 → "1.250,5". */
@Component({
  selector: 'app-number-cell',
  imports: [EmptyValue],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: NUMBER_TEMPLATE,
})
export class NumberCell extends NumericCell {
  protected format(value: number): string {
    return formatNumber(value, this.fractionOptions);
  }
}

/** `CurrencyCell` del catálogo: 900000 → "$ 900.000". */
@Component({
  selector: 'app-currency-cell',
  imports: [EmptyValue],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: NUMBER_TEMPLATE,
})
export class CurrencyCell extends NumericCell {
  /** ISO 4217 (ya resuelto con `currencyField` si la plantilla lo define). */
  readonly currency = input<string>('COP');
  readonly signDisplay = input<'auto' | 'always' | 'exceptZero' | 'never'>('auto');

  protected format(value: number): string {
    try {
      return formatMoney(value, {
        ...this.fractionOptions,
        currency: this.currency(),
        signDisplay: this.signDisplay(),
      });
    } catch {
      // Código de moneda inválido: se muestra el número sin símbolo.
      return formatNumber(value, this.fractionOptions);
    }
  }
}

/** `PercentCell` del catálogo: 0.256 → "25,6%". */
@Component({
  selector: 'app-percent-cell',
  imports: [EmptyValue],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: NUMBER_TEMPLATE,
})
export class PercentCell extends NumericCell {
  protected format(value: number): string {
    return formatPercent(value, this.fractionOptions);
  }
}
