import { Directive } from '@angular/core';
import { classes } from '@spartan-ng/helm/utils';

@Directive({
  selector: 'div[hlmTableContainer]',
  exportAs: 'hlmTableContainer',
  host: { 'data-slot': 'table-container' },
})
export class HlmTableContainer {
  constructor() {
    classes(
      () =>
        'relative w-full overflow-x-auto rounded-lg border border-gris-rafaga bg-card text-card-foreground',
    );
  }
}

/**
 * Directive to apply Shadcn-like styling to a <table> element.
 */
@Directive({
  selector: 'table[hlmTable]',
  exportAs: 'hlmTable',
  host: { 'data-slot': 'table' },
})
export class HlmTable {
  constructor() {
    classes(() => 'w-full caption-bottom text-sm');
  }
}

/**
 * Directive to apply Shadcn-like styling to a <thead> element
 * within an HlmTable context.
 */
@Directive({
  selector: 'thead[hlmTHead],thead[hlmTableHeader]',
  exportAs: 'hlmTHead',
  host: { 'data-slot': 'table-header' },
})
export class HlmTHead {
  constructor() {
    classes(() => 'bg-gris-inicial [&_tr]:border-b [&_tr]:hover:bg-transparent');
  }
}

/**
 * Directive to apply Shadcn-like styling to a <tbody> element
 * within an HlmTable context.
 */
@Directive({
  selector: 'tbody[hlmTBody],tbody[hlmTableBody]',
  exportAs: 'hlmTBody',
  host: { 'data-slot': 'table-body' },
})
export class HlmTBody {
  constructor() {
    classes(() => '[&_tr:last-child]:border-0');
  }
}

/**
 * Directive to apply Shadcn-like styling to a <tfoot> element
 * within an HlmTable context.
 */
@Directive({
  selector: 'tfoot[hlmTFoot],tfoot[hlmTableFooter]',
  exportAs: 'hlmTFoot',
  host: { 'data-slot': 'table-footer' },
})
export class HlmTFoot {
  constructor() {
    classes(() => 'bg-gris-inicial border-t border-gris-rafaga font-semibold [&>tr]:last:border-b-0');
  }
}

/**
 * Directive to apply Shadcn-like styling to a <tr> element
 * within an HlmTable context.
 */
@Directive({
  selector: 'tr[hlmTr],tr[hlmTableRow]',
  exportAs: 'hlmTr',
  host: { 'data-slot': 'table-row' },
})
export class HlmTr {
  constructor() {
    classes(
      () =>
        'border-b border-gris-rafaga transition-colors hover:bg-gris-inicial/60 data-[state=selected]:bg-gris-inicial has-aria-expanded:bg-gris-inicial/60',
    );
  }
}

/**
 * Directive to apply Shadcn-like styling to a <th> element
 * within an HlmTable context.
 */
@Directive({
  selector: 'th[hlmTh],th[hlmTableHead]',
  exportAs: 'hlmTh',
  host: { 'data-slot': 'table-head' },
})
export class HlmTh {
  constructor() {
    classes(
      () =>
        'h-12 px-4 text-start align-middle text-sm font-normal whitespace-nowrap text-muted-foreground [&:has([role=checkbox])]:pe-0',
    );
  }
}

/**
 * Directive to apply Shadcn-like styling to a <td> element
 * within an HlmTable context.
 */
@Directive({
  selector: 'td[hlmTd],td[hlmTableCell]',
  exportAs: 'hlmTd',
  host: { 'data-slot': 'table-cell' },
})
export class HlmTd {
  constructor() {
    classes(
      () =>
        'h-18 px-4 align-middle text-sm whitespace-nowrap text-muted-foreground [&:has([role=checkbox])]:pe-0',
    );
  }
}

/**
 * Directive to apply Shadcn-like styling to a <caption> element
 * within an HlmTable context.
 */
@Directive({
  selector: 'caption[hlmCaption],caption[hlmTableCaption]',
  exportAs: 'hlmCaption',
  host: { 'data-slot': 'table-caption' },
})
export class HlmCaption {
  constructor() {
    classes(() => 'text-muted-foreground mt-4 text-sm');
  }
}
