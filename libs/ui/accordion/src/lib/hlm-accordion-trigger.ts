import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideChevronDown, lucideChevronUp } from '@ng-icons/lucide';
import { BrnAccordionImports } from '@spartan-ng/brain/accordion';
import { hlm } from '@spartan-ng/helm/utils';
import type { ClassValue } from 'clsx';

@Component({
  selector: 'hlm-accordion-trigger',
  exportAs: 'hlmAccordionTrigger',
  imports: [BrnAccordionImports, NgIcon],
  providers: [provideIcons({ lucideChevronDown, lucideChevronUp })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Fila de 32px con la línea Gris ráfaga debajo; la flecha va junto al título. -->
    <h3 brnAccordionHeader class="flex border-b border-gris-rafaga">
      <button brnAccordionTrigger data-slot="accordion-trigger" [class]="_computedTriggerClass()">
        <ng-content />
        <ng-icon
          name="lucideChevronDown"
          data-slot="accordion-trigger-icon"
          aria-hidden="true"
          class="pointer-events-none shrink-0 group-aria-expanded/accordion-trigger:hidden"
        />
        <ng-icon
          name="lucideChevronUp"
          data-slot="accordion-trigger-icon"
          aria-hidden="true"
          class="pointer-events-none shrink-0 group-aria-expanded/accordion-trigger:inline group-aria-[expanded=false]/accordion-trigger:hidden"
        />
      </button>
    </h3>
  `,
})
export class HlmAccordionTrigger {
  public readonly triggerClass = input<ClassValue>('');

  protected readonly _computedTriggerClass = computed(() =>
    hlm(
      'group/accordion-trigger relative flex min-h-[calc(--spacing(8)-1px)] flex-1 cursor-pointer items-center gap-2 rounded-sm text-start text-xl leading-6 font-semibold text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring **:data-[slot=accordion-trigger-icon]:text-[length:--spacing(6)] aria-disabled:pointer-events-none aria-disabled:opacity-50',
      this.triggerClass(),
    ),
  );
}
