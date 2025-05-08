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

  onSubmit() {
    if (!this.user.email || !this.user.password) {
      this.errorMensagge = true;
    } else {
      this.errorMensagge = false;
    }

    this.authService
      .loginUser({ email: this.user.email, password: this.user.password })
      .subscribe({
        next: (response) => {
          const token = response.token;
          console.log(token);
          const payload = this.authService.getPayload(token);

          const user = { email: payload.sub };
          const login = {
            user,
            isAuth: true,
            isAdmin: payload.isAdmin,
          };

          console.log(login);

          this.authService.token = token;
          this.authService.user = login;
          if (this.admin) {
            this.router.navigate(['/admin/dashboard']);
          } else {
            this.router.navigate(['/cliente/dashboard']);
          }

        },

        error: (error) => {
          if (error.status == 401) {
            Swal.fire(
              'Error en el login',
              'Username o password incorrectos!',
              'error'
            );
          } else {
            throw error;
          }
        },
      });
  }

  get admin() {
    return this.authService.isAdmin();
  }

}
