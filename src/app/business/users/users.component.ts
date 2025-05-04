import { Component } from '@angular/core';
import { UserTableComponent } from "./user-table/user-table.component";


@Component({
  selector: 'app-users',
  imports: [UserTableComponent],
  templateUrl: './users.component.html',
  styleUrl: './users.component.css',
})
export default class UsersComponent{


  /*   users: User[] = [];

  constructor(private userService: UserService) { }


  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers() {
    this.userService.findAll().subscribe({
      next : (data) => this.users = data,
      error : (error) => console.log(error.error),
    })
  } */
}
