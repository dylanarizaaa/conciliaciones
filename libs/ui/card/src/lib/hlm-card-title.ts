import { Directive } from '@angular/core';
import { classes } from '@spartan-ng/helm/utils';

@Directive({
  selector: '[hlmCardTitle]',
  exportAs: 'hlmCardTitle',
  host: { 'data-slot': 'card-title' },
})
export class HlmCardTitle {
  constructor() {
    classes(
      () =>
        'text-lg leading-[1.375rem] font-bold text-card-foreground group-data-[size=sm]/card:text-base group-data-[size=sm]/card:leading-5',
    );
  }
}
