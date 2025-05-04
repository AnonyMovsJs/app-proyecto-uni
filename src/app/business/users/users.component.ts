import { Component, OnInit } from '@angular/core';
import { User } from '../../shared/model/user';
import { UserService } from '../../shared/user.service';

@Component({
  selector: 'app-users',
  imports: [],
  templateUrl: './users.component.html',
  styleUrl: './users.component.css',
})
export default class UsersComponent implements OnInit{
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
