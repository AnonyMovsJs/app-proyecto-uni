import { Component, OnInit } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { User } from '../../model/user';
import { UserService } from '../../services/user.service';
import { AuthService } from '../../services/auth.service';
import { ChatbotService } from '../../services/chatbot.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive, CommonModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css',
})
export class SidebarComponent implements OnInit {
  userProfile: any;


  constructor(
    private chatbotService: ChatbotService,
    private router: Router,
    private userService: UserService,
    private authService: AuthService
  ) {
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
    this.authService.logout();
    this.chatbotService.clearMessages();
    this.chatbotService.clearAction();

    this.router.navigate(['login']);
  }

  login(credentials: any) {
    this.authService.loginUser(credentials).subscribe({
      next: (response) => {
        // Manejar respuesta exitosa
        // ...

        // Reiniciar el chat con el nuevo usuario
        this.chatbotService.initializeWebSocketConnection();
      },
      error: (error) => {
        // Manejar error
      },
    });
  }

  ngAfterViewInit() {
    // Inicializar AdminLTE después de que la vista se cargue
    if (typeof (window as any).$ !== 'undefined') {
      (window as any).$('[data-widget="treeview"]').Treeview('init');
    }
  }

  // Y en el método de login exitoso
  onLoginSuccess() {
    // Inicializar el chat con el nuevo usuario
    if (this.chatbotService) {
      this.chatbotService.initializeWebSocketConnection();
    }
  }

  get admin() {
    return this.authService.isAdmin();
  }

}
