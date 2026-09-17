import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import Swal from 'sweetalert2';
import { Subscription } from 'rxjs';

import { AuthService } from '../../services/auth.service';
import { UserService } from '../../services/user.service';
import { NotificacionService } from '../../services/notificacion.service';
import { PagoService } from '../../services/pago.service';
import { Notificacion } from '../../model/notificacion';
import { Pago } from '../../model/pago';

export interface NotifItem {
  id: string;
  titulo: string;
  mensaje: string;
  monto: number;
  fecha: Date | string;
  leida: boolean;
  tipo: string;
  comprobanteUrl?: string;
  pagoId?: number;
  metodoPago?: string;
  clienteNombre?: string;
  originalNotif?: Notificacion;
}

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css',
})
export class HeaderComponent implements OnInit, OnDestroy {
  currentUser: any = null;
  isAdmin = false;

  notificaciones: NotifItem[] = [];
  noLeidasCount = 0;

  private subs: Subscription = new Subscription();
  private pollingTimer: any = null;

  constructor(
    private authService: AuthService,
    private userService: UserService,
    private notificacionService: NotificacionService,
    private pagoService: PagoService,
    private router: Router
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
    this.subs.add(
      this.userService.userProfile().subscribe({
        next: (user) => {
          this.currentUser = user;
          this.suscribirNotificaciones();
        },
        error: (err) => {
          console.warn('No se pudo cargar el perfil para notificaciones en el header', err);
        },
      })
    );

    // Si el usuario es admin, escuchar eventos de pagos en tiempo real
    this.subs.add(
      this.pagoService.pagoActualizado$.subscribe(() => {
        if (this.isAdmin) {
          this.cargarNotificacionesAdmin();
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
    }
  }

  private suscribirNotificaciones(): void {
    if (!this.currentUser) return;

    if (this.isAdmin) {
      // Notificaciones para el Administrador: Comprobantes y pagos pendientes por validar
      this.cargarNotificacionesAdmin();

      // Sondeo periódico cada 10 segundos para detectar comprobantes entrantes de clientes
      if (!this.pollingTimer) {
        this.pollingTimer = setInterval(() => {
          this.cargarNotificacionesAdmin();
        }, 10000);
      }
    } else {
      // Para cliente: alertas de cobranza dirigidas a él
      this.notificacionService.cargarNotificaciones();
      this.subs.add(
        this.notificacionService.obtenerPorCliente(this.currentUser).subscribe((lista) => {
          this.notificaciones = lista.slice(0, 8).map((n) => ({
            id: n.id,
            titulo: n.titulo,
            mensaje: n.mensaje,
            monto: n.montoDeuda,
            fecha: n.fechaEnvio,
            leida: n.leida,
            tipo: n.tipo,
            originalNotif: n,
          }));
        })
      );
      this.subs.add(
        this.notificacionService.contarNoLeidas(this.currentUser).subscribe((count) => {
          this.noLeidasCount = count;
        })
      );
    }
  }

  cargarNotificacionesAdmin(): void {
    this.pagoService.listarPagosPendientes().subscribe({
      next: (pagos) => {
        const leidasStorageKey = 'reyes_admin_pagos_leidos';
        let leidosIds: number[] = [];
        try {
          const stored = localStorage.getItem(leidasStorageKey);
          if (stored) leidosIds = JSON.parse(stored);
        } catch (_) {}

        this.notificaciones = pagos.map((p) => {
          const metodo = p.metodoPago || 'YAPE';
          const cliente = p.clienteNombre || 'Cliente';
          const leida = leidosIds.includes(p.id);

          return {
            id: `pago-${p.id}`,
            pagoId: p.id,
            titulo: `Nuevo comprobante (${metodo})`,
            mensaje: `${cliente} envió un pago de S/. ${p.monto.toFixed(2)}`,
            monto: p.monto,
            fecha: p.fechaPago,
            leida: leida,
            tipo: 'PAGO_PENDIENTE',
            comprobanteUrl: p.comprobanteUrl,
            metodoPago: metodo,
            clienteNombre: cliente,
          };
        });

        this.noLeidasCount = this.notificaciones.filter((n) => !n.leida).length;
      },
      error: (err) => {
        console.warn('Error al obtener pagos pendientes para el admin:', err);
      },
    });
  }

  abrirDetalle(notif: NotifItem): void {
    if (this.isAdmin && notif.pagoId) {
      // Marcar como leída para el admin en localStorage
      const leidasStorageKey = 'reyes_admin_pagos_leidos';
      try {
        let leidosIds: number[] = [];
        const stored = localStorage.getItem(leidasStorageKey);
        if (stored) leidosIds = JSON.parse(stored);
        if (!leidosIds.includes(notif.pagoId)) {
          leidosIds.push(notif.pagoId);
          localStorage.setItem(leidasStorageKey, JSON.stringify(leidosIds));
        }
      } catch (_) {}

      notif.leida = true;
      this.noLeidasCount = this.notificaciones.filter((n) => !n.leida).length;

      // Modal con vista previa del comprobante y acción directa
      const tieneImg = !!notif.comprobanteUrl;
      Swal.fire({
        title: `Validar Comprobante · ${notif.metodoPago || 'Pago'}`,
        html: `
          <div class="text-left" style="font-size: 0.95rem;">
            <p class="mb-2"><strong>Cliente:</strong> ${notif.clienteNombre || 'Cliente'}</p>
            <p class="mb-2"><strong>Monto a validar:</strong> <span style="color: #27ae60; font-weight: bold; font-size: 1.15rem;">S/. ${notif.monto.toFixed(2)}</span></p>
            <p class="mb-3"><strong>Fecha de registro:</strong> ${new Date(notif.fecha).toLocaleDateString()}</p>
            ${
              tieneImg
                ? `<div class="text-center p-2 rounded mb-3" style="background: rgba(0,0,0,0.2);">
                    <img src="${notif.comprobanteUrl}" alt="Comprobante" style="max-width: 100%; max-height: 250px; object-fit: contain; border-radius: 8px; border: 1px solid rgba(255,255,255,0.2);" />
                   </div>`
                : '<div class="alert alert-warning py-2 small">Sin captura adjunta</div>'
            }
            <small class="text-muted d-block text-center">Puedes aprobar o rechazar directamente desde el módulo de Validar Pagos</small>
          </div>
        `,
        icon: 'info',
        showCancelButton: true,
        confirmButtonText: '<i class="fas fa-check-circle mr-1"></i> Ir a Validar Pagos',
        cancelButtonText: 'Cerrar',
        confirmButtonColor: '#27ae60',
        cancelButtonColor: '#6c757d',
        background: '#1e293b',
        color: '#fff',
      }).then((result) => {
        if (result.isConfirmed) {
          this.router.navigate(['/admin/pagos']);
        }
      });
      return;
    }

    // Flujo cliente
    if (notif.originalNotif) {
      const orig = notif.originalNotif;
      this.notificacionService.marcarComoLeida(orig.id);
      notif.leida = true;
      this.noLeidasCount = this.notificaciones.filter((n) => !n.leida).length;

      Swal.fire({
        title: orig.titulo,
        html: `
          <div class="text-left" style="font-size: 0.95rem;">
            <p class="mb-3">${orig.mensaje}</p>
            <div class="p-3 my-2 rounded" style="background: rgba(255,255,255,0.08); border-left: 4px solid #f39c12;">
              <p class="mb-1"><strong>Monto pendiente:</strong> <span style="color: #ff6b6b; font-weight: bold;">S/. ${orig.montoDeuda.toFixed(2)}</span></p>
              <p class="mb-1"><strong>Días de retraso:</strong> <span class="badge ${orig.diasRetraso > 30 ? 'badge-danger' : 'badge-warning'} text-dark">${orig.diasRetraso} día(s)</span></p>
              <p class="mb-0"><strong>Vencimiento:</strong> ${new Date(orig.fechaVencimiento).toLocaleDateString()}</p>
            </div>
            <small class="text-muted d-block mt-2">Emitido: ${new Date(orig.fechaEnvio).toLocaleString()}</small>
          </div>
        `,
        icon: orig.diasRetraso > 30 ? 'warning' : 'info',
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#2575fc',
        background: '#1e293b',
        color: '#fff',
      });
    }
  }

  marcarTodasComoLeidas(): void {
    if (!this.currentUser) return;
    if (this.isAdmin) {
      const leidasStorageKey = 'reyes_admin_pagos_leidos';
      const allIds = this.notificaciones.filter((n) => n.pagoId).map((n) => n.pagoId!);
      try {
        localStorage.setItem(leidasStorageKey, JSON.stringify(allIds));
      } catch (_) {}
      this.notificaciones.forEach((n) => (n.leida = true));
      this.noLeidasCount = 0;
    } else {
      this.notificacionService.marcarTodasComoLeidas(this.currentUser.id);
      this.notificaciones.forEach((n) => (n.leida = true));
      this.noLeidasCount = 0;
    }
  }
}
