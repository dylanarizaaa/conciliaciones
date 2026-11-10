import { ChangeDetectionStrategy, Component } from '@angular/core';
import { BrnAccordionContent } from '@spartan-ng/brain/accordion';
import { classes } from '@spartan-ng/helm/utils';

@Component({
  selector: 'hlm-accordion-content',
  exportAs: 'hlmAccordionContent',
  changeDetection: ChangeDetectionStrategy.OnPush,
  hostDirectives: [{ directive: BrnAccordionContent, inputs: ['style'] }],
  host: {
    'data-slot': 'accordion-content',
  },
  template: `
    <div
      class="pt-6 [&_a]:hover:text-foreground [&_a]:underline [&_a]:underline-offset-3"
    >
      <ng-content />
    </div>
  `,
})
export class HlmAccordionContent {
  constructor() {
    classes(
      () =>
        'text-sm transition-all motion-reduce:transition-none data-[state=closed]:h-0 data-[state=open]:h-(--brn-accordion-content-height)',
    );
  }
}
