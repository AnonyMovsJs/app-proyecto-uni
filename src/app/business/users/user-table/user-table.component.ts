import { Component } from '@angular/core';
import { User } from '../../../shared/model/user';
import { UserService } from '../../../shared/user.service';
import { RouterLink } from '@angular/router';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-user-table',
  imports: [RouterLink],
  templateUrl: './user-table.component.html',
  styleUrl: './user-table.component.css',
})
export class UserTableComponent {
  users: User[] = [];

  constructor(private userService: UserService) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers() {
    this.userService.findAll().subscribe({
      next: (data) => (this.users = data),
      error: (error) => console.log(error.error),
    });
  }

  deleteUser(id: number) {
    Swal.fire({
      title: 'Estás seguro?',
      text: 'Estás eliminando una usuario!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, delete it!',
    }).then((result) => {
      if (result.isConfirmed) {
        this.userService.deleteUser(id).subscribe(() => {
          this.loadUsers();

          Swal.fire({
            title: 'Eliminado!',
            text: 'Usuario eliminado correctamente.',
            icon: 'success',
          });
        });
      }
    });
  }
}


//CONTINUAR
