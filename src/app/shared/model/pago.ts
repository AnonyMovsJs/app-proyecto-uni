export class Pago {
  id!: number;
  cuota_id!: number;
  monto: number = 0;
  fecha_pago: Date = new Date();
}
