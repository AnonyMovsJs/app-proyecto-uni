import { Component, OnInit } from '@angular/core';
import { User } from '../../../shared/model/user';
import { ActivatedRoute, Router } from '@angular/router';
import { UserService } from '../../../shared/user.service';
import { FormsModule, NgForm } from '@angular/forms';
import { SharingDataService } from '../../../shared/sharing-data.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-user-form',
  imports: [FormsModule],
  templateUrl: './user-form.component.html',
  styleUrl: './user-form.component.css',
})
export class UserFormComponent implements OnInit {
  user: User;
  id!: number | null;
  errorValidationBackend!: any;

  constructor(
    private route: ActivatedRoute,
    private userService: UserService,
    private sharingDataService: SharingDataService,
    private router : Router,
  ) {
    this.user = new User();
  }

  ngOnInit(): void {
    this.id = +this.route.snapshot.paramMap.get('id')!;

    this.loadUser();
  }

  loadUser() {
    if (this.id) {
      this.userService.findById(this.id).subscribe({
        next: (data) => (this.user = data),
        error: (error) => (this.errorValidationBackend = error.error),
      });
    }
  }

  onSubmit() {
    if (this.id) {
      this.userService.updateUser(this.user).subscribe({
        next: () => {
          this.router.navigate(['/users'])
          Swal.fire('Actualizado', 'Usuario actualizado exitosamente!', 'success');
        },
        error: (error) => this.errorValidationBackend = error.error
      })
    } else {
      this.userService.saveUser(this.user).subscribe({
        next: () => {
          this.router.navigate(['/users']);
          Swal.fire(
            'Registrado',
            'Usuario registrado exitosamente!',
            'success'
          );
        },
        error: (error) => (this.errorValidationBackend = error.error),
      });
    }
  }
}
