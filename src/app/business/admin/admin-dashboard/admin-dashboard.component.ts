// src/app/business/admin/admin-dashboard/admin-dashboard.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

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
export class AdminDashboardComponent implements OnInit {
  totalUsers = 0;
  usersWithSales = 0;
  usersWithCredit = 0;
  usersAllCreditPaid = 0;

  recentSales: any[] = [];

  loading = true;
  error = '';

  constructor(
    private userService: UserService,
    private creditoService: CreditoService,
    private ventaService: VentaService
  ) {}

  ngOnInit(): void {
    this.loadDashboard();
  }

  private loadDashboard(): void {
    this.loading = true;
    this.userService.findAll().subscribe({
      next: (users) => {
        this.totalUsers = users.length;

        // Acumuladores y control de finalización
        const allVentas: any[] = [];
        let processedUsers = 0;

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
                  }
                },
                error: (err) => console.error('Créditos usuario', user.id, err),
                complete: () => {
                  // Una vez procesados ventas + créditos de este usuario:
                  processedUsers++;
                  if (processedUsers === users.length) {
                    // Todas las suscripciones terminadas: calcular recentSales
                    this.recentSales = allVentas
                      .sort(
                        (a, b) =>
                          new Date(b.fechaVenta).getTime() -
                          new Date(a.fechaVenta).getTime()
                      )
                      .slice(0, 5);
                    this.loading = false;
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
              }
            },
          });
        });
      },
      error: (err) => {
        console.error('Usuarios', err);
        this.error = 'Error al cargar usuarios';
        this.loading = false;
      },
    });
  }
}
