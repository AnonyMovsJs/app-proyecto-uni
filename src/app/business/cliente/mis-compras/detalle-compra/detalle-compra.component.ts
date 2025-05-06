import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { VentaService } from '../../../../shared/services/venta.service';
import { CreditoService } from '../../../../shared/services/credito.service';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';


@Component({
  selector: 'app-detalle-compra',
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
    this.ventaService.obtenerVenta(this.ventaId).subscribe({
      next : (venta) => {
        this.venta = venta;
        this.cargarDetalles();
      },
      error : (error) => {
        this.error = 'Error al cargar la venta';
        this.loading = false;
        console.error('Error al cargar venta', error);
      }
    });
  }

  cargarDetalles(): void {
    this.ventaService.obtenerDetallesVenta(this.ventaId).subscribe({
      next : (detalles) => {
        this.detalles = detalles;

        // Si es venta a crédito, cargar información del crédito
        if (this.venta.tipoVenta === 'CREDITO') {
          this.cargarCredito();
        } else {
          this.loading = false;
        }
      },
      error : (error) => {
        this.error = 'Error al cargar los detalles de la venta';
        this.loading = false;
        console.error('Error al cargar detalles', error);
      }
    });
  }

  cargarCredito(): void {
    this.creditoService.obtenerCreditoPorVenta(this.ventaId).subscribe({
      next : (credito) => {
        this.credito = credito;
        this.cargarCuotas();
      },
      error : (error) => {
        this.error = 'Error al cargar información del crédito';
        this.loading = false;
        console.error('Error al cargar crédito', error);
      }
    });
  }

  cargarCuotas(): void {
    this.creditoService.obtenerCuotasPorCredito(this.credito.id).subscribe({
      next : (cuotas) => {
        this.cuotas = cuotas;
        this.loading = false;
      },
      error : (error) => {
        this.error = 'Error al cargar las cuotas';
        this.loading = false;
        console.error('Error al cargar cuotas', error);
      }
    });
  }

  obtenerColorEstadoCuota(estado: string): string {
    switch (estado) {
      case 'PAGADO':
        return 'bg-success';
      case 'PENDIENTE':
        return 'bg-warning';
      case 'VENCIDO':
        return 'bg-danger';
      default:
        return '';
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
}
