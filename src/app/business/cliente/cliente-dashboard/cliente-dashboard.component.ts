import { Component, OnInit, AfterViewInit } from '@angular/core';
import { VentaService } from '../../../shared/services/venta.service';
import { CreditoService } from '../../../shared/services/credito.service';
import { AuthService } from '../../../shared/services/auth.service';
import { ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { UserService } from '../../../shared/services/user.service';
import { NotificacionService } from '../../../shared/services/notificacion.service';
import { Notificacion } from '../../../shared/model/notificacion';
import { PagoService } from '../../../shared/services/pago.service';
import { Chart, registerables } from 'chart.js';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-cliente-dashboard',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RouterLink],
  templateUrl: './cliente-dashboard.component.html',
  styleUrls: ['./cliente-dashboard.component.css'],
})
export class ClienteDashboardComponent implements OnInit, AfterViewInit {
  ventas: any[] = [];
  creditos: any[] = [];
  cuotasPendientes: any[] = [];
  cuotasVencidas: any[] = [];
  cuotasPagadas: any[] = [];
  notificacionesAlerta: Notificacion[] = [];
  modalMostradoEnSesion = false;
  loading = true;
  error = '';
  paymentsChart: any;
  currentYear = new Date().getFullYear();
  clienteId: number | null = null;
  pestanaActivaDeuda: 'FIADO' | 'CREDITO' | 'CONTADO' = 'FIADO';

  constructor(
    private ventaService: VentaService,
    private creditoService: CreditoService,
    private userService: UserService,
    private authService: AuthService,
    private notificacionService: NotificacionService,
    private pagoService: PagoService
  ) {}

  ngOnInit(): void {
    Chart.register(...registerables);
    this.cargarDatos();
  }

  ngAfterViewInit(): void {
    // Asegurarse de que los gráficos se inicialicen correctamente después de que el DOM esté listo
    if (!this.loading && !this.error) {
      setTimeout(() => {
        this.createPaymentsChart();
      }, 300);
    }
  }

  cargarDatos(): void {
    this.loading = true;
    // Limpiar las colecciones antes de cargar datos nuevos
    this.ventas = [];
    this.creditos = [];
    this.cuotasPendientes = [];
    this.cuotasVencidas = [];
    this.cuotasPagadas = [];

    // Cargar notificaciones de inmediato con la sesión activa
    const storedUser = this.authService.getCurrentUser();
    if (storedUser) {
      this.cargarNotificacionesAlerta(storedUser);
    }

    this.userService.userProfile().subscribe({
      next: (profile) => {
        const clienteId = profile.id;
        this.clienteId = clienteId;
        this.cargarNotificacionesAlerta(profile);
        this.ventaService.obtenerVentasPorCliente(clienteId).subscribe({
          next: (ventas) => {
            this.ventas = ventas;
            this.cargarCreditos(clienteId);
          },
          error: (err) => {
            console.error('Error al cargar ventas:', err);
            this.error =
              'No se pudieron cargar tus compras. Por favor, intenta nuevamente más tarde.';
            this.loading = false;
          },
        });
      },
      error: (err) => {
        console.error('Error al obtener perfil de usuario:', err);
        this.error =
          'No se pudo obtener tu información de perfil. Por favor, intenta nuevamente más tarde.';
        this.loading = false;
      },
    });
  }

  abrirModalAbonoLibre(tipo: 'FIADO' | 'TODO' = 'TODO'): void {
    const deudaFiado = this.calcularDeudaFiado();
    const deudaCredito = this.calcularDeudaCredito();
    const totalDeuda = tipo === 'FIADO' ? deudaFiado : (deudaFiado + deudaCredito);

    if (totalDeuda <= 0) {
      const msg = tipo === 'FIADO' 
        ? '¡No tienes deudas de fiado en bodega pendientes!' 
        : '¡No tienes saldos pendientes para pagar!';
      Swal.fire('Sin Deuda', msg, 'info');
      return;
    }

    const titulo = tipo === 'FIADO' ? 'Abonar a mi Cuenta de Fiados (Bodega)' : 'Abonar a mi Cuenta / Pagar Saldo';
    const subDesc = tipo === 'FIADO'
      ? 'Abono exclusivo para liquidar tus compras fiadas de bodega.'
      : 'El monto que abones se amortizará automáticamente liquidando tus compras o cuotas más antiguas primero (FIFO).';

    Swal.fire({
      title: titulo,
      html: `
        <div style="text-align: left; color: #ffffff;">
          <p style="margin-bottom: 8px; font-size: 0.95rem;">
            ${tipo === 'FIADO' ? 'Tu saldo fiado acumulado es' : 'Tu deuda total acumulada es'}: <strong style="color: #4fc3f7;">S/. ${totalDeuda.toFixed(2)}</strong>
          </p>
          <p style="font-size: 0.85rem; color: #cbd5e1; margin-bottom: 12px;">
            <i class="fas fa-info-circle text-warning mr-1"></i>
            ${subDesc}
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
            <input id="swal-monto-abono" type="number" step="0.50" min="1" max="${totalDeuda}" value="${Math.min(20, totalDeuda)}"
                   class="swal2-input" style="width: 100%; margin: 0; background: rgba(255,255,255,0.08); color: white; border: 1px solid #4fc3f7;">
          </div>
          <div class="form-group mt-3">
            <label style="font-size: 0.9rem; font-weight: 600;">Comprobante de Pago (Captura Yape):</label>
            <input id="swal-comprobante-file" type="file" accept="image/*"
                   class="form-control-file" style="color: white; font-size: 0.85rem;">
          </div>
        </div>
      `,
      background: '#182234',
      color: '#ffffff',
      showCancelButton: true,
      confirmButtonText: '<i class="fas fa-paper-plane mr-1"></i> Enviar Comprobante',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#059669',

      cancelButtonColor: '#64748b',
      preConfirm: () => {
        const montoInput = (document.getElementById('swal-monto-abono') as HTMLInputElement)?.value;
        const fileInput = (document.getElementById('swal-comprobante-file') as HTMLInputElement)?.files;

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

        this.pagoService.registrarAbonoFiado(this.clienteId, result.value.monto, result.value.file, tipo).subscribe({
          next: () => {
            Swal.fire({
              title: '¡Abono Enviado!',
              text: 'Tu comprobante está en revisión. Una vez validado por la administración, amortizará tus saldos pendientes.',
              icon: 'success',
              confirmButtonColor: '#059669',
            }).then(() => {
              this.cargarDatos();
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

  cargarNotificacionesAlerta(clienteIdentificador: any): void {
    this.notificacionService.cargarNotificaciones();
    this.notificacionService.obtenerPorCliente(clienteIdentificador).subscribe({
      next: (lista) => {
        this.notificacionesAlerta = lista.filter((n) => !n.leida);
        if (this.notificacionesAlerta.length > 0 && !this.modalMostradoEnSesion) {
          this.modalMostradoEnSesion = true;
          this.mostrarModalCobro(this.notificacionesAlerta[0]);
        }
      },
      error: (err) => console.error('Error al cargar alertas del cliente', err),
    });
  }

  mostrarModalCobro(notif: Notificacion): void {
    Swal.fire({
      title: '🚨 ¡AVISO IMPORTANTE DE COBRANZA!',
      html: `
        <div class="text-left" style="color: #ffffff;">
          <div style="background: rgba(220, 38, 38, 0.25); border: 2px solid #ef4444; border-radius: 10px; padding: 16px; margin-bottom: 14px;">
            <h5 style="color: #fca5a5; font-weight: bold; margin-bottom: 8px;">
              <i class="fas fa-bell mr-2"></i>Comercial Reyes le informa:
            </h5>
            <p style="margin-bottom: 8px; font-size: 1rem; color: #ffffff;">
              Estimado(a) <strong>${notif.clienteNombre}</strong>, usted mantiene un saldo vencido por:
            </p>
            <div style="text-align: center; margin: 12px 0;">
              <span style="font-size: 2.1rem; font-weight: 800; color: #f87171;">
                S/. ${Number(notif.montoDeuda).toFixed(2)}
              </span>
            </div>
            <div style="background: rgba(0,0,0,0.35); border-radius: 6px; padding: 10px 14px; margin-bottom: 6px;">
              <p style="margin-bottom: 4px; color: #ffffff;">
                <strong>Días de atraso acumulados:</strong>
                <span class="badge badge-danger ml-1" style="font-size: 0.95rem; padding: 4px 8px;">
                  ${notif.diasRetraso} día(s)
                </span>
              </p>
              <p style="margin-bottom: 0; color: #ffffff;">
                <strong>Fecha límite superada:</strong> ${new Date(notif.fechaVencimiento).toLocaleDateString()}
              </p>
            </div>
          </div>
          <p style="color: #ffffff; font-size: 0.88rem; opacity: 0.95; margin-bottom: 0;">
            ⚠️ Este aviso persistirá en su cuenta hasta la liquidación total de sus cuotas pendientes.
          </p>
        </div>
      `,
      icon: 'error',
      confirmButtonText: '<i class="fas fa-money-bill-wave mr-1"></i> Ir a Mis Compras y Cuotas',
      confirmButtonColor: '#dc2626',
      background: '#182234',
      color: '#ffffff',
      backdrop: 'rgba(0, 0, 0, 0.85)',
    });
  }

  get tieneDeudaMora(): boolean {
    return this.cuotasVencidas.length > 0 || this.notificacionesAlerta.length > 0;
  }

  getCantidadCuotasVencidas(): number {
    return this.cuotasVencidas.length > 0
      ? this.cuotasVencidas.length
      : this.notificacionesAlerta.length;
  }

  getMaxDiasMora(): number {
    let maxDias = 0;
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    this.cuotasVencidas.forEach((c) => {
      const v = new Date(c.fechaVencimiento);
      v.setHours(0, 0, 0, 0);
      const diff = Math.floor((hoy.getTime() - v.getTime()) / (1000 * 60 * 60 * 24));
      if (diff > maxDias) maxDias = diff;
    });

    if (maxDias === 0 && this.notificacionesAlerta.length > 0) {
      maxDias = Math.max(...this.notificacionesAlerta.map((n) => n.diasRetraso || 0));
    }

    return maxDias > 0 ? maxDias : 1;
  }

  getTotalMoraMonto(): number {
    let total = 0;
    if (this.cuotasVencidas.length > 0) {
      total = this.cuotasVencidas.reduce(
        (sum, c) => sum + (typeof c.monto === 'number' ? c.monto : parseFloat(c.monto) || 0),
        0
      );
    } else if (this.notificacionesAlerta.length > 0) {
      total = this.notificacionesAlerta.reduce((sum, n) => sum + (Number(n.montoDeuda) || 0), 0);
    }
    return total;
  }

  marcarAlertaLeida(id: string): void {
    this.notificacionService.marcarComoLeida(id);
    this.notificacionesAlerta = this.notificacionesAlerta.filter((n) => n.id !== id);
  }

  cargarCreditos(clienteId: number): void {
    this.creditoService.obtenerCreditosPorCliente(clienteId).subscribe({
      next: (creditos) => {
        this.creditos = creditos;

        // Si no hay créditos, no intentamos cargar cuotas
        if (creditos.length === 0) {
          this.loading = false;

          // Asegurarse de crear el gráfico incluso si no hay créditos
          setTimeout(() => {
            this.createPaymentsChart();
          }, 100);
          return;
        }

        // Contador para saber cuándo hemos procesado todos los créditos
        let creditosProcesados = 0;

        // Cargar cuotas para cada crédito
        this.creditos.forEach((credito) => {
          this.creditoService.obtenerCuotasPorCredito(credito.id).subscribe({
            next: (cuotas) => {
              // Filtrar cuotas pendientes (incluye EN_REVISION para que el saldo pendiente se mantenga hasta que admin apruebe) y vencidas
              const pendientes = cuotas.filter((c) => c.estado === 'PENDIENTE' || c.estado === 'EN_REVISION');
              const vencidas = cuotas.filter((c) => c.estado === 'VENCIDO');
              const pagadas = cuotas.filter((c) => c.estado === 'PAGADO');

              // Agregar información del crédito a cada cuota para mejor referencia
              const totalCuotasCredito = credito.numeroCuotas || (credito as any).numero_cuotas || cuotas.length;
              const tipoVentaCredito = (credito as any).tipoVenta || (credito.venta && (credito.venta as any).tipoVenta);
              const descVentaCredito = (credito as any).descripcionVenta || (credito.venta && (credito.venta as any).descripcion);

              const enriquecerCuota = (cuota: any) => {
                cuota.totalCuotas = totalCuotasCredito;
                if (!cuota.tipoVenta && tipoVentaCredito) cuota.tipoVenta = tipoVentaCredito;
                if (!cuota.descripcionVenta && descVentaCredito) cuota.descripcionVenta = descVentaCredito;
              };

              pendientes.forEach(enriquecerCuota);
              vencidas.forEach(enriquecerCuota);
              pagadas.forEach(enriquecerCuota);

              // Agregar a los arrays correspondientes
              this.cuotasPendientes = [...this.cuotasPendientes, ...pendientes];
              this.cuotasVencidas = [...this.cuotasVencidas, ...vencidas];
              this.cuotasPagadas = [...this.cuotasPagadas, ...pagadas];

              // Incrementar contador de créditos procesados
              creditosProcesados++;

              // Solo crear el gráfico cuando hayamos procesado todos los créditos
              if (creditosProcesados === this.creditos.length) {
                this.loading = false;

                // Asegurarse de que el DOM esté actualizado antes de crear el gráfico
                setTimeout(() => {
                  this.createPaymentsChart();
                  console.log('Gráfico creado con:', {
                    pendientes: this.cuotasPendientes.length,
                    vencidas: this.cuotasVencidas.length,
                    pagadas: this.cuotasPagadas.length,
                  });
                }, 100);
              }
            },
            error: (error) => {
              console.error('Error al cargar cuotas', error);
              creditosProcesados++;

              // Incluso en caso de error, verificar si hemos terminado
              if (creditosProcesados === this.creditos.length) {
                this.loading = false;

                // Intentar crear el gráfico de todos modos con los datos que tengamos
                setTimeout(() => {
                  this.createPaymentsChart();
                }, 100);
              }
            },
          });
        });
      },
      error: (error) => {
        this.error =
          'Error al cargar tus créditos. Por favor, intenta nuevamente más tarde.';
        this.loading = false;
        console.error('Error al cargar créditos', error);

        // Intentar crear el gráfico de todos modos con los datos que tengamos
        setTimeout(() => {
          this.createPaymentsChart();
        }, 100);
      },
    });
  }

  setPestanaDeuda(tipo: 'FIADO' | 'CREDITO' | 'CONTADO'): void {
    this.pestanaActivaDeuda = tipo;
  }

  get cuotasFiadoPendientes(): any[] {
    return [...this.cuotasPendientes, ...this.cuotasVencidas].filter((c) => c.tipoVenta === 'FIADO');
  }

  get cuotasCreditoPendientes(): any[] {
    return [...this.cuotasPendientes, ...this.cuotasVencidas].filter((c) => c.tipoVenta !== 'FIADO');
  }

  get comprasContado(): any[] {
    return this.ventas.filter((v) => v.tipoVenta === 'CONTADO');
  }

  obtenerProximasCuotas(): any[] {
    // Ordenar cuotas pendientes por fecha de vencimiento
    return this.cuotasPendientes
      .sort(
        (a, b) =>
          new Date(a.fechaVencimiento).getTime() -
          new Date(b.fechaVencimiento).getTime()
      )
      .slice(0, 3); // Mostrar solo las 3 próximas
  }

  calcularTotalDeuda(): number {
    return this.calcularDeudaCredito() + this.calcularDeudaFiado();
  }

  calcularDeudaCredito(): number {
    let total = 0;
    [...this.cuotasPendientes, ...this.cuotasVencidas].forEach((cuota) => {
      if (cuota.tipoVenta !== 'FIADO') {
        const monto = typeof cuota.monto === 'number' ? cuota.monto : parseFloat(cuota.monto);
        if (!isNaN(monto)) total += monto;
      }
    });
    return total;
  }

  calcularDeudaFiado(): number {
    let total = 0;
    [...this.cuotasPendientes, ...this.cuotasVencidas].forEach((cuota) => {
      if (cuota.tipoVenta === 'FIADO') {
        const monto = typeof cuota.monto === 'number' ? cuota.monto : parseFloat(cuota.monto);
        if (!isNaN(monto)) total += monto;
      }
    });
    return total;
  }

  calcularTotalFiado(): number {
    return this.ventas
      .filter((v) => v.tipoVenta === 'FIADO')
      .reduce((sum, v) => sum + (Number(v.montoTotal) || 0), 0);
  }

  calcularPagadoFiado(): number {
    const total = this.calcularTotalFiado();
    const pendiente = this.calcularDeudaFiado();
    return Math.max(0, total - pendiente);
  }

  calcularTotalCredito(): number {
    return this.ventas
      .filter((v) => v.tipoVenta === 'CREDITO')
      .reduce((sum, v) => sum + (Number(v.montoTotal) || 0), 0);
  }

  calcularPagadoCredito(): number {
    const total = this.calcularTotalCredito();
    const pendiente = this.calcularDeudaCredito();
    return Math.max(0, total - pendiente);
  }

  calcularTotalComprasMonto(): number {
    return this.ventas.reduce((sum, v) => sum + (Number(v.montoTotal) || 0), 0);
  }

  calcularTotalPagadoHistorico(): number {
    let total = 0;
    // Compras al contado siempre están pagadas al 100%
    this.ventas.forEach((v) => {
      if (v.tipoVenta === 'CONTADO' || v.estado === 'PAGADO') {
        total += Number(v.montoTotal) || 0;
      } else if (v.totalPagado) {
        total += Number(v.totalPagado) || 0;
      }
    });
    // O cuotas pagadas
    if (total === 0 && this.cuotasPagadas.length > 0) {
      total = this.cuotasPagadas.reduce((sum, c) => sum + (Number(c.monto) || 0), 0);
    }
    return total;
  }



  // Método para crear el gráfico
  createPaymentsChart(): void {
    const canvas = document.getElementById(
      'paymentsChart'
    ) as HTMLCanvasElement;
    if (!canvas) {
      console.error('No se encontró el elemento canvas para el gráfico');
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('No se pudo obtener el contexto 2D del canvas');
      return;
    }

    // Limpiar gráfico anterior si existe
    const existingChart = Chart.getChart('paymentsChart');
    if (existingChart) {
      existingChart.destroy();
    }

    // Preparar datos (inicializar arrays con ceros)
    const paidData = Array(12).fill(0);
    const pendingData = Array(12).fill(0);

    console.log('Procesando datos para el gráfico:');
    console.log('Cuotas pagadas:', this.cuotasPagadas.length);
    console.log('Cuotas pendientes:', this.cuotasPendientes.length);
    console.log('Cuotas vencidas:', this.cuotasVencidas.length);

    // Procesar datos de cuotas pagadas
    this.cuotasPagadas.forEach((cuota) => {
      try {
        // Asegúrate de que la fecha es un objeto Date
        const fechaPago = new Date(cuota.fechaPago || cuota.fechaVencimiento);
        if (isNaN(fechaPago.getTime())) {
          console.warn('Fecha inválida para cuota pagada:', cuota);
          return; // Saltar esta cuota
        }

        const month = fechaPago.getMonth();
        const monto =
          typeof cuota.monto === 'number'
            ? cuota.monto
            : parseFloat(cuota.monto);

        if (isNaN(monto)) {
          console.warn('Monto inválido para cuota pagada:', cuota);
          return; // Saltar esta cuota
        }

        paidData[month] += monto;
      } catch (error) {
        console.error('Error procesando cuota pagada:', error, cuota);
      }
    });

    // Procesar datos de cuotas pendientes y vencidas
    [...this.cuotasPendientes, ...this.cuotasVencidas].forEach((cuota) => {
      try {
        const fechaVencimiento = new Date(cuota.fechaVencimiento);
        if (isNaN(fechaVencimiento.getTime())) {
          console.warn('Fecha inválida para cuota pendiente/vencida:', cuota);
          return; // Saltar esta cuota
        }

        const month = fechaVencimiento.getMonth();
        const monto =
          typeof cuota.monto === 'number'
            ? cuota.monto
            : parseFloat(cuota.monto);

        if (isNaN(monto)) {
          console.warn('Monto inválido para cuota pendiente/vencida:', cuota);
          return; // Saltar esta cuota
        }

        pendingData[month] += monto;
      } catch (error) {
        console.error(
          'Error procesando cuota pendiente/vencida:',
          error,
          cuota
        );
      }
    });

    // Ver datos finales
    console.log('Datos para el gráfico:');
    console.log('Datos pagados:', paidData);
    console.log('Datos pendientes:', pendingData);

    // Crear gráfico
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: [
          'Ene',
          'Feb',
          'Mar',
          'Abr',
          'May',
          'Jun',
          'Jul',
          'Ago',
          'Sep',
          'Oct',
          'Nov',
          'Dic',
        ],
        datasets: [
          {
            label: 'Pagos Realizados',
            data: paidData,
            backgroundColor: 'rgba(46, 204, 113, 0.7)',
            borderColor: '#2ecc71',
            borderWidth: 2,
            borderRadius: 4,
            barPercentage: 0.6,
            categoryPercentage: 0.7,
          },
          {
            label: 'Pagos Pendientes',
            data: pendingData,
            backgroundColor: 'rgba(243, 156, 18, 0.7)',
            borderColor: '#f39c12',
            borderWidth: 2,
            borderRadius: 4,
            barPercentage: 0.6,
            categoryPercentage: 0.7,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            grid: {
              display: false,
            },
            ticks: {
              color: '#ecf0f1',
            },
          },
          y: {
            beginAtZero: true,
            grid: {
              color: 'rgba(255, 255, 255, 0.1)',
            },
            ticks: {
              color: '#ecf0f1',
            },
          },
        },
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: '#ecf0f1',
              padding: 15,
              font: {
                size: 12,
              },
            },
          },
          title: {
            display: false,
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            titleFont: {
              size: 14,
            },
            bodyFont: {
              size: 13,
            },
            callbacks: {
              label: function (tooltipItem) {
                const value = tooltipItem.raw as number;
                return `S/. ${value.toFixed(2)}`;
              },
            },
          },
        },
      },
    });
  }
}
