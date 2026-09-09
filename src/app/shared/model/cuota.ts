import { Estado } from "./estado";

export class Cuota {
  id!: number;
  credito_id!: number;
  creditoId!: number;
  ventaId?: number;
  numeroCuota: number = 0;
  monto: number = 0;
  fechaVencimiento: Date = new Date();
  estado !: Estado;
  tipoVenta?: string;
  descripcionVenta?: string;
  totalCuotas?: number;
}
