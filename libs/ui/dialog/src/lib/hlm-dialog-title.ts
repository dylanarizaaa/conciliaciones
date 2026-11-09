import { Directive } from '@angular/core';
import { BrnDialogTitle } from '@spartan-ng/brain/dialog';
import { classes } from '@spartan-ng/helm/utils';

@Directive({
  selector: '[hlmDialogTitle]',
  exportAs: 'hlmDialogTitle',
  hostDirectives: [BrnDialogTitle],
  host: { 'data-slot': 'dialog-title' },
})
export class HlmDialogTitle {
  constructor() {
    // Prospero no tiene peso 500: el título usa SemiBold.
    classes(() => 'text-base leading-none font-semibold text-foreground');
  }
}
