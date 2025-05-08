import { Component, OnInit } from '@angular/core';
import { UserService } from '../../shared/services/user.service';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-user',
  imports: [CommonModule, RouterLink],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css'
})
export default class ProfileComponent implements OnInit{

  userProfile!: any;
  userProjects!: any;


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

