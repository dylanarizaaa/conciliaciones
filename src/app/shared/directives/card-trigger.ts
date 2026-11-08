import { Directive } from '@angular/core';

/**
 * Convierte un enlace o botón dentro de una `hlmCard` en el área clicable de toda la tarjeta
 * (patrón "stretched link"): el elemento conserva su texto como nombre accesible y su
 * pseudo-elemento cubre la tarjeta completa. `hlmCard` refleja el hover y el foco a través de
 * `[data-slot=card-trigger]`.
 */
@Directive({
  selector: 'a[appCardTrigger], button[appCardTrigger]',
  host: {
    'data-slot': 'card-trigger',
    class:
      "cursor-pointer text-start outline-none after:absolute after:inset-0 after:z-10 after:content-['']",
  },
})
export class CardTrigger {}
