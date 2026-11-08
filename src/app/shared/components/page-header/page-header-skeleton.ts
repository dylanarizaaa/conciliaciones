import type { BooleanInput } from '@angular/cdk/coercion';
import { booleanAttribute, ChangeDetectionStrategy, Component, input } from '@angular/core';
import { HlmSkeleton } from '@spartan-ng/helm/skeleton';

/** Placeholder de carga con la geometría de `app-page-header` (decorativo). */
@Component({
  selector: 'app-page-header-skeleton',
  imports: [HlmSkeleton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true', class: 'flex w-full flex-col gap-2' },
  template: `
    <div class="flex items-end gap-4">
      @if (showBack()) {
        <hlm-skeleton class="size-8 bg-foreground/10" />
      }
      <div class="flex flex-1 flex-col gap-2">
        <hlm-skeleton class="h-4 w-56 max-w-full bg-foreground/10" />
        <hlm-skeleton class="h-5 w-40 bg-foreground/10 md:h-8 md:w-64" />
      </div>
    </div>
    <div class="flex min-h-10 items-center" [class.ps-12]="showBack()">
      <hlm-skeleton class="h-4 w-full max-w-xl bg-foreground/10" />
    </div>
  `,
})
export class PageHeaderSkeleton {
  /** Reserva el espacio de la flecha de regreso. */
  readonly showBack = input<boolean, BooleanInput>(false, { transform: booleanAttribute });
}
