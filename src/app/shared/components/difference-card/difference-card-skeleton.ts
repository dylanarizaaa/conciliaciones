import { ChangeDetectionStrategy, Component } from '@angular/core';
import { HlmCard, HlmCardAction, HlmCardContent, HlmCardHeader } from '@spartan-ng/helm/card';
import { HlmSeparator } from '@spartan-ng/helm/separator';
import { HlmSkeleton } from '@spartan-ng/helm/skeleton';

/** Placeholder de carga con la misma geometría que `app-difference-card` (decorativo). */
@Component({
  selector: 'app-difference-card-skeleton',
  imports: [HlmCardAction, HlmCardContent, HlmCardHeader, HlmSeparator, HlmSkeleton],
  hostDirectives: [HlmCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true' },
  template: `
    <div hlmCardHeader>
      <hlm-skeleton class="h-5 w-32 bg-foreground/10" />
      <hlm-skeleton hlmCardAction class="size-6 rounded-full bg-foreground/10" />
    </div>

    <div hlmCardContent>
      <div class="flex gap-4">
        <div class="flex flex-col gap-2">
          <hlm-skeleton class="h-[2.125rem] w-12 bg-foreground/10" />
          <hlm-skeleton class="h-4 w-10 bg-foreground/10" />
        </div>
        <hlm-separator orientation="vertical" />
        <div class="flex flex-1 flex-col gap-2">
          <hlm-skeleton class="h-[2.125rem] w-44 max-w-full bg-foreground/10" />
          <hlm-skeleton class="h-4 w-24 bg-foreground/10" />
        </div>
      </div>
    </div>
  `,
})
export class DifferenceCardSkeleton {}
