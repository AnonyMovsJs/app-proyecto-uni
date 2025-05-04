import { Component } from '@angular/core';
import { User } from '../../../shared/model/user';
import { UserService } from '../../../shared/user.service';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-user-table',
  imports: [RouterLink],
  templateUrl: './user-table.component.html',
  styleUrl: './user-table.component.css'
})
export class UserTableComponent {

    users: User[] = [];

    constructor(private userService: UserService) { }


    ngOnInit(): void {
      this.loadUsers();
    }

    loadUsers() {
      this.userService.findAll().subscribe({
        next : (data) => this.users = data,
        error : (error) => console.log(error.error),
      })
    }
}
