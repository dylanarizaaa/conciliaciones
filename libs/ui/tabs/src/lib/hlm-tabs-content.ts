import { Directive, input } from '@angular/core';
import { BrnTabsContent } from '@spartan-ng/brain/tabs';
import { classes } from '@spartan-ng/helm/utils';

@Directive({
  selector: '[hlmTabsContent]',
  exportAs: 'hlmTabsContent',
  hostDirectives: [{ directive: BrnTabsContent, inputs: ['brnTabsContent: hlmTabsContent'] }],
  host: {
    'data-slot': 'tabs-content',
  },
})
export class HlmTabsContent {
  public readonly contentFor = input.required<string>({ alias: 'hlmTabsContent' });

  constructor() {
    // El panel recibe foco con el teclado (tabindex 0): el contorno debe verse.
    classes(
      () =>
        'flex-1 rounded-lg text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
    );
  }
}
