import type { BooleanInput } from '@angular/cdk/coercion';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChild,
  input,
  output,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowLeft } from '@ng-icons/lucide';
import { HlmBreadcrumbImports } from '@spartan-ng/helm/breadcrumb';
import { HlmButton } from '@spartan-ng/helm/button';
import { PageHeaderActions } from './page-header-actions';

/** Una "miga" de la ruta de navegación. La última se muestra como página actual. */
export interface PageHeaderBreadcrumb {
  readonly label: string;
  readonly link?: RouterLink['routerLink'];
}

/**
 * "Header título" del sistema de diseño.
 *
 * Propiedades de Figma → inputs:
 * - Icono (Back Arrow + Padding) → `showBack` / `backLink` / `back`.
 * - Miga de pan → `breadcrumbs`.
 * - Descripción → `description`.
 * - Botón → contenido proyectado con `appPageHeaderActions`.
 */
@Component({
  selector: 'app-page-header',
  imports: [NgIcon, RouterLink, HlmBreadcrumbImports, HlmButton],
  providers: [provideIcons({ lucideArrowLeft })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex w-full flex-col gap-2' },
  template: `
    <div class="flex items-end gap-4">
      @if (showBack()) {
        @if (backLink(); as backLink) {
          <a hlmBtn variant="ghost" size="icon-sm" [routerLink]="backLink" [attr.aria-label]="backLabel()">
            <ng-icon name="lucideArrowLeft" aria-hidden="true" />
          </a>
        } @else {
          <button hlmBtn variant="ghost" size="icon-sm" type="button" [attr.aria-label]="backLabel()" (click)="back.emit()">
            <ng-icon name="lucideArrowLeft" aria-hidden="true" />
          </button>
        }
      }

      <div class="flex min-w-0 flex-1 flex-col gap-2">
        @if (breadcrumbs().length > 0) {
          <nav hlmBreadcrumb>
            <ol hlmBreadcrumbList>
              @for (crumb of breadcrumbs(); track $index) {
                <!-- El separador va dentro del <li> para que la lista solo tenga elementos listitem (axe: list). -->
                <li hlmBreadcrumbItem>
                  @if ($last) {
                    <span hlmBreadcrumbPage>{{ crumb.label }}</span>
                  } @else {
                    @if (crumb.link) {
                      <a hlmBreadcrumbLink [link]="crumb.link">{{ crumb.label }}</a>
                    } @else {
                      <span>{{ crumb.label }}</span>
                    }
                    <span hlmBreadcrumbSeparator></span>
                  }
                </li>
              }
            </ol>
          </nav>
        }

        <h1 class="text-base leading-5 font-bold text-foreground md:text-[2rem] md:leading-8 md:font-semibold">
          {{ title() }}
        </h1>
      </div>
    </div>

    @if (hasDescriptionRow()) {
      <div class="flex min-h-10 flex-wrap items-center gap-6" [class.ps-12]="showBack()">
        @if (description(); as description) {
          <p class="min-w-0 flex-1 basis-80 text-sm leading-[1.2] text-muted-foreground md:text-base">
            {{ description }}
          </p>
        }
        <ng-content select="[appPageHeaderActions]" />
      </div>
    }
  `,
})
export class PageHeader {
  private readonly actions = contentChild(PageHeaderActions);

  /** Título principal de la página (se renderiza como `h1`). */
  readonly title = input.required<string>();
  /** Texto descriptivo bajo el título. */
  readonly description = input<string>('');
  /** Ruta de navegación; vacío para ocultar la miga de pan. */
  readonly breadcrumbs = input<readonly PageHeaderBreadcrumb[]>([]);
  /** Muestra la flecha de regreso. */
  readonly showBack = input<boolean, BooleanInput>(false, { transform: booleanAttribute });
  /** Ruta de regreso. Si se omite, la flecha es un botón que emite `back`. */
  readonly backLink = input<RouterLink['routerLink'] | null>(null);
  /** Nombre accesible de la flecha de regreso. */
  readonly backLabel = input<string>('Volver');

  /** Se emite al pulsar la flecha de regreso cuando no hay `backLink`. */
  readonly back = output<void>();

  protected readonly hasDescriptionRow = computed(
    () => this.description().length > 0 || this.actions() !== undefined,
  );
}
