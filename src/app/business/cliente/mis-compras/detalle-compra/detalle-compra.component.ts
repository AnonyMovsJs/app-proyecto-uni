import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { VentaService } from '../../../../shared/services/venta.service';
import { CreditoService } from '../../../../shared/services/credito.service';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

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
    private ventaService: VentaService,
    private creditoService: CreditoService
  ) {}

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
    this.ventaService.obtenerDetallesVenta(this.ventaId).subscribe({
      next: (detalles) => {
        this.detalles = detalles;

        // Si es venta a crédito, cargar información del crédito
        if (this.venta.tipoVenta === 'CREDITO') {
          this.cargarCredito();
        } else {
          this.loading = false;
        }
      },
      error: (error) => {
        this.error = 'Error al cargar los detalles de la compra';
        this.loading = false;
        console.error('Error al cargar detalles', error);
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
        this.error = 'Error al cargar información del crédito';
        this.loading = false;
        console.error('Error al cargar crédito', error);
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
      case 'PENDIENTE':
        return '#f39c12'; // Naranja
      case 'VENCIDO':
        return '#e74c3c'; // Rojo
      default:
        return '#95a5a6'; // Gris
    }
  }

  calcularProgresoCredito(): number {
    if (!this.cuotas || this.cuotas.length === 0) {
      return 0;
    }

    const cuotasPagadas = this.cuotas.filter(
      (c) => c.estado === 'PAGADO'
    ).length;
    return (cuotasPagadas / this.cuotas.length) * 100;
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
    if (!this.cuotas || this.cuotas.length === 0) {
      return 0;
    }

    return this.cuotas
      .filter((c) => c.estado === 'PAGADO')
      .reduce((total, cuota) => total + Number(cuota.monto), 0);
  }

  // Calcular el total pendiente por pagar
  calcularTotalPendiente(): number {
    if (!this.cuotas || this.cuotas.length === 0 || !this.credito) {
      return 0;
    }

    return Number(this.credito.montoTotal) - this.calcularTotalPagado();
  }
}
