import { Component, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { User } from '../../model/user';
import { UserService } from '../../user.service';

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html'
})
export class SidebarComponent implements OnInit{

  userProfile: any;

  constructor(private userService : UserService) {
    this.userProfile = new User();
  }


  ngOnInit(): void {
    this.userService.userProfile().subscribe({
      next: (data) => this.userProfile = data,
      error : (error) => console.log(error.error)
    })
  }



}
