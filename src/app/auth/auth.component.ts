import { Component, ViewEncapsulation } from '@angular/core';
import { User } from '../shared/model/user';
import Swal from 'sweetalert2';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../shared/services/auth.service';
import { Router } from '@angular/router';


@Component({
  selector: 'app-auth',
  imports: [FormsModule],
  templateUrl: './auth.component.html',
  styleUrl: './auth.component.css',
  encapsulation: ViewEncapsulation.None,
})
export class AuthComponent {
  user: User;
  errorMensagge: boolean = false;


  constructor(private authService: AuthService, private router: Router) {
    this.user = new User();
  }

  // Reemplaza el método onSubmit() en tu auth.component.ts

  onSubmit() {
    if (!this.user.email || !this.user.password) {
      this.errorMensagge = true;
      return;
    } else {
      this.errorMensagge = false;
    }

    this.authService
      .loginUser({ email: this.user.email, password: this.user.password })
      .subscribe({
        next: (response) => {
          console.log('Respuesta del login:', response);

          // Verificar si requiere SMS
          if (response.requiresSms) {
            // Guardar datos temporales
            this.authService.tempToken = response.tempToken;
            this.authService.pendingAuth = {
              email: response.email,
              isAdmin: response.isAdmin,
              tempToken: response.tempToken,
            };

            // Mostrar mensaje de éxito y redirigir a verificación SMS
            Swal.fire({
              title: 'SMS Enviado',
              text: 'Se ha enviado un código de verificación a tu teléfono',
              icon: 'info',
              confirmButtonText: 'Continuar',
            }).then(() => {
              this.router.navigate(['/verify-sms']);
            });
          } else {
            // Login tradicional sin 2FA (por si acaso)
            const token = response.token;
            const payload = this.authService.getPayload(token);
            const user = { email: payload.sub };
            const login = {
              user,
              isAuth: true,
              isAdmin: payload.isAdmin,
            };

            this.authService.token = token;
            this.authService.user = login;

            if (this.admin) {
              this.router.navigate(['/admin/dashboard']);
            } else {
              this.router.navigate(['/cliente/dashboard']);
            }
          }
        },

        error: (error) => {
          if (error.status == 401) {
            Swal.fire(
              'Error en el login',
              'Email o password incorrectos!',
              'error'
            );
          } else if (error.error && error.error.error === 'SMS_ERROR') {
            Swal.fire(
              'Error SMS',
              'No se pudo enviar el código SMS. Intenta nuevamente.',
              'error'
            );
          } else {
            Swal.fire('Error', 'Error interno del servidor', 'error');
          }
        },
      });
  }

  get admin() {
    return this.authService.isAdmin();
  }
}
