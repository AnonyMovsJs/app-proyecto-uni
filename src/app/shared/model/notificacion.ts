export interface Notificacion {
  id: string;
  clienteId: number;
  clienteNombre: string;
  clienteEmail?: string;
  clienteTelefono?: string;
  clienteDni?: string;
  titulo: string;
  mensaje: string;
  montoDeuda: number;
  diasRetraso: number;
  fechaVencimiento: string | Date;
  fechaEnvio: Date;
  leida: boolean;
  tipo: 'MORA_CRITICA' | 'MORA_LEVE' | 'POR_VENCER' | 'RECORDATORIO';
}
