import { Component, OnInit } from '@angular/core';
import { UserService } from '../../shared/user.service';

@Component({
  selector: 'app-user',
  imports: [],
  templateUrl: './user.component.html',
  styleUrl: './user.component.css'
})
export default class UserComponent implements OnInit{

  userProfile!: any;


  constructor(private userService : UserService){}

  ngOnInit(): void {
    this.loadProfile();
  }

  loadProfile() {
    this.userService.userProfile().subscribe({
      next: data => this.userProfile = data,
      error : error => console.log(error.error)
    })
  }

}
