import { Estado } from "./estado";

export class Credito {
  id!: number;
  venta_id!: number;
  monto_total: number = 0;
  interes: number = 0;
  numero_cuotas: number = 0;
  fecha_inicio: Date = new Date();
  fecha_fin: Date = new Date();
  estado!: Estado;
}
