import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { VentaService } from '../../../../shared/services/venta.service';
import { CreditoService } from '../../../../shared/services/credito.service';
import { PagoService } from '../../../../shared/services/pago.service';
import { AuthService } from '../../../../shared/services/auth.service';
import { CommonModule, Location } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-detalle-compra',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RouterLink],
  templateUrl: './detalle-compra.component.html',
  styleUrls: ['./detalle-compra.component.css'],
})
export class DetalleCompraComponent implements OnInit {
  ventaId!: number;
  venta: any;
  detalles: any[] = [];
  credito: any;
  cuotas: any[] = [];
  loading = true;
  error = '';

  // Variable para almacenar la fecha actual (para cálculos de cuotas vencidas)
  fechaActual = new Date();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private ventaService: VentaService,
    private creditoService: CreditoService,
    private pagoService: PagoService,
    public authService: AuthService,
    private location: Location
  ) {}

  volver(): void {
    if (window.history.length > 1) {
      this.location.back();
    } else {
      if (this.authService.isAdmin()) {
        this.router.navigate(['/admin/ventas']);
      } else {
        this.router.navigate(['/cliente/mis-compras']);
      }
    }
  }

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      this.ventaId = +params['id'];
      this.cargarDatos();
    });
  }

  cargarDatos(): void {
    this.loading = true;
    this.error = '';

    this.ventaService.obtenerVenta(this.ventaId).subscribe({
      next: (venta) => {
        this.venta = venta;
        this.cargarDetalles();
      },
      error: (error) => {
        this.error =
          'No se pudo cargar la información de la compra. Por favor, intente nuevamente más tarde.';
        this.loading = false;
        console.error('Error al cargar venta', error);
      },
    });
  }

  cargarDetalles(): void {
    // Si la venta ya traía los detalles anidados
    if (this.venta?.detalles && Array.isArray(this.venta.detalles) && this.venta.detalles.length > 0) {
      this.detalles = this.venta.detalles;
      if (this.venta.tipoVenta === 'CREDITO' || this.venta.tipoVenta === 'FIADO') {
        this.cargarCredito();
      } else {
        this.loading = false;
      }
      return;
    }

    this.ventaService.obtenerDetallesVenta(this.ventaId).subscribe({
      next: (detalles) => {
        this.detalles = detalles || [];

        // Si es venta a crédito o fiado, cargar información del crédito
        if (this.venta.tipoVenta === 'CREDITO' || this.venta.tipoVenta === 'FIADO') {
          this.cargarCredito();
        } else {
          this.loading = false;
        }
      },
      error: (error) => {
        console.warn('Detalles no disponibles para esta venta, mostrando descripción general', error);
        this.detalles = [];
        if (this.venta.tipoVenta === 'CREDITO' || this.venta.tipoVenta === 'FIADO') {
          this.cargarCredito();
        } else {
          this.loading = false;
        }
      },
    });
  }

  cargarCredito(): void {
    this.creditoService.obtenerCreditoPorVenta(this.ventaId).subscribe({
      next: (credito) => {
        this.credito = credito;
        this.cargarCuotas();
      },
      error: (error) => {
        // En caso de que no tenga entidad crédito asociada
        this.loading = false;
        console.warn('No se encontró crédito asociado a esta venta', error);
      },
    });
  }

  cargarCuotas(): void {
    this.creditoService.obtenerCuotasPorCredito(this.credito.id).subscribe({
      next: (cuotas) => {
        this.cuotas = cuotas;
        this.loading = false;
      },
      error: (error) => {
        this.error = 'Error al cargar las cuotas';
        this.loading = false;
        console.error('Error al cargar cuotas', error);
      },
    });
  }

  // Método mejorado para obtener color según estado de cuota
  obtenerColorEstadoCuota(estado: string): string {
    switch (estado) {
      case 'PAGADO':
        return '#2ecc71'; // Verde
      case 'EN_REVISION':
        return '#9b59b6'; // Morado Yape
      case 'PENDIENTE':
        return '#f39c12'; // Naranja
      case 'VENCIDO':
        return '#e74c3c'; // Rojo
      default:
        return '#95a5a6'; // Gris
    }
  }

  calcularProgresoCredito(): number {
    const total = this.credito ? Number(this.credito.montoTotal) : Number(this.venta?.montoTotal || 0);
    if (!total || total <= 0) return 0;
    const pagado = this.calcularTotalPagado();
    const porcentaje = (pagado / total) * 100;
    return Math.min(100, Math.max(0, Math.round(porcentaje * 10) / 10));
  }

  // Método para obtener el color de la barra de progreso según el porcentaje
  obtenerColorProgreso(porcentaje: number): string {
    if (porcentaje < 30) {
      return '#e74c3c'; // Rojo
    } else if (porcentaje < 70) {
      return '#f39c12'; // Naranja
    } else {
      return '#2ecc71'; // Verde
    }
  }

  // Verificar si una fecha está vencida
  estaVencida(fecha: string): boolean {
    const fechaVencimiento = new Date(fecha);
    return fechaVencimiento < this.fechaActual;
  }

  // Calcular el total pagado hasta el momento
  calcularTotalPagado(): number {
    if (this.venta?.tipoVenta === 'CONTADO' || this.venta?.estado === 'PAGADO') {
      return Number(this.venta?.montoTotal || 0);
    }
    const total = this.credito ? Number(this.credito.montoTotal) : Number(this.venta?.montoTotal || 0);
    if (!this.cuotas || this.cuotas.length === 0) {
      return Number(this.venta?.totalPagado || 0);
    }
    const pendiente = this.cuotas
      .filter((c) => c.estado !== 'PAGADO')
      .reduce((sum, c) => sum + Number(c.monto), 0);
    const pagado = total - pendiente;
    return Math.max(0, pagado);
  }

  // Calcular el total pendiente por pagar
  calcularTotalPendiente(): number {
    if (this.venta?.tipoVenta === 'CONTADO' || this.venta?.estado === 'PAGADO') {
      return 0;
    }
    if (!this.cuotas || this.cuotas.length === 0) {
      if (this.venta?.saldoPendiente !== undefined) return Number(this.venta.saldoPendiente);
      return Number(this.venta?.montoTotal || 0) - Number(this.venta?.totalPagado || 0);
    }
    return this.cuotas
      .filter((c) => c.estado !== 'PAGADO')
      .reduce((sum, c) => sum + Number(c.monto), 0);
  }

  // Registrar cobro presencial (Efectivo o Yape) para admin
  registrarCobroPresencial(cuota: any): void {
    const deudaCuota = parseFloat(cuota.monto) || 0;

    (Swal as any).fire({
      title: 'Registrar Pago / Cobro',
      html: `
        <div style="text-align: left; color: #2C1810; font-family: 'Plus Jakarta Sans', sans-serif;">
          <p class="mb-2" style="font-size: 0.92rem;">
            Cuota #<strong>${cuota.numeroCuota}</strong> | Deuda pendiente: <strong style="color: #9A5B13;">S/. ${deudaCuota.toFixed(2)}</strong>
          </p>

          <div class="form-group mb-3">
            <label style="font-weight: 700; font-size: 0.88rem; color: #2C1810;">Método de Pago:</label>
            <select id="swal-cobro-metodo" class="swal2-input" style="width: 100%; margin: 4px 0; height: 42px; border: 1px solid #C59B6D;">
              <option value="EFECTIVO" selected>Efectivo (en caja / tienda)</option>
              <option value="YAPE">Yape (en mostrador)</option>
              <option value="TRANSFERENCIA">Transferencia bancaria</option>
            </select>
          </div>

          <div class="form-group mb-3">
            <label style="font-weight: 700; font-size: 0.88rem; color: #2C1810;">Monto Cobrado (S/.):</label>
            <input id="swal-cobro-monto" type="number" step="0.50" min="0.50" max="${deudaCuota}" value="${deudaCuota}"
                   class="swal2-input" style="width: 100%; margin: 4px 0; border: 1px solid #C59B6D; font-weight: 700; color: #166534;"
                   onkeydown="if(event.key==='-'||event.key==='+'||event.key==='e') event.preventDefault();">
            <small class="text-muted d-block mt-1">Máximo permitido: S/. ${deudaCuota.toFixed(2)} (no se permiten números negativos ni superar la deuda).</small>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: '<i class="fas fa-check-circle mr-1"></i> Registrar Pago Aprobado',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#166534',
      preConfirm: () => {
        const metodo = (document.getElementById('swal-cobro-metodo') as HTMLSelectElement)?.value || 'EFECTIVO';
        const montoInput = (document.getElementById('swal-cobro-monto') as HTMLInputElement)?.value;
        const montoNum = parseFloat(montoInput);

        if (!montoInput || isNaN(montoNum) || montoNum <= 0) {
          (Swal as any).showValidationMessage('Ingresa un monto numérico positivo mayor a 0');
          return false;
        }

        if (montoNum > deudaCuota) {
          (Swal as any).showValidationMessage(`El monto no puede superar la deuda total pendiente (S/. ${deudaCuota.toFixed(2)})`);
          return false;
        }

        return {
          cuotaId: cuota.id,
          monto: montoNum,
          metodoPago: metodo
        };
      }
    }).then((result: any) => {
      if (result.isConfirmed && result.value) {
        (Swal as any).fire({
          title: 'Registrando pago...',
          allowOutsideClick: false,
          didOpen: () => (Swal as any).showLoading()
        });

        this.pagoService.registrarPago(result.value).subscribe({
          next: () => {
            (Swal as any).fire({
              title: '¡Pago Registrado!',
              text: 'El pago presencial fue registrado y aprobado con éxito',
              icon: 'success',
              confirmButtonColor: '#166534'
            }).then(() => {
              this.cargarDatos();
            });
          },
          error: (err: any) => {
            console.error('Error al registrar cobro:', err);
            (Swal as any).fire('Error', err?.error?.error || err?.error || 'No se pudo registrar el pago', 'error');
          }
        });
      }
    });
  }

  // Aplazar o cambiar fecha de vencimiento
  editarFechaVencimiento(cuota: any): void {
    const fechaActual = cuota.fechaVencimiento || new Date().toISOString().split('T')[0];

    (Swal as any).fire({
      title: 'Aplazar / Modificar Vencimiento',
      html: `
        <div style="text-align: left; color: #2C1810;">
          <p class="mb-2" style="font-size: 0.9rem;">
            Cuota #<strong>${cuota.numeroCuota}</strong> | Monto pendiente: <strong style="color: #9A5B13;">S/. ${parseFloat(cuota.monto).toFixed(2)}</strong>
          </p>
          <label style="font-weight: 600; font-size: 0.88rem; color: #66564E;">Nueva Fecha de Vencimiento:</label>
          <input id="swal-nueva-fecha" type="date" value="${fechaActual}" class="swal2-input" style="width: 100%; margin: 8px 0; border: 1px solid #C59B6D;">
          <small class="text-muted d-block mt-1">
            Si se acordó aplazar los días de pago, selecciona la nueva fecha pactada.
          </small>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: '<i class="fas fa-calendar-check mr-1"></i> Guardar Nueva Fecha',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#2C1810',
      preConfirm: () => {
        const fechaVal = (document.getElementById('swal-nueva-fecha') as HTMLInputElement)?.value;
        if (!fechaVal) {
          (Swal as any).showValidationMessage('Debe seleccionar una fecha');
          return false;
        }
        return fechaVal;
      }
    }).then((result: any) => {
      if (result.isConfirmed && result.value) {
        (Swal as any).fire({
          title: 'Actualizando fecha...',
          allowOutsideClick: false,
          didOpen: () => (Swal as any).showLoading()
        });

        this.creditoService.actualizarFechaVencimientoCuota(cuota.id, result.value).subscribe({
          next: () => {
            (Swal as any).fire('¡Fecha Actualizada!', 'Se ha modificado la fecha de vencimiento exitosamente', 'success').then(() => {
              this.cargarDatos();
            });
          },
          error: (err: any) => {
            console.error('Error al actualizar fecha:', err);
            (Swal as any).fire('Error', err?.error?.error || 'No se pudo actualizar la fecha', 'error');
          }
        });
      }
    });
  }
}
