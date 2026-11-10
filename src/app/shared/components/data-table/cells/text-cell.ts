import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { Emphasis } from '../../../../core/data-access/vista.model';
import { EMPHASIS_CLASS, toText } from './cell-styles';
import { EmptyValue } from './empty-value';

/** `TextCell` del catálogo: texto con énfasis opcional y una segunda línea en gris. */
@Component({
  selector: 'app-text-cell',
  imports: [EmptyValue],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex min-w-0 flex-col' },
  template: `
    @if (text(); as text) {
      <span [class]="textClass()" [attr.title]="truncate() ? text : null">{{ text }}</span>
    } @else {
      <app-empty-value />
    }
    @if (secondaryText(); as secondary) {
      <span [class]="overflowClass() + ' text-xs'" [attr.title]="truncate() ? secondary : null">{{ secondary }}</span>
    }
  `,
})
export class TextCell {
  /** Valor de la celda (lo entrega la fábrica de columnas). */
  readonly value = input<unknown>(null);
  readonly emphasis = input<Emphasis>('default');
  /** Valor de `secondaryAccessorKey` en la fila. */
  readonly secondary = input<unknown>(null);
  /** Muestra el texto completo como título cuando se corta. */
  readonly truncate = input<boolean>(false);
  /** El texto largo baja de línea en lugar de cortarse (listas de campos; no en tablas). */
  readonly wrap = input<boolean>(false);

  protected readonly text = computed(() => toText(this.value()));
  protected readonly secondaryText = computed(() => toText(this.secondary()));
  protected readonly overflowClass = computed(() => (this.wrap() ? 'break-words' : 'truncate'));
  protected readonly textClass = computed(
    () => `${this.overflowClass()} ${EMPHASIS_CLASS[this.emphasis()] ?? ''}`,
  );
}
