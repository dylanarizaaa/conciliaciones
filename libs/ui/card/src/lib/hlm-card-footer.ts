import { Directive } from '@angular/core';
import { classes } from '@spartan-ng/helm/utils';

@Directive({
  selector: '[hlmCardFooter],hlm-card-footer',
  exportAs: 'hlmCardFooter',
  host: { 'data-slot': 'card-footer' },
})
export class HlmCardFooter {
  constructor() {
    classes(() => 'bg-muted rounded-b-card border-t p-(--card-spacing) flex items-center');
  }
}
