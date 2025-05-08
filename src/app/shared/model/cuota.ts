import { Estado } from "./estado";

export class Cuota {
  id!: number;
  credito_id!: number;
  numeroCuota: number = 0;
  monto: number = 0;
  fechaVencimiento: Date = new Date();
  estado !: Estado;
}
