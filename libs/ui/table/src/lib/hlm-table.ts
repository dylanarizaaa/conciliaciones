import { Directive } from '@angular/core';
import { classes } from '@spartan-ng/helm/utils';

/**
 * "Máscara tabla": contenedor con desplazamiento horizontal. El marco (borde Gris ráfaga y
 * esquinas redondeadas) lo dibujan las celdas, así la barra de desplazamiento queda debajo de la
 * tabla y los bordes de las columnas fijas no se mueven al desplazar.
 */
@Directive({
  selector: 'div[hlmTableContainer]',
  exportAs: 'hlmTableContainer',
  host: { 'data-slot': 'table-container' },
})
export class HlmTableContainer {
  constructor() {
    classes(() => 'relative w-full overflow-x-auto text-card-foreground scrollbar-brand');
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
    // Bordes separados: cada celda dibuja su parte del marco (ver HlmTh / HlmTd).
    classes(() => 'w-full caption-bottom border-separate border-spacing-0 text-sm');
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
export class HlmTHead {}

/**
 * Directive to apply Shadcn-like styling to a <tbody> element
 * within an HlmTable context.
 */
@Directive({
  selector: 'tbody[hlmTBody],tbody[hlmTableBody]',
  exportAs: 'hlmTBody',
  host: { 'data-slot': 'table-body' },
})
export class HlmTBody {}

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
    // El fondo (hover / seleccionada) lo pintan las celdas: así las columnas fijas son opacas.
    classes(() => 'group/row');
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
    // Encabezado Gris inicial; arriba y a los lados forma el marco de la tabla.
    classes(
      () =>
        'h-12 border-b border-gris-rafaga bg-gris-inicial px-4 text-start align-middle text-sm font-normal whitespace-nowrap text-muted-foreground first:border-s last:border-e [tr:first-child>&]:border-t [tr:first-child>&]:first:rounded-ss-lg [tr:first-child>&]:last:rounded-se-lg [&:has([role=checkbox])]:pe-0',
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
    // Filas de 72px separadas por Gris ráfaga; la última fila cierra el marco por abajo.
    // Hover = Gris inicial al 60 % sobre el fondo de la tarjeta, ya mezclado para ser opaco.
    classes(
      () =>
        'h-18 border-b border-gris-rafaga bg-card px-4 align-middle text-sm whitespace-nowrap text-muted-foreground transition-colors group-hover/row:bg-[color-mix(in_srgb,var(--gris-inicial)_60%,var(--card))] group-data-[state=selected]/row:bg-gris-inicial first:border-s last:border-e [tr:last-child>&]:first:rounded-es-lg [tr:last-child>&]:last:rounded-ee-lg [&:has([role=checkbox])]:pe-0',
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
