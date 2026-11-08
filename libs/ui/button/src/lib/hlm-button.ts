import { Directive, input, signal } from '@angular/core';
import { BrnButton } from '@spartan-ng/brain/button';
import { classes } from '@spartan-ng/helm/utils';
import { cva, type VariantProps } from 'class-variance-authority';
import type { ClassValue } from 'clsx';
import { injectBrnButtonConfig } from './hlm-button.token';

/**
 * Variantes del "Btn principal" del sistema de diseño.
 *
 * - `variant`: `default` = Primario, `outline` = Secundario, `ghost` = Terciario.
 * - `size`: `sm` = Pequeño, `default` = Mediano, `lg` = Grande.
 * - Estado "Inactivo": usar el input `disabled` (aplica `data-disabled`).
 */
export const buttonVariants = cva(
  "data-[matches-spartan-invalid=true]:ring-destructive/20 dark:data-[matches-spartan-invalid=true]:ring-destructive/40 data-[matches-spartan-invalid=true]:border-destructive dark:data-[matches-spartan-invalid=true]:border-destructive/50 rounded-lg border border-transparent bg-clip-padding font-semibold outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:not-aria-[haspopup]:translate-y-px data-[matches-spartan-invalid=true]:ring-3 [&_ng-icon:not([class*='text-'])]:text-[length:--spacing(5)] group/button inline-flex shrink-0 cursor-pointer items-center justify-center whitespace-nowrap transition-colors select-none data-disabled:pointer-events-none data-disabled:cursor-default data-disabled:opacity-50 [&_ng-icon]:pointer-events-none [&_ng-icon]:shrink-0",
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground hover:bg-primary-hover data-disabled:bg-disabled data-disabled:text-disabled-foreground data-disabled:opacity-100',
        outline:
          'border-primary bg-background text-primary hover:bg-gris-inicial aria-expanded:bg-gris-inicial data-disabled:border-disabled data-disabled:text-disabled data-disabled:opacity-100 dark:bg-input/30 dark:hover:bg-input/50',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-secondary/80 aria-expanded:bg-secondary aria-expanded:text-secondary-foreground',
        ghost:
          'text-foreground hover:bg-gris-inicial aria-expanded:bg-gris-inicial dark:hover:bg-muted/50',
        destructive:
          'bg-destructive/10 hover:bg-destructive/20 dark:bg-destructive/20 text-destructive dark:hover:bg-destructive/30',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default:
          'h-12 gap-2 px-6 text-base has-data-[icon=inline-end]:pe-5 has-data-[icon=inline-start]:ps-5',
        xs: "h-8 gap-1 px-3 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pe-2 has-data-[icon=inline-start]:ps-2 [&_ng-icon:not([class*='text-'])]:text-[length:--spacing(3.5)]",
        sm: "h-10 gap-1.5 px-4 text-sm in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pe-3 has-data-[icon=inline-start]:ps-3 [&_ng-icon:not([class*='text-'])]:text-[length:--spacing(4)]",
        lg: 'h-14 gap-2 px-8 text-base has-data-[icon=inline-end]:pe-6 has-data-[icon=inline-start]:ps-6',
        icon: 'size-10',
        'icon-xs':
          "size-6 rounded-md in-data-[slot=button-group]:rounded-lg [&_ng-icon:not([class*='text-'])]:text-[length:--spacing(3.5)]",
        'icon-sm':
          "size-8 rounded-md in-data-[slot=button-group]:rounded-lg [&_ng-icon:not([class*='text-'])]:text-[length:--spacing(6)]",
        'icon-lg': 'size-12',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export type ButtonVariants = VariantProps<typeof buttonVariants>;

@Directive({
  selector: 'button[hlmBtn], a[hlmBtn]',
  exportAs: 'hlmBtn',
  hostDirectives: [{ directive: BrnButton, inputs: ['disabled'] }],
  host: { 'data-slot': 'button' },
})
export class HlmButton {
  private readonly _config = injectBrnButtonConfig();

  private readonly _additionalClasses = signal<ClassValue>('');

  public readonly variant = input<ButtonVariants['variant']>(this._config.variant);

  public readonly size = input<ButtonVariants['size']>(this._config.size);

  constructor() {
    classes(() => [
      buttonVariants({ variant: this.variant(), size: this.size() }),
      this._additionalClasses(),
    ]);
  }

  setClass(classes: string): void {
    this._additionalClasses.set(classes);
  }
}
