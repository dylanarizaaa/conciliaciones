import { Directive, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { classes } from '@spartan-ng/helm/utils';

@Directive({
  selector: '[hlmBreadcrumbLink]',
  exportAs: 'hlmBreadcrumbLink',
  hostDirectives: [
    {
      directive: RouterLink,
      inputs: [
        'target',
        'queryParams',
        'fragment',
        'queryParamsHandling',
        'state',
        'info',
        'relativeTo',
        'preserveFragment',
        'skipLocationChange',
        'replaceUrl',
        'routerLink: link',
      ],
    },
  ],
  host: {
    'data-slot': 'breadcrumb-link',
  },
})
export class HlmBreadcrumbLink {
  /** The link to navigate to the page. */
  public readonly link = input<RouterLink['routerLink']>();

  constructor() {
    classes(
      () =>
        'rounded-sm underline-offset-2 transition-colors outline-none hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
    );
  }
}
