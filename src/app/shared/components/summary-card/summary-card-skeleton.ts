import { ChangeDetectionStrategy, Component } from '@angular/core';
import { HlmSeparator } from '@spartan-ng/helm/separator';
import { HlmSkeleton } from '@spartan-ng/helm/skeleton';

/** Placeholder de carga con la misma geometría que `app-summary-card` (decorativo). */
@Component({
  selector: 'app-summary-card-skeleton',
  imports: [HlmSeparator, HlmSkeleton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'aria-hidden': 'true',
    class:
      'flex w-fit max-w-full items-center gap-6 rounded-card bg-gris-inicial p-4 md:min-h-20 md:gap-10',
  },
  template: `
    <div class="flex flex-col gap-2">
      <hlm-skeleton class="h-5 w-10 bg-foreground/10" />
      <hlm-skeleton class="h-4 w-20 bg-foreground/10" />
    </div>
    <hlm-separator orientation="vertical" class="data-vertical:h-12 data-vertical:self-center" />
    <div class="flex flex-col gap-2">
      <hlm-skeleton class="h-5 w-36 bg-foreground/10" />
      <hlm-skeleton class="h-4 w-24 bg-foreground/10" />
    </div>
  `,
})
export class SummaryCardSkeleton {}
