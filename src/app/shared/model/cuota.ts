import { Estado } from "./estado";

export class Cuota {
  id!: number;
  credito_id!: number;
  numero_cuota: number = 0;
  monto: number = 0;
  fecha_vencimiento: Date = new Date();
  estado !: Estado;
}
