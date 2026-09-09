import { Component, OnInit, OnDestroy } from '@angular/core';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { FooterComponent } from '../footer/footer.component';
import { HeaderComponent } from '../header/header.component';
import { Router, RouterOutlet } from '@angular/router';
import { ChatbotComponent } from '../../../chatbot/chatbot.component';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { NotificacionService } from '../../services/notificacion.service';
import { Subscription } from 'rxjs';
import Swal from 'sweetalert2';

import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [
    SidebarComponent,
    FooterComponent,
    HeaderComponent,
    RouterOutlet,
    ChatbotComponent,
    CommonModule,
  ],
  templateUrl: './layout.component.html',
})
export default class LayoutComponent implements OnInit, OnDestroy {
  private alertaSub?: Subscription;
  private userProfile: any = null;

  constructor(
    public authService: AuthService,
    private userService: UserService,
    private notificacionService: NotificacionService,
    private router: Router
  ) {}

  ngOnInit(): void {
    if (this.authService.isAuth() && !this.authService.isAdmin()) {
      this.userService.userProfile().subscribe({
        next: (profile) => {
          this.userProfile = profile;
          if (profile && profile.id) {
            this.notificacionService.iniciarSondeo(profile.id);
          }
        },
        error: (err) => console.warn('Error cargando perfil en layout', err),
      });

      // Sondeo inmediato por token
      this.notificacionService.iniciarSondeo();
    }

    // Escuchar alertas en tiempo real emitidas por el administrador
    this.alertaSub = this.notificacionService.alertaEnVivo$.subscribe((notif) => {
      this.procesarAlertaEnVivo(notif);
    });
  }

  ngOnDestroy(): void {
    this.alertaSub?.unsubscribe();
    this.notificacionService.detenerSondeo();
  }

  private procesarAlertaEnVivo(notif: any): void {
    // Si la sesión activa es de Administrador, NUNCA mostramos el modal de deudor
    if (this.authService.isAdmin()) {
      return;
    }

    const currentUser = this.userProfile || this.authService.getCurrentUser();
    const coincide = this.notificacionService.matchCliente(notif, currentUser);

    if (coincide) {
      // Disparar modal de cobro inmediato de alta prioridad
      Swal.fire({
        title: '🚨 REQUERIMIENTO DE PAGO URGENTE',
        html: `
          <div class="text-left" style="color: #ffffff; font-family: inherit;">
            <div style="background: rgba(220, 38, 38, 0.25); border: 2px solid #ef4444; border-radius: 10px; padding: 16px; margin-bottom: 14px;">
              <h5 style="color: #fca5a5; font-weight: bold; margin-bottom: 8px;">
                <i class="fas fa-bell mr-2"></i>Comercial Reyes le informa:
              </h5>
              <p style="margin-bottom: 8px; font-size: 1rem; color: #ffffff;">
                Estimado(a) <strong>${notif.clienteNombre}</strong>, registra una cuenta en mora por:
              </p>
              <div style="text-align: center; margin: 12px 0;">
                <span style="font-size: 2.1rem; font-weight: 800; color: #f87171;">
                  S/. ${Number(notif.montoDeuda).toFixed(2)}
                </span>
              </div>
              <div style="background: rgba(0,0,0,0.35); border-radius: 6px; padding: 10px 14px; margin-bottom: 6px;">
                <p style="margin-bottom: 4px; color: #ffffff;">
                  <strong>Días de atraso acumulados:</strong>
                  <span class="badge badge-danger ml-1" style="font-size: 0.95rem; padding: 4px 8px;">
                    ${notif.diasRetraso} día(s)
                  </span>
                </p>
                <p style="margin-bottom: 0; color: #ffffff;">
                  <strong>Vencimiento:</strong> ${new Date(notif.fechaVencimiento).toLocaleDateString()}
                </p>
              </div>
            </div>
            <p style="color: #fca5a5; font-size: 0.88rem; margin-bottom: 0; line-height: 1.4;">
              ⚠️ Por favor, acérquese a Comercial Reyes o regularice sus cuotas para evitar bloqueos en su línea de crédito. Este aviso persistirá hasta la cancelación total de su saldo pendiente.
            </p>
          </div>
        `,
        icon: 'error',
        confirmButtonText: '<i class="fas fa-money-bill-wave mr-2"></i> Ver Mis Compras y Cuotas',
        confirmButtonColor: '#dc2626',
        background: '#182234',
        color: '#ffffff',
        allowOutsideClick: false,
        backdrop: `rgba(0, 0, 0, 0.85)`,
      }).then((res) => {
        if (res.isConfirmed) {
          this.router.navigate(['/cliente/mis-compras']);
        }
      });
    }
  }
}
