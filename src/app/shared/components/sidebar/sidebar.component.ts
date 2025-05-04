import { Component, OnInit } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { User } from '../../model/user';
import { UserService } from '../../user.service';
import { AuthService } from '../../auth.service';

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
})
export class SidebarComponent implements OnInit {
  userProfile: any;

  constructor(private router : Router,private userService: UserService, private authService : AuthService) {
    this.userProfile = new User();
  }

  ngOnInit(): void {
    this.userService.userProfile().subscribe({
      next: (data) => (this.userProfile = data),
      error: (error) => console.log(error.error),
    });
  }

  handlerLogout() {
    this.authService.logout();
    this.router.navigate(['login'])
  }

  get admin() {
    return this.authService.isAdmin();
  }

}
