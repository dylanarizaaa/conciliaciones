import { Directive, input } from '@angular/core';
import { BrnTabsTrigger } from '@spartan-ng/brain/tabs';
import { classes } from '@spartan-ng/helm/utils';

@Directive({
  selector: '[hlmTabsTrigger]',
  exportAs: 'hlmTabsTrigger',
  hostDirectives: [
    { directive: BrnTabsTrigger, inputs: ['brnTabsTrigger: hlmTabsTrigger', 'disabled'] },
  ],
  host: {
    'data-slot': 'tabs-trigger',
  },
})
export class HlmTabsTrigger {
  public readonly triggerFor = input.required<string>({ alias: 'hlmTabsTrigger' });
  constructor() {
    // "Pestañas" del handoff: 48px de alto, línea Gris ráfaga de 2px y, en la seleccionada,
    // indicador Terciario de 3px. Estados: default (Gris medio), hover, seleccionado e inactivo.
    classes(() => [
      'relative inline-flex h-12 min-w-[6.25rem] shrink-0 cursor-pointer items-center justify-center border-b-2 border-gris-rafaga px-4 text-base font-normal whitespace-nowrap text-gris-medio transition-colors',
      'data-[state=inactive]:hover:font-semibold data-[state=inactive]:hover:text-texto-hover',
      'data-active:font-semibold data-active:text-foreground',
      'after:absolute after:inset-x-0 after:-bottom-0.5 after:h-[3px] after:rounded-t-[2px] after:bg-terciario after:opacity-0 after:transition-opacity data-active:after:opacity-100',
      'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring',
      'disabled:cursor-not-allowed disabled:font-normal! disabled:text-gris-rafaga!',
      'group-data-[orientation=vertical]/tabs:w-full group-data-[orientation=vertical]/tabs:justify-start',
      '[&_ng-icon]:pointer-events-none [&_ng-icon]:shrink-0 [&_ng-icon:not([class*=text-])]:text-[length:--spacing(4)]',
    ]);
  }
}
