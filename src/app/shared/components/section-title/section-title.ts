import { Directive } from '@angular/core';

/**
 * "Subtitulo" del sistema de diseño: título de sección (Negro digital, SemiBold 16/16).
 * Se aplica sobre el encabezado que corresponda a la jerarquía (`h2`, `h3`, ...).
 */
@Directive({
  selector: '[appSectionTitle]',
  host: { class: 'flex items-center gap-2 text-base leading-4 font-semibold text-foreground' },
})
export class SectionTitle {}
