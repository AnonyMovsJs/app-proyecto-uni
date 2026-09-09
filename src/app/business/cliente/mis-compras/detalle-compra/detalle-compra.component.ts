import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { VentaService } from '../../../../shared/services/venta.service';
import { CreditoService } from '../../../../shared/services/credito.service';
import { AuthService } from '../../../../shared/services/auth.service';
import { CommonModule, Location } from '@angular/common';
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
    private router: Router,
    private ventaService: VentaService,
    private creditoService: CreditoService,
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
    this.ventaService.obtenerDetallesVenta(this.ventaId).subscribe({
      next: (detalles) => {
        this.detalles = detalles;

        // Si es venta a crédito o fiado, cargar información del crédito
        if (this.venta.tipoVenta === 'CREDITO' || this.venta.tipoVenta === 'FIADO') {
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
}
