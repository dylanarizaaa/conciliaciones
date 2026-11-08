import { Directive } from '@angular/core';

/**
 * Marca el contenedor de acciones (p. ej. "Resolver diferencias") del `app-page-header`.
 * Se alinea a la derecha de la descripción y baja de línea en pantallas angostas.
 */
@Directive({
  selector: '[appPageHeaderActions]',
  host: { class: 'ms-auto flex flex-wrap items-center gap-2' },
})
export class PageHeaderActions {}
