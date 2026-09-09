import { Cuota } from "./cuota";

export class Pago {
  id!: number;
  cuota: Cuota = new Cuota();
  cuotaId?: number;
  numeroCuota?: number;
  totalCuotas?: number;
  creditoId?: number;
  ventaId?: number;
  clienteId?: number;
  clienteNombre?: string;
  clienteDni?: string;
  monto: number = 0;
  fechaPago: Date = new Date();
  metodoPago?: string;
  estado?: string;
  comprobanteUrl?: string;
  fechaValidacion?: Date;
  motivoRechazo?: string;
  tipoVenta?: string;
}
