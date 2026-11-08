import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Celda de acción que navega con el router ("Casilla Info · Btn Acción"). Se usa así:
 *
 * ```ts
 * cell: ({ row }) =>
 *   flexRenderComponent(LinkCell, {
 *     inputs: { label: 'Gestionar', link: ['reglas', row.original.id], context: row.original.nombre },
 *   })
 * ```
 *
 * Los enlaces relativos se resuelven desde la ruta de la página que contiene la tabla.
 */
@Component({
  selector: 'app-link-cell',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a
      [routerLink]="link()"
      class="rounded-sm font-semibold text-acento underline-offset-2 outline-none hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      {{ label() }}
      @if (context(); as context) {
        <span class="sr-only">{{ context }}</span>
      }
    </a>
  `,
})
export class LinkCell {
  /** Texto visible del enlace (p. ej. "Gestionar"). */
  readonly label = input.required<string>();
  /** Destino del enlace. */
  readonly link = input.required<RouterLink['routerLink']>();
  /** Texto solo para lectores de pantalla que diferencia enlaces repetidos (p. ej. el nombre de la fila). */
  readonly context = input<string>('');
}
