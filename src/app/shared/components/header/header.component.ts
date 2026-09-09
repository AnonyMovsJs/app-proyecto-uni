import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import Swal from 'sweetalert2';

import { AuthService } from '../../services/auth.service';
import { UserService } from '../../services/user.service';
import { NotificacionService } from '../../services/notificacion.service';
import { Notificacion } from '../../model/notificacion';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './header.component.html',
})
export class HeaderComponent implements OnInit {
  currentUser: any = null;
  isAdmin = false;

  notificaciones: Notificacion[] = [];
  noLeidasCount = 0;

  constructor(
    private authService: AuthService,
    private userService: UserService,
    private notificacionService: NotificacionService
  ) {}

  ngOnInit(): void {
    this.isAdmin = this.authService.isAdmin();

    // Intentar cargar usuario inmediatamente desde sesión
    const stored = this.authService.getCurrentUser();
    if (stored) {
      this.currentUser = stored;
      this.suscribirNotificaciones();
    }

    // Y refrescar con el perfil completo
    this.userService.userProfile().subscribe({
      next: (user) => {
        this.currentUser = user;
        this.suscribirNotificaciones();
      },
      error: (err) => {
        console.warn('No se pudo cargar el perfil para notificaciones en el header', err);
      },
    });
  }

  private suscribirNotificaciones(): void {
    if (!this.currentUser) return;

    // Asegurar recarga fresca desde localStorage
    this.notificacionService.cargarNotificaciones();

    if (this.isAdmin) {
      // El administrador no es deudor: su campana no se llena con alertas de cobranza a clientes
      this.notificaciones = [];
      this.noLeidasCount = 0;
    } else {
      // Para cliente: ve solo las alertas de cobranza dirigidas a él (por ID, EMAIL, DNI o Nombre)
      this.notificacionService.obtenerPorCliente(this.currentUser).subscribe((lista) => {
        this.notificaciones = lista.slice(0, 8);
      });
      this.notificacionService.contarNoLeidas(this.currentUser).subscribe((count) => {
        this.noLeidasCount = count;
      });
    }
  }

  abrirDetalle(notif: Notificacion): void {
    this.notificacionService.marcarComoLeida(notif.id);

    Swal.fire({
      title: notif.titulo,
      html: `
        <div class="text-left" style="font-size: 0.95rem;">
          <p class="mb-3">${notif.mensaje}</p>
          <div class="p-3 my-2 rounded" style="background: rgba(255,255,255,0.08); border-left: 4px solid #f39c12;">
            <p class="mb-1"><strong>Monto pendiente:</strong> <span style="color: #ff6b6b; font-weight: bold;">S/. ${notif.montoDeuda.toFixed(2)}</span></p>
            <p class="mb-1"><strong>Días de retraso:</strong> <span class="badge ${notif.diasRetraso > 30 ? 'badge-danger' : 'badge-warning'} text-dark">${notif.diasRetraso} día(s)</span></p>
            <p class="mb-0"><strong>Vencimiento:</strong> ${new Date(notif.fechaVencimiento).toLocaleDateString()}</p>
          </div>
          <small class="text-muted d-block mt-2">Emitido: ${new Date(notif.fechaEnvio).toLocaleString()}</small>
        </div>
      `,
      icon: notif.diasRetraso > 30 ? 'warning' : 'info',
      confirmButtonText: 'Entendido',
      confirmButtonColor: '#2575fc',
      background: '#1e293b',
      color: '#fff',
    });
  }

  marcarTodasComoLeidas(): void {
    if (!this.currentUser) return;
    if (this.isAdmin) {
      this.notificaciones.forEach((n) => this.notificacionService.marcarComoLeida(n.id));
    } else {
      this.notificacionService.marcarTodasComoLeidas(this.currentUser.id);
    }
  }
}
