import { Routes } from '@angular/router';
import { AuthComponent } from './auth/auth.component';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./shared/components/layout/layout.component'),
    children: [
      {
        path: 'user',
        loadComponent: () => import('./business/profile/profile.component'),
      },
      {
        path: 'users',
        loadComponent: () => import('./business/users/users.component'),
      },
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'login',
      },
    ],
  },

  {
    path: 'login',
    component: AuthComponent,
  },
];

