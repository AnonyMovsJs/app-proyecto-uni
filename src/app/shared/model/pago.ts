import { Cuota } from "./cuota";

export class Pago {
  id!: number;
  cuota: Cuota = new Cuota();
  monto: number = 0;
  fechaPago: Date = new Date();
}
