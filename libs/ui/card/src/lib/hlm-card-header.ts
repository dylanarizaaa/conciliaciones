import { Directive } from '@angular/core';
import { classes } from '@spartan-ng/helm/utils';

@Directive({
  selector: '[hlmCardHeader],hlm-card-header',
  exportAs: 'hlmCardHeader',
  host: { 'data-slot': 'card-header' },
})
export class HlmCardHeader {
  constructor() {
    classes(
      () =>
        'gap-x-2 gap-y-1 rounded-t-card px-(--card-spacing) [.border-b]:pb-(--card-spacing) group/card-header grid auto-rows-min items-center has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto]',
    );
  }
}
