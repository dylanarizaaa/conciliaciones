import { Directive } from '@angular/core';
import { BrnAccordionItem } from '@spartan-ng/brain/accordion';
import { classes } from '@spartan-ng/helm/utils';

@Directive({
  selector: '[hlmAccordionItem],hlm-accordion-item',
  exportAs: 'hlmAccordionItem',
  hostDirectives: [
    {
      directive: BrnAccordionItem,
      inputs: ['isOpened', 'disabled'],
      outputs: ['openedChange'],
    },
  ],
  host: {
    'data-slot': 'accordion-item',
  },
})
export class HlmAccordionItem {
  constructor() {
    // La línea divisoria va bajo el título (ver HlmAccordionTrigger), no bajo el contenido.
    classes(() => 'flex flex-col');
  }
}
