import { ChangeDetectionStrategy, Component, effect, input, output } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideChevronLeft, lucideChevronRight } from '@ng-icons/lucide';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmInput } from '@spartan-ng/helm/input';

let nextId = 0;

/**
 * Paginador "Página [n] de N" del handoff. Las flechas se deshabilitan en los extremos
 * (variantes Default / Adelante activo / Atrás activo) y el campo permite saltar a una página.
 */
@Component({
  selector: 'app-paginator',
  imports: [NgIcon, ReactiveFormsModule, HlmButton, HlmInput],
  providers: [provideIcons({ lucideChevronLeft, lucideChevronRight })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav [attr.aria-label]="ariaLabel()" class="flex items-center gap-2.5 text-sm text-foreground">
      <label [for]="inputId">Página</label>
      <input
        hlmInput
        [id]="inputId"
        type="text"
        inputmode="numeric"
        autocomplete="off"
        class="h-8 w-[3.125rem] rounded-lg border-gris-complementario bg-card px-2 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
        [formControl]="pageControl"
        [attr.aria-describedby]="totalId"
        (change)="commit()"
        (keydown.enter)="commit()"
      />
      <span [id]="totalId">de {{ totalPages() }}</span>
      <button
        hlmBtn
        variant="ghost"
        size="icon-sm"
        type="button"
        class="ms-0.5 rounded-full border border-foreground bg-card hover:bg-gris-inicial data-disabled:border-gris-complementario data-disabled:text-gris-complementario data-disabled:opacity-100 [&_ng-icon]:text-[length:--spacing(5)]"
        aria-label="Página anterior"
        [disabled]="page() <= 1"
        (click)="goTo(page() - 1)"
      >
        <ng-icon name="lucideChevronLeft" aria-hidden="true" />
      </button>
      <button
        hlmBtn
        variant="ghost"
        size="icon-sm"
        type="button"
        class="rounded-full border border-foreground bg-card hover:bg-gris-inicial data-disabled:border-gris-complementario data-disabled:text-gris-complementario data-disabled:opacity-100 [&_ng-icon]:text-[length:--spacing(5)]"
        aria-label="Página siguiente"
        [disabled]="page() >= totalPages()"
        (click)="goTo(page() + 1)"
      >
        <ng-icon name="lucideChevronRight" aria-hidden="true" />
      </button>
    </nav>
  `,
})
export class Paginator {
  protected readonly inputId = `app-paginator-page-${nextId}`;
  protected readonly totalId = `app-paginator-total-${nextId++}`;
  protected readonly pageControl = new FormControl('1', { nonNullable: true });

  /** Página actual (desde 1). */
  readonly page = input.required<number>();
  /** Total de páginas. */
  readonly totalPages = input.required<number>();
  /** Nombre accesible de la navegación. */
  readonly ariaLabel = input<string>('Paginación');

  /** Página solicitada (ya acotada entre 1 y `totalPages`). */
  readonly pageChange = output<number>();

  constructor() {
    // Mantiene el campo sincronizado cuando la página cambia desde fuera (flechas, URL).
    effect(() => this.pageControl.setValue(String(this.page()), { emitEvent: false }));
  }

  protected goTo(page: number): void {
    const target = Math.min(Math.max(page, 1), Math.max(this.totalPages(), 1));
    this.pageControl.setValue(String(target), { emitEvent: false });
    if (target !== this.page()) {
      this.pageChange.emit(target);
    }
  }

  /** Aplica el valor escrito en el campo; si no es un número válido, restaura la página actual. */
  protected commit(): void {
    const value = Number.parseInt(this.pageControl.value, 10);
    if (Number.isNaN(value)) {
      this.pageControl.setValue(String(this.page()), { emitEvent: false });
      return;
    }
    this.goTo(value);
  }
}
