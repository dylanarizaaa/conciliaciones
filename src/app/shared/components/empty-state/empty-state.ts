import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideInbox } from '@ng-icons/lucide';

/** Mensaje para listas sin resultados. */
@Component({
  selector: 'app-empty-state',
  imports: [NgIcon],
  providers: [provideIcons({ lucideInbox })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'flex flex-col items-center gap-2 rounded-card bg-gris-inicial px-6 py-10 text-center',
  },
  template: `
    <ng-icon name="lucideInbox" class="text-muted-foreground" size="2rem" aria-hidden="true" />
    <p class="font-semibold text-foreground">{{ title() }}</p>
    @if (description(); as description) {
      <p class="text-sm text-muted-foreground">{{ description }}</p>
    }
  `,
})
export class EmptyState {
  readonly title = input.required<string>();
  readonly description = input<string>('');
}
