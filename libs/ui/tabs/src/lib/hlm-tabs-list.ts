import { Directive, input } from '@angular/core';
import { BrnTabsList } from '@spartan-ng/brain/tabs';
import { classes } from '@spartan-ng/helm/utils';
import { type VariantProps, cva } from 'class-variance-authority';

export const listVariants = cva(
  // "Pestañas": fila de pestañas de 48px, sin fondo; cada pestaña dibuja su línea inferior.
  'group/tabs-list flex w-full max-w-full items-stretch overflow-x-auto text-gris-medio group-data-[orientation=vertical]/tabs:h-fit group-data-[orientation=vertical]/tabs:flex-col',
  {
    variants: {
      variant: {
        default: '',
        line: '',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);
type ListVariants = VariantProps<typeof listVariants>;

@Directive({
  selector: '[hlmTabsList],hlm-tabs-list',
  exportAs: 'hlmTabsList',
  hostDirectives: [BrnTabsList],
  host: {
    'data-slot': 'tabs-list',
    '[attr.data-variant]': 'variant()',
  },
})
export class HlmTabsList {
  public readonly variant = input<ListVariants['variant']>('default');

  constructor() {
    classes(() => listVariants({ variant: this.variant() }));
  }
}
