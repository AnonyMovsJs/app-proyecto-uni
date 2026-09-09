import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { UserService } from '../../../shared/services/user.service';
import { VentaService } from '../../../shared/services/venta.service';
import { CreditoService } from '../../../shared/services/credito.service';
import { PagoService } from '../../../shared/services/pago.service';
import { Chart, registerables } from 'chart.js';

@Component({
  selector: 'app-admin-usuario-detalle',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './admin-usuario-detalle.component.html',
  styleUrls: ['./admin-usuario-detalle.component.css'],
})
export class AdminUsuarioDetalleComponent implements OnInit {
  userId!: number;
  user: any = {};
  ventas: any[] = [];
  creditos: any[] = [];
  pagos: any[] = [];
  cuotas: any[] = [];

  // Para transacciones recientes combinadas
  transaccionesRecientes: any[] = [];

  // Contadores para cuotas
  cuotasPendientesCount = 0;
  cuotasVencidasCount = 0;
  cuotasPagadasCount = 0;

  // Estadísticas del usuario
  totalCompras = 0;
  totalGastado = 0;
  totalDeuda = 0;
  totalPagado = 0;

  // Estado de la página
  loading = true;
  error = '';
  activeTab = 'perfil'; // 'perfil', 'compras', 'creditos', 'pagos'

  modalComprobanteVisible = false;
  comprobanteSeleccionadoUrl = '';
  pagoSeleccionado: any = null;

  verFotoComprobante(pago: any): void {
    if (typeof pago === 'string') {
      this.comprobanteSeleccionadoUrl = pago;
      this.pagoSeleccionado = null;
    } else {
      this.comprobanteSeleccionadoUrl = pago.comprobanteUrl;
      this.pagoSeleccionado = pago;
    }
    this.modalComprobanteVisible = true;
  }

  cerrarModalComprobante(): void {
    this.modalComprobanteVisible = false;
    this.comprobanteSeleccionadoUrl = '';
    this.pagoSeleccionado = null;
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private userService: UserService,
    private ventaService: VentaService,
    private creditoService: CreditoService,
    private pagoService: PagoService
  ) {
    Chart.register(...registerables);
  }

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      this.userId = +params['id'];
      this.cargarDatosUsuario();
    });

    this.route.queryParams.subscribe((queryParams) => {
      if (queryParams['tab']) {
        this.setActiveTab(queryParams['tab']);
      }
    });
  }

  cargarDatosUsuario(): void {
    this.loading = true;
    this.error = '';
    this.cuotas = [];
    this.pagos = [];
    this.creditos = [];
    this.ventas = [];

    this.userService.findById(this.userId).subscribe({
      next: (user) => {
        this.user = user;
        this.cargarVentas();
      },
      error: (err) => {
        console.error('Error al cargar usuario:', err);
        this.error =
          'No se pudo cargar la información del usuario. Por favor, intente nuevamente.';
        this.loading = false;
      },
    });
  }

  cargarVentas(): void {
    this.ventaService.obtenerVentasPorCliente(this.userId).subscribe({
      next: (ventas) => {
        this.ventas = ventas;
        this.totalCompras = ventas.length;
        this.totalGastado = ventas.reduce(
          (total, venta) => total + parseFloat(venta.montoTotal.toString()),
          0
        );
        this.cargarCreditos();
      },
      error: (err) => {
        console.error('Error al cargar ventas:', err);
        this.cargarCreditos(); // Continuamos cargando el resto de datos
      },
    });
  }

  cargarCreditos(): void {
    this.creditoService.obtenerCreditosPorCliente(this.userId).subscribe({
      next: (creditos) => {
        this.creditos = creditos;

        // Procesar cada crédito para obtener sus cuotas
        if (creditos.length > 0) {
          let creditosProcesados = 0;

          creditos.forEach((credito) => {


            this.creditoService.obtenerCuotasPorCredito(credito.id).subscribe({
              next: (cuotas) => {
                // Añadir información del crédito a cada cuota
                cuotas.forEach((cuota) => {
                  cuota.credito_id = credito.id;
                  this.cuotas.push(cuota);
                });

                // Actualizar contadores
                this.actualizarContadoresCuotas();

                // Calcular deuda total (suma de cuotas pendientes y vencidas)
                this.calcularDeudaTotal();

                creditosProcesados++;
                if (creditosProcesados === creditos.length) {
                  this.cargarPagos();
                }
              },
              error: (err) => {
                console.error('Error al cargar cuotas:', err);
                creditosProcesados++;
                if (creditosProcesados === creditos.length) {
                  this.cargarPagos();
                }
              },
            });
          });
        } else {
          this.cargarPagos();
        }
      },
      error: (err) => {
        console.error('Error al cargar créditos:', err);
        this.cargarPagos(); // Continuamos cargando el resto de datos
      },
    });
  }

  cargarPagos(): void {
    this.pagoService.obtenerPagosPorCliente(this.userId).subscribe({
      next: (pagos) => {
        this.pagos = pagos;
        this.totalPagado = pagos.reduce(
          (total, pago) => total + parseFloat(pago.monto.toString()),
          0
        );

        // Preparar transacciones recientes
        this.prepararTransaccionesRecientes();

        this.loading = false;

        // Crear gráficos después de que los datos estén cargados
        setTimeout(() => {
          this.createComprasChart();
          this.createPagosChart();
        }, 300);
      },
      error: (err) => {
        console.error('Error al cargar pagos:', err);
        this.loading = false;
      },
    });
  }

  // Método para actualizar contadores de cuotas
  actualizarContadoresCuotas(): void {
    this.cuotasPendientesCount = 0;
    this.cuotasVencidasCount = 0;
    this.cuotasPagadasCount = 0;

    this.cuotas.forEach((cuota) => {
      if (cuota.estado === 'PENDIENTE') {
        this.cuotasPendientesCount++;
      } else if (cuota.estado === 'VENCIDO') {
        this.cuotasVencidasCount++;
      } else if (cuota.estado === 'PAGADO') {
        this.cuotasPagadasCount++;
      }
    });
  }

  // Método para calcular la deuda total
  calcularDeudaTotal(): void {
    this.totalDeuda = 0;

    this.cuotas.forEach((cuota) => {
      if (cuota.estado === 'PENDIENTE' || cuota.estado === 'VENCIDO') {
        this.totalDeuda += parseFloat(cuota.monto.toString());
      }
    });
  }

  // Método para preparar transacciones recientes
  prepararTransaccionesRecientes(): void {
    // Combinar ventas y pagos
    let transacciones = [];

    // Agregar ventas
    for (let i = 0; i < this.ventas.length; i++) {
      transacciones.push({
        tipo: 'venta',
        fecha: new Date(this.ventas[i].fechaVenta),
        datos: this.ventas[i],
      });
    }

    // Agregar pagos
    for (let i = 0; i < this.pagos.length; i++) {
      transacciones.push({
        tipo: 'pago',
        fecha: new Date(this.pagos[i].fecha_pago),
        datos: this.pagos[i],
      });
    }

    // Ordenar por fecha (más reciente primero)
    transacciones.sort((a, b) => b.fecha.getTime() - a.fecha.getTime());

    // Limitar a las 5 más recientes
    this.transaccionesRecientes = transacciones.slice(0, 5);
  }

  // Método para obtener cuotas por crédito
  getCuotasPorCredito(creditoId: number): any[] {
    return this.cuotas.filter((cuota) => cuota.credito_id === creditoId);
  }

  setActiveTab(tab: string): void {
    this.activeTab = tab;

    // Recrear gráficos cuando se cambia a la pestaña perfil
    if (tab === 'perfil') {
      setTimeout(() => {
        this.createComprasChart();
        this.createPagosChart();
      }, 300);
    }
  }

  // Crear gráfico de compras por mes
  createComprasChart(): void {
    const canvas = document.getElementById('comprasChart') as HTMLCanvasElement;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Limpiar gráfico anterior si existe
    const existingChart = Chart.getChart('comprasChart');
    if (existingChart) {
      existingChart.destroy();
    }

    // Inicializar arrays para los datos mensuales
    const months = [
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
    ];
    const contadoData = Array(12).fill(0);
    const creditoData = Array(12).fill(0);

    // Agrupar ventas por mes y tipo
    this.ventas.forEach((venta) => {
      const fechaVenta = new Date(venta.fechaVenta);
      const month = fechaVenta.getMonth();

      if (venta.tipoVenta === 'CONTADO') {
        contadoData[month] += parseFloat(venta.montoTotal.toString());
      } else {
        creditoData[month] += parseFloat(venta.montoTotal.toString());
      }
    });

    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: months,
        datasets: [
          {
            label: 'Contado',
            data: contadoData,
            backgroundColor: 'rgba(46, 204, 113, 0.7)',
            borderColor: '#2ecc71',
            borderWidth: 2,
            borderRadius: 4,
            barPercentage: 0.6,
            categoryPercentage: 0.7,
          },
          {
            label: 'Crédito',
            data: creditoData,
            backgroundColor: 'rgba(52, 152, 219, 0.7)',
            borderColor: '#3498db',
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
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            titleFont: {
              size: 14,
            },
            bodyFont: {
              size: 13,
            },
          },
        },
      },
    });
  }

  // Crear gráfico de estado de pagos
  createPagosChart(): void {
    const canvas = document.getElementById('pagosChart') as HTMLCanvasElement;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Limpiar gráfico anterior si existe
    const existingChart = Chart.getChart('pagosChart');
    if (existingChart) {
      existingChart.destroy();
    }

    // Calcular montos por estado
    let pagadosAmount = 0;
    let pendientesAmount = 0;
    let vencidosAmount = 0;

    for (let i = 0; i < this.cuotas.length; i++) {
      const monto = parseFloat(this.cuotas[i].monto.toString());
      if (this.cuotas[i].estado === 'PAGADO') {
        pagadosAmount += monto;
      } else if (this.cuotas[i].estado === 'PENDIENTE') {
        pendientesAmount += monto;
      } else if (this.cuotas[i].estado === 'VENCIDO') {
        vencidosAmount += monto;
      }
    }

    new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Pagados', 'Pendientes', 'Vencidos'],
        datasets: [
          {
            data: [pagadosAmount, pendientesAmount, vencidosAmount],
            backgroundColor: [
              'rgba(46, 204, 113, 0.7)',
              'rgba(243, 156, 18, 0.7)',
              'rgba(231, 76, 60, 0.7)',
            ],
            borderColor: ['#2ecc71', '#f39c12', '#e74c3c'],
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
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
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            titleFont: {
              size: 14,
            },
            bodyFont: {
              size: 13,
            },
            callbacks: {
              label: function (context) {
                const value = context.raw as number;
                return `S/. ${value.toFixed(2)}`;
              },
            },
          },
        },
      },
    });
  }

  // Helpers para obtener clases y estilos
  getEstadoClass(estado: string): string {
    switch (estado) {
      case 'PAGADO':
        return 'bg-success';
      case 'PENDIENTE':
        return 'bg-warning';
      case 'VENCIDO':
        return 'bg-danger';
      default:
        return 'bg-secondary';
    }
  }

  getTipoVentaClass(tipo: string): string {
    return tipo === 'CONTADO' ? 'bg-success' : 'bg-primary';
  }

  getStatusClass(estado: boolean): string {
    return estado ? 'bg-success' : 'bg-danger';
  }

  getStatusText(estado: boolean): string {
    return estado ? 'Activo' : 'Inactivo';
  }

  // Formatear fechas y valores
  formatDate(date: string): string {
    if (!date) return 'N/A';
    try {
      return new Date(date).toLocaleDateString('es-ES');
    } catch (error) {
      return 'N/A';
    }
  }

  formatCurrency(value: number): string {
    if (value === undefined || value === null) return 'S/. 0.00';
    try {
      return `S/. ${parseFloat(value.toString()).toFixed(2)}`;
    } catch (error) {
      return 'S/. 0.00';
    }
  }

  // Método para cambiar el estado del usuario
  cambiarEstadoUsuario(): void {
    this.userService.deleteUser(this.userId).subscribe({
      next: () => {
        // Actualizar el estado del usuario en el objeto local
        this.user.estado = !this.user.estado;
      },
      error: (err) => {
        console.error('Error al cambiar estado de usuario:', err);
      },
    });
  }


}
