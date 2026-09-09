import { Component, OnInit } from '@angular/core';
import { UserService } from '../../../../shared/services/user.service';
import { VentaService } from '../../../../shared/services/venta.service';
import { Venta } from '../../../../shared/model/venta';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { PagoService } from '../../../../shared/services/pago.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-lista-compras',
  standalone: true,
  imports: [RouterLink, CommonModule],
  templateUrl: './lista-compras.component.html',
  styleUrls: ['./lista-compras.component.css'],
})
export class ListaComprasComponent implements OnInit {
  ventas: Venta[] = [];
  loading = false;
  error = '';
  filtroTipo: 'TODAS' | 'FIADO' | 'CREDITO' | 'CONTADO' = 'TODAS';
  clienteId: number | null = null;

  constructor(
    private userService: UserService,
    private ventaService: VentaService,
    private pagoService: PagoService
  ) {}

  ngOnInit(): void {
    this.cargarMisCompras();
  }

  cargarMisCompras(): void {
    this.loading = true;
    this.userService.userProfile().subscribe({
      next: (profile) => {
        const clienteId = profile.id;
        this.clienteId = clienteId;
        this.ventaService.obtenerVentasPorCliente(clienteId).subscribe({
          next: (ventas) => {
            this.ventas = ventas;
            this.loading = false;
          },
          error: (err) => {
            console.error('Error al cargar ventas:', err);
            this.error =
              'Error al cargar tus compras. Por favor, intenta nuevamente más tarde.';
            this.loading = false;
          },
        });
      },
      error: (err) => {
        console.error('Error al obtener perfil:', err);
        this.error =
          'Error al obtener tu perfil de usuario. Por favor, intenta nuevamente más tarde.';
        this.loading = false;
      },
    });
  }

  setFiltro(tipo: 'TODAS' | 'FIADO' | 'CREDITO' | 'CONTADO'): void {
    this.filtroTipo = tipo;
  }

  get ventasFiltradas(): Venta[] {
    if (this.filtroTipo === 'TODAS') {
      return this.ventas;
    }
    return this.ventas.filter((v) => v.tipoVenta === this.filtroTipo);
  }

  // Totales por categoría
  calcularTotalMonto(tipo?: 'FIADO' | 'CREDITO' | 'CONTADO'): number {
    const lista = tipo ? this.ventas.filter((v) => v.tipoVenta === tipo) : this.ventas;
    return lista.reduce((sum, v) => sum + (Number(v.montoTotal) || 0), 0);
  }

  calcularTotalPagado(tipo?: 'FIADO' | 'CREDITO' | 'CONTADO'): number {
    const lista = tipo ? this.ventas.filter((v) => v.tipoVenta === tipo) : this.ventas;
    return lista.reduce((sum, v) => {
      if (v.tipoVenta === 'CONTADO' || v.estado === 'PAGADO') {
        return sum + (Number(v.montoTotal) || 0);
      }
      return sum + (Number(v.totalPagado) || 0);
    }, 0);
  }

  calcularSaldoPendiente(tipo?: 'FIADO' | 'CREDITO' | 'CONTADO'): number {
    const lista = tipo ? this.ventas.filter((v) => v.tipoVenta === tipo) : this.ventas;
    return lista.reduce((sum, v) => {
      if (v.tipoVenta === 'CONTADO' || v.estado === 'PAGADO') {
        return sum;
      }
      if (v.saldoPendiente !== undefined) {
        return sum + Number(v.saldoPendiente);
      }
      const pendiente = (Number(v.montoTotal) || 0) - (Number(v.totalPagado) || 0);
      return sum + Math.max(0, pendiente);
    }, 0);
  }

  contarPorTipo(tipo: 'FIADO' | 'CREDITO' | 'CONTADO'): number {
    return this.ventas.filter((v) => v.tipoVenta === tipo).length;
  }

  abrirModalAbonoFiado(): void {
    const totalDeuda = this.calcularSaldoPendiente('FIADO');
    if (totalDeuda <= 0) {
      Swal.fire('Sin Deuda', '¡No tienes saldos pendientes de fiado para abonar!', 'info');
      return;
    }

    Swal.fire({
      title: 'Abonar a Cuenta de Fiados (Bodega)',
      html: `
        <div style="text-align: left; color: #ffffff;">
          <p style="margin-bottom: 8px; font-size: 0.95rem;">
            Saldo fiado acumulado pendiente: <strong style="color: #fb923c;">S/. ${totalDeuda.toFixed(2)}</strong>
          </p>
          <p style="font-size: 0.85rem; color: #cbd5e1; margin-bottom: 12px;">
            <i class="fas fa-info-circle text-warning mr-1"></i>
            Abono con Yape para liquidar tus consumos fiados en bodega según orden de antigüedad (FIFO).
          </p>
          <div style="text-align: center; margin: 10px 0;">
            <p class="mb-1" style="font-size: 0.85rem; color: #94a3b8;">Escanea con Yape para pagar:</p>
            <img src="https://res.cloudinary.com/dwy44hftd/image/upload/v1746738914/yape_qr_placeholder.png"
                 alt="QR Yape" style="max-width: 140px; border-radius: 8px; border: 2px solid #6b21a8;"
                 onerror="this.style.display='none'">
            <div style="font-weight: 700; color: #a855f7; font-size: 1.05rem; margin-top: 4px;">
              Yape a: 987 654 321
            </div>
          </div>
          <div class="form-group mt-3">
            <label style="font-size: 0.9rem; font-weight: 600;">Monto a Abonar (S/.):</label>
            <input id="swal-monto-abono-compras" type="number" step="0.50" min="1" max="${totalDeuda}" value="${Math.min(20, totalDeuda)}"
                   class="swal2-input" style="width: 100%; margin: 0; background: rgba(255,255,255,0.08); color: white; border: 1px solid #fb923c;">
          </div>
          <div class="form-group mt-3">
            <label style="font-size: 0.9rem; font-weight: 600;">Comprobante de Pago (Captura Yape):</label>
            <input id="swal-comprobante-file-compras" type="file" accept="image/*"
                   class="form-control-file" style="color: white; font-size: 0.85rem;">
          </div>
        </div>
      `,
      background: '#182234',
      color: '#ffffff',
      showCancelButton: true,
      confirmButtonText: '<i class="fas fa-paper-plane mr-1"></i> Enviar Comprobante',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#ea580c',
      cancelButtonColor: '#64748b',
      preConfirm: () => {
        const montoInput = (document.getElementById('swal-monto-abono-compras') as HTMLInputElement)?.value;
        const fileInput = (document.getElementById('swal-comprobante-file-compras') as HTMLInputElement)?.files;

        if (!montoInput || parseFloat(montoInput) <= 0) {
          Swal.showValidationMessage('Ingresa un monto válido mayor a 0');
          return false;
        }
        if (!fileInput || fileInput.length === 0) {
          Swal.showValidationMessage('Debes seleccionar la captura de pantalla de tu comprobante');
          return false;
        }
        return {
          monto: parseFloat(montoInput),
          file: fileInput[0],
        };
      },
    }).then((result) => {
      if (result.isConfirmed && result.value && this.clienteId) {
        Swal.fire({
          title: 'Subiendo comprobante...',
          text: 'Por favor espere mientras procesamos tu abono',
          allowOutsideClick: false,
          didOpen: () => {
            Swal.showLoading();
          },
        });

        this.pagoService.registrarAbonoFiado(this.clienteId, result.value.monto, result.value.file, 'FIADO').subscribe({
          next: () => {
            Swal.fire({
              title: '¡Abono Enviado!',
              text: 'Tu comprobante está en revisión. Una vez validado por el administrador, amortizará tus saldos fiados pendientes.',
              icon: 'success',
              confirmButtonColor: '#ea580c',
            }).then(() => {
              this.cargarMisCompras();
            });
          },
          error: (err) => {
            console.error('Error al registrar abono:', err);
            Swal.fire(
              'Error',
              err?.error?.error || 'No se pudo registrar el abono. Intenta nuevamente.',
              'error'
            );
          },
        });
      }
    });
  }
}
