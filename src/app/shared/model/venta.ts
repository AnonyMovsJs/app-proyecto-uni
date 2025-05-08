import { Credito } from "./credito";
import { Estado } from "./estado";
import { TipoVenta } from "./tipoVenta";

export class Venta {
  id!: number;
  clienteId!: number;
  descripcion: string = '';
  creditoDTO?: Credito;
  montoTotal: number = 0;
  tipoVenta!: TipoVenta;
  estado!: Estado;
  fechaVenta: Date = new Date();
}
