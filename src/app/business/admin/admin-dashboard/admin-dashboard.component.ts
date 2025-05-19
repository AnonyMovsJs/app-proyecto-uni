import {
  ChangeDetectorRef,
  Component,
  OnInit,
  AfterViewInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Chart, registerables } from 'chart.js';

import { UserService } from '../../../shared/services/user.service';
import { CreditoService } from '../../../shared/services/credito.service';
import { VentaService } from '../../../shared/services/venta.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css'],
})
export class AdminDashboardComponent implements OnInit, AfterViewInit {
  totalUsers = 0;
  usersWithSales = 0;
  usersWithCredit = 0;
  usersAllCreditPaid = 0;

  recentSales: any[] = [];
  allSales: any[] = [];
  allCuotas: any[] = [];

  loading = true;
  error = '';

  // Para acceder al componente desde fuera
  constructor(
    private userService: UserService,
    private creditoService: CreditoService,
    private ventaService: VentaService,
    private cdr: ChangeDetectorRef
  ) {
    // Hacemos que el componente sea accesible desde fuera para el botón refresh
    (window as any).angularComponentRef = this;
  }

  ngOnInit(): void {
    // Registrar componentes de Chart.js
    Chart.register(...registerables);

    this.loadDashboard();
  }

  ngAfterViewInit(): void {
    // Nos aseguramos que los gráficos se creen correctamente después de que el DOM esté listo
    if (!this.loading && !this.error) {
      setTimeout(() => {
        this.createCharts();
      }, 300);
    }
  }

  private loadDashboard(): void {
    this.loading = true;
    this.userService.findAll().subscribe({
      next: (users) => {
        this.totalUsers = users.length;

        // Acumuladores y control de finalización
        const allVentas: any[] = [];
        const allCuotas: any[] = [];
        let processedUsers = 0;

        // Si no hay usuarios, finalizar inmediatamente
        if (users.length === 0) {
          this.loading = false;
          this.cdr.detectChanges();
          return;
        }

        users.forEach((user) => {
          // 1) Ventas por usuario
          this.ventaService.obtenerVentasPorCliente(user.id).subscribe({
            next: (ventas) => {
              if (ventas.length > 0) {
                this.usersWithSales++;
                ventas.forEach((v) => allVentas.push({ ...v, cliente: user }));
              }

              // 2) Créditos por usuario
              this.creditoService.obtenerCreditosPorCliente(user.id).subscribe({
                next: (creditos) => {
                  if (creditos.length > 0) {
                    this.usersWithCredit++;
                    // ¿Todos pagados?
                    if (creditos.every((c) => c.estado === 'PAGADO')) {
                      this.usersAllCreditPaid++;
                    }

                    // Obtener cuotas para cada crédito
                    creditos.forEach((credito) => {
                      this.creditoService
                        .obtenerCuotasPorCredito(credito.id)
                        .subscribe({
                          next: (cuotas) => {
                            cuotas.forEach((cuota) => {
                              allCuotas.push({
                                ...cuota,
                                credito,
                                cliente: user,
                              });
                            });
                          },
                          error: (err) =>
                            console.error('Error al obtener cuotas', err),
                        });
                    });
                  }
                },
                error: (err) => console.error('Créditos usuario', user.id, err),
                complete: () => {
                  // Una vez procesados ventas + créditos de este usuario:
                  processedUsers++;
                  if (processedUsers === users.length) {
                    // Todas las suscripciones terminadas: actualizar datos
                    this.allSales = allVentas;
                    this.allCuotas = allCuotas;

                    // Calcular recientes
                    this.recentSales = allVentas
                      .sort(
                        (a, b) =>
                          new Date(b.fechaVenta).getTime() -
                          new Date(a.fechaVenta).getTime()
                      )
                      .slice(0, 5);

                    // Marcar como cargado
                    this.loading = false;

                    // Forzar una detección de cambios para asegurar que el DOM se actualice
                    this.cdr.detectChanges();

                    // Esperar un poco para que el DOM se actualice completamente
                    setTimeout(() => {
                      try {
                        this.createCharts();
                        console.log('Gráficos creados exitosamente');
                      } catch (error) {
                        console.error('Error al crear gráficos:', error);
                      }
                    }, 300);
                  }
                },
              });
            },
            error: (err) => {
              console.error('Ventas usuario', user.id, err);
              // avanzar igualmente
              processedUsers++;
              if (processedUsers === users.length) {
                this.loading = false;
                this.cdr.detectChanges();
              }
            },
          });
        });
      },
      error: (err) => {
        console.error('Usuarios', err);
        this.error = 'Error al cargar usuarios. Intente nuevamente más tarde.';
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  // Método para crear todos los gráficos juntos
  private createCharts(): void {
    try {
      this.createSalesDistributionChart();
      this.createMonthlyIncomeChart();
      this.createPaymentStatusChart();
    } catch (error) {
      console.error('Error al crear gráficos:', error);
    }
  }

  // 1. Distribución de ventas por tipo (Contado vs Crédito)
  createSalesDistributionChart(): void {
    const canvas = document.getElementById(
      'salesDistributionChart'
    ) as HTMLCanvasElement;
    if (!canvas) {
      console.error('Canvas no encontrado: salesDistributionChart');
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Limpiar gráfico anterior si existe
    const existingChart = Chart.getChart('salesDistributionChart');
    if (existingChart) {
      existingChart.destroy();
    }

    // Contar ventas por tipo
    const contadoCount = this.allSales.filter(
      (v) => v.tipoVenta === 'CONTADO'
    ).length;
    const creditoCount = this.allSales.filter(
      (v) => v.tipoVenta === 'CREDITO'
    ).length;

    // Calcular montos por tipo
    const contadoAmount = this.allSales
      .filter((v) => v.tipoVenta === 'CONTADO')
      .reduce((sum, v) => sum + parseFloat(v.montoTotal), 0);

    const creditoAmount = this.allSales
      .filter((v) => v.tipoVenta === 'CREDITO')
      .reduce((sum, v) => sum + parseFloat(v.montoTotal), 0);

    new Chart(ctx, {
      type: 'pie',
      data: {
        labels: ['Contado', 'Crédito'],
        datasets: [
          {
            data: [contadoAmount, creditoAmount],
            backgroundColor: [
              'rgba(46, 204, 113, 0.7)',
              'rgba(52, 152, 219, 0.7)',
            ],
            borderColor: ['#2ecc71', '#3498db'],
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
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
                const dataset = tooltipItem.dataset;
                const total = dataset.data.reduce(
                  (sum: number, val: number) => sum + val,
                  0
                );
                const value = dataset.data[tooltipItem.dataIndex] as number;
                const percentage = Math.round((value / total) * 100);
                return `S/. ${value.toFixed(2)} (${percentage}%)`;
              },
            },
          },
        },
      },
    });
  }

  // 2. Ingresos mensuales
  createMonthlyIncomeChart(): void {
    const canvas = document.getElementById(
      'monthlyIncomeChart'
    ) as HTMLCanvasElement;
    if (!canvas) {
      console.error('Canvas no encontrado: monthlyIncomeChart');
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Limpiar gráfico anterior si existe
    const existingChart = Chart.getChart('monthlyIncomeChart');
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
    this.allSales.forEach((venta) => {
      const fechaVenta = new Date(venta.fechaVenta);
      const month = fechaVenta.getMonth();

      if (venta.tipoVenta === 'CONTADO') {
        contadoData[month] += parseFloat(venta.montoTotal);
      } else {
        creditoData[month] += parseFloat(venta.montoTotal);
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
              /* drawBorder: false, */
            },
            ticks: {
              color: '#ecf0f1',
            },
          },
          y: {
            beginAtZero: true,
            grid: {
              color: 'rgba(255, 255, 255, 0.1)',
              /* drawBorder: false, */
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
          },
        },
      },
    });
  }

  // 3. Estado de pagos (Pagados, Pendientes, Vencidos)
  createPaymentStatusChart(): void {
    const canvas = document.getElementById(
      'paymentStatusChart'
    ) as HTMLCanvasElement;
    if (!canvas) {
      console.error('Canvas no encontrado: paymentStatusChart');
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Limpiar gráfico anterior si existe
    const existingChart = Chart.getChart('paymentStatusChart');
    if (existingChart) {
      existingChart.destroy();
    }

    // Contar cuotas por estado
    const pagados = this.allCuotas.filter((c) => c.estado === 'PAGADO').length;
    const pendientes = this.allCuotas.filter(
      (c) => c.estado === 'PENDIENTE'
    ).length;
    const vencidos = this.allCuotas.filter(
      (c) => c.estado === 'VENCIDO'
    ).length;

    // Calcular montos por estado
    const pagadosAmount = this.allCuotas
      .filter((c) => c.estado === 'PAGADO')
      .reduce((sum, c) => sum + parseFloat(c.monto), 0);

    const pendientesAmount = this.allCuotas
      .filter((c) => c.estado === 'PENDIENTE')
      .reduce((sum, c) => sum + parseFloat(c.monto), 0);

    const vencidosAmount = this.allCuotas
      .filter((c) => c.estado === 'VENCIDO')
      .reduce((sum, c) => sum + parseFloat(c.monto), 0);

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
                const dataset = tooltipItem.dataset;
                const total = dataset.data.reduce(
                  (sum: number, val: number) => sum + val,
                  0
                );
                const value = dataset.data[tooltipItem.dataIndex] as number;
                const percentage = Math.round((value / total) * 100);
                return `S/. ${value.toFixed(2)} (${percentage}%)`;
              },
            },
          },
        },
      },
    });
  }

  // Método público para refrescar el dashboard desde fuera (botón)
  refreshDashboard(): void {
    this.loadDashboard();
  }
}
