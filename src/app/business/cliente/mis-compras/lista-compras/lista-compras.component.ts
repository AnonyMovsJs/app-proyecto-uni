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
      title: 'Pagar Cuenta de Fiados (Bodega)',
      html: `
        <div style="text-align: left; color: #2C1810; font-family: 'Plus Jakarta Sans', sans-serif;">
          <div style="background: #FAF7F2; border-radius: 8px; padding: 12px; border: 1px solid #E5DDD3; margin-bottom: 12px;">
            <p style="margin-bottom: 4px; font-size: 0.95rem; color: #66564E;">
              Saldo fiado acumulado pendiente: <strong style="color: #9A5B13; font-size: 1.1rem;">S/. ${totalDeuda.toFixed(2)}</strong>
            </p>
            <p style="font-size: 0.82rem; color: #8C7B72; margin-bottom: 0;">
              <i class="fas fa-info-circle mr-1" style="color: #C59B6D;"></i>
              Pago con Yape para amortizar tus consumos según antigüedad (FIFO).
            </p>
          </div>

          <div style="text-align: center; margin: 12px 0; padding: 12px; background: #FAF5FF; border-radius: 8px; border: 1px dashed #A855F7;">
            <p class="mb-1" style="font-size: 0.85rem; font-weight: 600; color: #6B21A8;">
              <i class="fas fa-qrcode mr-1"></i> Escanea con Yape para pagar:
            </p>
            <img src="https://res.cloudinary.com/dwy44hftd/image/upload/v1746738914/yape_qr_placeholder.png"
                 alt="QR Yape" style="max-width: 130px; border-radius: 8px; border: 2px solid #7E22CE; margin: 4px 0;"
                 onerror="this.style.display='none'">
            <div style="font-weight: 800; color: #6B21A8; font-size: 1.1rem; letter-spacing: 0.5px;">
              Yape a: 987 654 321
            </div>
            <small style="color: #7E22CE; font-size: 0.78rem;">Titular: Ronald - D3 Royale</small>
          </div>

          <div class="form-group mb-3">
            <label style="font-weight: 700; font-size: 0.88rem; color: #2C1810;">Monto a Pagar (S/.):</label>
            <input id="swal-monto-abono-compras" type="number" step="0.50" min="0.50" max="${totalDeuda}" value="${Math.min(20, totalDeuda)}"
                   class="swal2-input" style="width: 100%; margin: 4px 0; border: 1px solid #C59B6D; font-weight: 700; color: #166534;"
                   onkeydown="if(event.key==='-'||event.key==='+'||event.key==='e') event.preventDefault();">
            <small class="text-muted d-block mt-1">Máximo a pagar: S/. ${totalDeuda.toFixed(2)} (no se permiten números negativos ni superar la deuda).</small>
          </div>

          <div class="form-group mb-2">
            <label style="font-weight: 700; font-size: 0.88rem; color: #2C1810;">Comprobante de Pago (Captura Yape):</label>
            <input id="swal-comprobante-file-compras" type="file" accept="image/*"
                   class="form-control-file" style="font-size: 0.85rem; border: 1px solid #E5DDD3; padding: 6px; border-radius: 6px; width: 100%; background: #FAF7F2;">
            <small class="text-muted d-block mt-1">Adjunta la captura legible de tu transferencia en Yape.</small>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: '<i class="fas fa-paper-plane mr-1"></i> Enviar Comprobante',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#166534',
      cancelButtonColor: '#66564E',
      width: '500px',
      preConfirm: () => {
        const montoInput = (document.getElementById('swal-monto-abono-compras') as HTMLInputElement)?.value;
        const fileInput = (document.getElementById('swal-comprobante-file-compras') as HTMLInputElement)?.files;
        const montoNum = parseFloat(montoInput);

        if (!montoInput || isNaN(montoNum) || montoNum <= 0) {
          Swal.showValidationMessage('Ingresa un monto numérico válido mayor a 0');
          return false;
        }
        if (montoNum > totalDeuda) {
          Swal.showValidationMessage(`El monto no puede superar tu deuda acumulada (S/. ${totalDeuda.toFixed(2)})`);
          return false;
        }
        if (!fileInput || fileInput.length === 0) {
          Swal.showValidationMessage('Debes seleccionar la captura de pantalla de tu comprobante');
          return false;
        }
        return {
          monto: montoNum,
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
              title: '¡Pago Enviado!',
              text: 'Tu comprobante está en revisión. Una vez validado por el administrador, amortizará tus saldos fiados pendientes.',
              icon: 'success',
              confirmButtonColor: '#166534',
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
