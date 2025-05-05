import { Routes } from '@angular/router';
import { AuthComponent } from './auth/auth.component';
import { ForbiddenComponent } from './shared/components/forbidden/forbidden.component';
import { authGuard } from './guards/auth.guard';
import { UserFormComponent } from './business/users/user-form/user-form.component';
import { authRutasGuard } from './guards/auth-rutas.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./shared/components/layout/layout.component'),
    children: [
      {
        path: 'user',
        loadComponent: () => import('./business/profile/profile.component'),
        canActivate: [authRutasGuard],
      },
      {
        path: 'user/edit/:id',
        component: UserFormComponent,
        canActivate: [authGuard],
      },
      {
        path: 'user/create',
        component: UserFormComponent,
        canActivate: [authGuard],
      },
      {
        path: 'users',
        loadComponent: () => import('./business/users/users.component'),
        canActivate: [authGuard],
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

  {
    path: 'forbidden',
    component: ForbiddenComponent,
  },
];

