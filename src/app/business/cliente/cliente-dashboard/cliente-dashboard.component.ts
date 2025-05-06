import { Component, OnInit } from '@angular/core';
import { VentaService } from '../../../shared/services/venta.service';
import { CreditoService } from '../../../shared/services/credito.service';
import { AuthService } from '../../../shared/services/auth.service';
import { ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { UserService } from '../../../shared/services/user.service';

@Component({
  selector: 'app-cliente-dashboard',
  imports: [ReactiveFormsModule, CommonModule, RouterLink],
  templateUrl: './cliente-dashboard.component.html',
  styleUrls: ['./cliente-dashboard.component.css'],
})
export class ClienteDashboardComponent implements OnInit {
  ventas: any[] = [];
  creditos: any[] = [];
  cuotasPendientes: any[] = [];
  cuotasVencidas: any[] = [];
  loading = true;
  error = '';

  constructor(
    private ventaService: VentaService,
    private creditoService: CreditoService,
    private userService : UserService
  ) {}

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos(): void {
    this.loading = true;
    this.userService.userProfile().subscribe({
      next: profile => {
        const clienteId = profile.id;
        this.ventaService.obtenerVentasPorCliente(clienteId).subscribe({
          next: ventas => {
            this.ventas = ventas;
            this.cargarCreditos(clienteId);
            this.loading = false;
          },
          error: err => {
            this.error = 'Error al cargar ventas';
            this.loading = false;
          }
        });
      },
      error: err => {
        this.error = 'Error al obtener perfil de usuario';
        this.loading = false;
      }
    });
  }

  cargarCreditos(clienteId: number): void {
    this.creditoService.obtenerCreditosPorCliente(clienteId).subscribe({
      next : (creditos) => {
        this.creditos = creditos;

        // Cargar cuotas para cada crédito
        this.creditos.forEach((credito) => {
          this.creditoService.obtenerCuotasPorCredito(credito.id).subscribe(
            (cuotas) => {
              // Filtrar cuotas pendientes y vencidas
              const pendientes = cuotas.filter((c) => c.estado === 'PENDIENTE');
              const vencidas = cuotas.filter((c) => c.estado === 'VENCIDO');

              this.cuotasPendientes = [...this.cuotasPendientes, ...pendientes];
              this.cuotasVencidas = [...this.cuotasVencidas, ...vencidas];

              this.loading = false;
            },
            (error) => {
              console.error('Error al cargar cuotas', error);
              this.loading = false;
            }
          );
        });
      },
      error : (error) => {
        this.error = 'Error al cargar créditos';
        this.loading = false;
        console.error('Error al cargar créditos', error);
      }
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
      total += cuota.monto;
    });
    return total;
  }
}
