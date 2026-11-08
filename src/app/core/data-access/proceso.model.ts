import type { ResumenConsulta, ResumenDiferencias } from './resumen-diferencias';

/** Categoría (proceso) de una plataforma con diferencias pendientes de conciliar. */
export interface Proceso {
  readonly procesoId: string;
  readonly nombreProceso: string;
  /**
   * Monto afectado. Puede venir `null` en categorías que no manejan valores
   * (p. ej. "Datos del cliente"); en ese caso solo se muestran los casos.
   */
  readonly monto: number | null;
  /** Cantidad de casos con diferencias. */
  readonly cantidad: number;
}

export type ProcesosResultado = ResumenDiferencias<Proceso>;
export type ProcesosConsulta = ResumenConsulta<Proceso>;
