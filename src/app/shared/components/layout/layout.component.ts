import { Component } from '@angular/core';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { FooterComponent } from '../footer/footer.component';
import { HeaderComponent } from '../header/header.component';
import { RouterOutlet } from '@angular/router';
import { ChatbotComponent } from '../../../chatbot/chatbot.component';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-layout',
  imports: [
    SidebarComponent,
    FooterComponent,
    HeaderComponent,
    RouterOutlet,
    ChatbotComponent,
    CommonModule,
  ],
  templateUrl: './layout.component.html',
})
export default class LayoutComponent {
  constructor(public authService: AuthService) {}
}
