import { Component, OnInit } from '@angular/core';

import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';

import { UserService } from '../../../shared/services/user.service';
import { CreditoService } from '../../../shared/services/credito.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css'],
})
export class AdminDashboardComponent implements OnInit {
  usersWithDebt: any[] = [];
  loading = true;
  error = '';

  constructor(
    private userService: UserService,
    private creditoService: CreditoService
  ) {}

  ngOnInit(): void {
    this.loading = true;
    this.userService.findAll().subscribe({
      next: users => {
        // For each user, fetch their credits and compute debt summary
        const observables = users.map(user =>
          this.creditoService.obtenerCreditosPorCliente(user.id).pipe(
            map(creditos => {
              let totalDebt = 0;
              let paidCredits = 0;
              creditos.forEach(credito => {
                totalDebt += Number(credito.monto_total);
                if (credito.estado === 'PAGADO') paidCredits++;
              });
              return {
                user,
                creditos,
                totalDebt,
                totalCredits: creditos.length,
                paidCredits,
                pendingCredits: creditos.filter(c => c.estado !== 'PAGADO').length
              };
            })
        ));


        forkJoin(observables).subscribe({
          next: results => {
            this.usersWithDebt = results;
            this.loading = false;
          },
          error: err => {
            console.error('Error al cargar créditos de usuarios', err);
            this.error = 'Error al cargar datos del dashboard';
            this.loading = false;
          }
        });
      },
      error: err => {
        console.error('Error al cargar usuarios', err);
        this.error = 'Error al cargar usuarios';
        this.loading = false;
      }
    });
  }
}
