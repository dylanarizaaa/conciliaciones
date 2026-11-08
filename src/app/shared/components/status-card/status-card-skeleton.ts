import { ChangeDetectionStrategy, Component } from '@angular/core';
import { HlmCard, HlmCardAction, HlmCardContent, HlmCardHeader } from '@spartan-ng/helm/card';
import { HlmSeparator } from '@spartan-ng/helm/separator';
import { HlmSkeleton } from '@spartan-ng/helm/skeleton';

/**
 * Placeholder de carga con la misma geometría que `app-status-card`.
 * Es decorativo (`aria-hidden`): la carga se anuncia con una región `role="status"` en la página.
 */
@Component({
  selector: 'app-status-card-skeleton',
  imports: [HlmCardAction, HlmCardContent, HlmCardHeader, HlmSeparator, HlmSkeleton],
  hostDirectives: [HlmCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true' },
  template: `
    <div hlmCardHeader>
      <hlm-skeleton class="h-[1.375rem] w-28 bg-foreground/10" />
      <hlm-skeleton hlmCardAction class="size-8 rounded-full bg-foreground/10" />
    </div>

    <div hlmCardContent>
      <div class="flex gap-4 rounded-xl bg-gris-inicial p-4">
        <div class="flex flex-1 flex-col gap-1">
          <hlm-skeleton class="h-6 w-10 bg-foreground/10" />
          <hlm-skeleton class="h-5 w-14 bg-foreground/10" />
        </div>
        <hlm-separator orientation="vertical" />
        <div class="flex flex-1 flex-col gap-1">
          <hlm-skeleton class="h-6 w-28 bg-foreground/10" />
          <hlm-skeleton class="h-5 w-24 bg-foreground/10" />
        </div>
      </div>
    </div>
  `,
})
export class StatusCardSkeleton {}
