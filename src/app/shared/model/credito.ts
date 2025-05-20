import { Estado } from "./estado";
import { Venta } from "./venta";

export class Credito {
  id!: number;
  venta!: number;
  montoTotal: number = 0;
  interes: number = 0;
  numero_cuotas: number = 0;
  fechaInicio: Date = new Date();
  fechaFin: Date = new Date();
  estado!: Estado;
}
