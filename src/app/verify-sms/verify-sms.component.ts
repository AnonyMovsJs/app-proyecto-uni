import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../shared/services/auth.service';
import Swal from 'sweetalert2';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-verify-sms',
  imports: [FormsModule, CommonModule],
  templateUrl: './verify-sms.component.html',
  styleUrl: './verify-sms.component.css',
})
export class VerifySmsComponent implements OnInit {
  smsCode: string = '';
  email: string = '';
  isAdmin: boolean = false;
  tempToken: string = '';
  errorMessage: boolean = false;
  isLoading: boolean = false;

  // Nuevas propiedades para WhatsApp
  showWhatsAppButton: boolean = false;
  whatsappSending: boolean = false;
  whatsappSent: boolean = false;
  countdown: number = 5;

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit() {
    // Obtener datos pendientes
    const pendingAuth = this.authService.pendingAuth;

    if (!pendingAuth) {
      this.router.navigate(['/login']);
      return;
    }

    this.email = pendingAuth.email;
    this.isAdmin = pendingAuth.isAdmin;
    this.tempToken = pendingAuth.tempToken;

    // Iniciar countdown para mostrar botón WhatsApp después de 5 segundos
    this.startWhatsAppCountdown();
  }

  startWhatsAppCountdown() {
    const timer = setInterval(() => {
      this.countdown--;
      if (this.countdown <= 0) {
        this.showWhatsAppButton = true;
        clearInterval(timer);
      }
    }, 1000);
  }

  onSendWhatsApp() {
    this.whatsappSending = true;

    const whatsappData = {
      email: this.email,
    };

    this.authService.sendWhatsApp(whatsappData).subscribe({
      next: (response) => {
        this.whatsappSending = false;
        this.whatsappSent = true;

        Swal.fire({
          title: 'WhatsApp Enviado',
          text: 'Revisa tu WhatsApp para obtener el código de verificación',
          icon: 'success',
          timer: 3000,
          showConfirmButton: false,
        });
      },
      error: (error) => {
        this.whatsappSending = false;
        console.error('Error enviando WhatsApp:', error);

        Swal.fire({
          title: 'Error WhatsApp',
          text: 'No se pudo enviar el código por WhatsApp. Intenta nuevamente.',
          icon: 'error',
        });
      },
    });
  }

  onVerifySms() {
    if (!this.smsCode || this.smsCode.length !== 6) {
      this.errorMessage = true;
      return;
    }

    this.errorMessage = false;
    this.isLoading = true;

    const verificationData = {
      email: this.email,
      code: this.smsCode,
      tempToken: this.tempToken,
      admin: this.isAdmin,
    };

    this.authService.verifySms(verificationData).subscribe({
      next: (response) => {
        this.isLoading = false;

        this.authService.clearTempData();

        const token = response.token;
        const payload = this.authService.getPayload(token);
        const user = { email: payload.sub };
        const login = {
          user,
          isAuth: true,
          isAdmin: response.isAdmin,
        };

        this.authService.token = token;
        this.authService.user = login;

        Swal.fire({
          title: 'Autenticación Exitosa',
          text: response.message,
          icon: 'success',
          timer: 2000,
          showConfirmButton: false,
        }).then(() => {
          if (response.isAdmin) {
            this.router.navigate(['/admin/dashboard']);
          } else {
            this.router.navigate(['/cliente/dashboard']);
          }
        });
      },

      error: (error) => {
        this.isLoading = false;
        console.error('Error de verificación:', error);

        let errorTitle = 'Error de Verificación';
        let errorText = 'Error interno del servidor';

        if (error.error && error.error.error === 'INVALID_SMS_CODE') {
          errorText = 'Código inválido o expirado';
        } else if (error.error && error.error.message) {
          errorText = error.error.message;
        }

        Swal.fire(errorTitle, errorText, 'error');
      },
    });
  }

  onBackToLogin() {
    this.authService.clearTempData();
    this.router.navigate(['/login']);
  }
}
