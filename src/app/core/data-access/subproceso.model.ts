import type { ResumenConsulta, ResumenDiferencias } from './resumen-diferencias';

/** Canal (subproceso) de una categoría con diferencias pendientes de conciliar. */
export interface Subproceso {
  readonly subProcesoId: string;
  readonly nombreSubProceso: string;
  /** Monto afectado; si viene `null` solo se muestran los casos. */
  readonly monto: number | null;
  /** Cantidad de casos con diferencias. */
  readonly cantidad: number;
}

export type SubprocesosResultado = ResumenDiferencias<Subproceso>;
export type SubprocesosConsulta = ResumenConsulta<Subproceso>;
