import { Component, OnInit } from '@angular/core';
import { UserService } from '../../shared/user.service';

@Component({
  selector: 'app-user',
  imports: [],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css'
})
export default class ProfileComponent implements OnInit{

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

