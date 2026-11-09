import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { formatDateTime } from '../../../../core/format/formatters';
import { toText } from './cell-styles';
import { EmptyValue } from './empty-value';

/** `DateCell` del catálogo: "2026-04-19T17:00:00-05:00" → "19/04/26 5:00 p.m.". */
@Component({
  selector: 'app-date-cell',
  imports: [EmptyValue],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (date(); as date) {
      <time class="tabular-nums" [attr.datetime]="date.toISOString()">{{ text() }}</time>
    } @else if (raw(); as raw) {
      <!-- Fecha que no se pudo interpretar: se muestra tal como llegó. -->
      <span>{{ raw }}</span>
    } @else {
      <app-empty-value />
    }
  `,
})
export class DateCell {
  /** Fecha ISO 8601 (con zona si trae hora). */
  readonly value = input<unknown>(null);
  readonly dateStyle = input<'short' | 'medium' | 'long' | undefined>(undefined);
  readonly timeStyle = input<'short' | 'medium' | undefined>(undefined);
  /** Zona IANA del negocio; si falta, la del navegador. */
  readonly timeZone = input<string | undefined>(undefined);

  protected readonly raw = computed(() => toText(this.value()));
  protected readonly date = computed(() => {
    const value = this.value();
    if (value === null || value === undefined || value === '') {
      return null;
    }
    const date = value instanceof Date ? value : new Date(value as string | number);
    return Number.isNaN(date.getTime()) ? null : date;
  });
  protected readonly text = computed(() => {
    const date = this.date();
    return date
      ? formatDateTime(date, {
          dateStyle: this.dateStyle(),
          timeStyle: this.timeStyle(),
          timeZone: this.timeZone(),
        })
      : '';
  });
}
