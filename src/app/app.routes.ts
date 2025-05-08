import { Routes } from '@angular/router';
import { AuthComponent } from './auth/auth.component';
import { ForbiddenComponent } from './shared/components/forbidden/forbidden.component';
import { authGuard } from './guards/auth.guard';
import { UserFormComponent } from './business/users/user-form/user-form.component';
import { authRutasGuard } from './guards/auth-rutas.guard';
import { Component } from '@angular/core';
import { NuevaVentaComponent } from './business/admin/nueva-venta/nueva-venta.component';
import { PagarCuotaComponent } from './business/cliente/mis-cuotas/pagar-cuota/pagar-cuota.component';
import { DetalleCompraComponent } from './business/cliente/mis-compras/detalle-compra/detalle-compra.component';
import { ClienteDashboardComponent } from './business/cliente/cliente-dashboard/cliente-dashboard.component';
import { ListaComprasComponent } from './business/cliente/mis-compras/lista-compras/lista-compras.component';
import { AdminDashboardComponent } from './business/admin/admin-dashboard/admin-dashboard.component';

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
        path: 'admin/ventas',
        component: NuevaVentaComponent,
        canActivate: [authGuard],
      },
      {
        path: 'admin/dashboard',
        component: AdminDashboardComponent,
        canActivate: [authGuard],
      },
      {
        path: 'cliente/dashboard',
        component: ClienteDashboardComponent,
        canActivate: [authRutasGuard],
      },
      /* {
        path: 'cliente/pagar',
        component: PagarCuotaComponent, //REVISAR CREO QUE NO VA
      }, */
      {
        path: 'cliente/mis-compras',
        component: ListaComprasComponent,
        canActivate: [authRutasGuard],
      },
      {
        path: 'cliente/detalle-compra/:id',
        component: DetalleCompraComponent,
        canActivate: [authRutasGuard],
      },
      {
        path: 'cliente/pagar-cuota/:id',
        component: PagarCuotaComponent,
        canActivate: [authRutasGuard],
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

