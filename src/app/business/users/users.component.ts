import { Component } from '@angular/core';
import { UserTableComponent } from './user-table/user-table.component';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [UserTableComponent, CommonModule, RouterModule],
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.css'],
})
export default class UsersComponent {
  constructor() {}
}
