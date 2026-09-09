import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { PagoService } from '../../../shared/services/pago.service';
import { Pago } from '../../../shared/model/pago';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-admin-pagos',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './admin-pagos.component.html',
  styleUrls: ['./admin-pagos.component.css'],
})
export class AdminPagosComponent implements OnInit {
  pagos: Pago[] = [];
  filtro: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO' | 'TODOS' = 'PENDIENTE';
  loading = true;
  telegramEnabled = true;

  modalComprobanteVisible = false;
  comprobanteSeleccionadoUrl = '';

  constructor(private pagoService: PagoService) {}

  ngOnInit(): void {
    this.cargarPagos();
    this.cargarConfigTelegram();
  }

  cargarPagos(): void {
    this.loading = true;
    this.pagoService.listarTodosLosPagos().subscribe({
      next: (data) => {
        this.pagos = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al cargar pagos:', err);
        this.loading = false;
      },
    });
  }

  cargarConfigTelegram(): void {
    this.pagoService.getTelegramConfig().subscribe({
      next: (cfg) => {
        this.telegramEnabled = cfg.enabled;
      },
      error: () => {},
    });
  }

  toggleTelegram(event: any): void {
    const nuevoEstado = event.target.checked;
    this.pagoService.updateTelegramConfig(nuevoEstado).subscribe({
      next: (res) => {
        this.telegramEnabled = res.enabled;
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: `Notificaciones de Telegram ${this.telegramEnabled ? 'activadas' : 'desactivadas'}`,
          showConfirmButton: false,
          timer: 2500,
        });
      },
      error: () => {
        event.target.checked = !nuevoEstado;
      },
    });
  }

  get pagosFiltrados(): Pago[] {
    if (this.filtro === 'TODOS') {
      return this.pagos;
    }
    return this.pagos.filter((p) => (p.estado || 'APROBADO') === this.filtro);
  }

  contarPorEstado(estado: string): number {
    return this.pagos.filter((p) => (p.estado || 'APROBADO') === estado).length;
  }

  pagoSeleccionado: Pago | null = null;

  abrirModalComprobante(pago: Pago | string): void {
    if (typeof pago === 'string') {
      this.comprobanteSeleccionadoUrl = pago;
      this.pagoSeleccionado = null;
    } else {
      this.comprobanteSeleccionadoUrl = pago.comprobanteUrl || '';
      this.pagoSeleccionado = pago;
    }
    this.modalComprobanteVisible = true;
  }

  cerrarModalComprobante(): void {
    this.modalComprobanteVisible = false;
    this.comprobanteSeleccionadoUrl = '';
    this.pagoSeleccionado = null;
  }

  validarPago(pagoId: number, estado: 'APROBADO' | 'RECHAZADO'): void {
    if (estado === 'RECHAZADO') {
      Swal.fire({
        title: 'Rechazar Comprobante',
        text: 'Ingresa el motivo del rechazo para informar al cliente:',
        input: 'text',
        inputPlaceholder: 'Ej: Monto incorrecto o imagen no legible',
        showCancelButton: true,
        confirmButtonColor: '#e74c3c',
        cancelButtonColor: '#7f8c8d',
        confirmButtonText: 'Sí, Rechazar',
        cancelButtonText: 'Cancelar',
      }).then((result) => {
        if (result.isConfirmed) {
          const motivo = result.value || 'Comprobante no válido';
          this.ejecutarValidacion(pagoId, estado, motivo);
        }
      });
    } else {
      Swal.fire({
        title: '¿Aceptar este pago?',
        text: 'La cuota se marcará automáticamente como PAGADA en el sistema.',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#2ecc71',
        cancelButtonColor: '#7f8c8d',
        confirmButtonText: 'Sí, Aceptar Pago',
        cancelButtonText: 'Cancelar',
      }).then((result) => {
        if (result.isConfirmed) {
          this.ejecutarValidacion(pagoId, estado);
        }
      });
    }
  }

  private ejecutarValidacion(pagoId: number, estado: 'APROBADO' | 'RECHAZADO', motivo?: string): void {
    this.pagoService.validarPago(pagoId, estado, motivo).subscribe({
      next: () => {
        Swal.fire({
          title: estado === 'APROBADO' ? '¡Pago Aprobado!' : 'Pago Rechazado',
          text: estado === 'APROBADO' ? 'La cuota se actualizó a PAGADO.' : 'Se registró el rechazo.',
          icon: estado === 'APROBADO' ? 'success' : 'info',
          confirmButtonColor: '#3498db',
        });
        this.cargarPagos();
      },
      error: (err) => {
        Swal.fire({
          title: 'Error',
          text: err.error?.error || 'No se pudo actualizar el pago.',
          icon: 'error',
        });
      },
    });
  }
}
