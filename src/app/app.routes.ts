import { Routes } from '@angular/router';
import { AuthComponent } from './auth/auth.component';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'user'
  },

  {
    path: 'user',
    loadComponent: () => import('./business/user/user.component')
  },
  {
    path: 'login',
    component: AuthComponent
  }
];
