import { Component, OnInit, AfterViewInit } from '@angular/core';
import { VentaService } from '../../../shared/services/venta.service';
import { CreditoService } from '../../../shared/services/credito.service';
import { AuthService } from '../../../shared/services/auth.service';
import { ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { UserService } from '../../../shared/services/user.service';
import { Chart, registerables } from 'chart.js';

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
  loading = true;
  error = '';
  paymentsChart: any;
  currentYear = new Date().getFullYear();

  constructor(
    private ventaService: VentaService,
    private creditoService: CreditoService,
    private userService: UserService
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

    this.userService.userProfile().subscribe({
      next: (profile) => {
        const clienteId = profile.id;
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
              // Filtrar cuotas pendientes y vencidas
              const pendientes = cuotas.filter((c) => c.estado === 'PENDIENTE');
              const vencidas = cuotas.filter((c) => c.estado === 'VENCIDO');
              const pagadas = cuotas.filter((c) => c.estado === 'PAGADO');

              // Agregar información del crédito a cada cuota para mejor referencia
              pendientes.forEach(
                (cuota) => (cuota.numeroCuota = credito.numeroCuotas || '-')
              );
              vencidas.forEach(
                (cuota) => (cuota.numeroCuota = credito.numeroCuotas || '-')
              );
              pagadas.forEach(
                (cuota) => (cuota.numeroCuota = credito.numeroCuotas || '-')
              );

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
    let total = 0;
    // Sumar todas las cuotas pendientes y vencidas
    [...this.cuotasPendientes, ...this.cuotasVencidas].forEach((cuota) => {
      const monto =
        typeof cuota.monto === 'number' ? cuota.monto : parseFloat(cuota.monto);
      if (!isNaN(monto)) {
        total += monto;
      }
    });
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
