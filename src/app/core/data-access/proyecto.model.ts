/** Plataforma (proyecto) con diferencias pendientes de conciliar. */
export interface Proyecto {
  readonly proyectoId: string;
  readonly nombreProyecto: string;
  /** Monto afectado por las diferencias. */
  readonly monto: number;
  /** Cantidad de casos con diferencias. */
  readonly cantidad: number;
}

export interface ProyectosResultado {
  readonly data: readonly Proyecto[];
}
