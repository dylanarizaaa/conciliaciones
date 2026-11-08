import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  type ElementRef,
  inject,
  Injector,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { distinctUntilChanged, filter, map, skip } from 'rxjs';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main #main tabindex="-1" class="outline-none">
      <router-outlet />
    </main>
  `,
})
export class App {
  private readonly main = viewChild.required<ElementRef<HTMLElement>>('main');

  constructor() {
    const injector = inject(Injector);

    // Al cambiar de pantalla, el foco vuelve al contenido principal para que el teclado y los
    // lectores de pantalla no queden en un elemento que ya no existe. Se omite la carga inicial
    // y los cambios que solo afectan los query params (p. ej. la paginación de una tabla).
    const pathOf = (url: string) => url.split(/[?#]/)[0];
    inject(Router)
      .events.pipe(
        filter((event) => event instanceof NavigationEnd),
        map((event) => pathOf(event.urlAfterRedirects)),
        distinctUntilChanged(),
        skip(1),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        afterNextRender(() => this.main().nativeElement.focus({ preventScroll: false }), {
          injector,
        });
      });
  }
}
