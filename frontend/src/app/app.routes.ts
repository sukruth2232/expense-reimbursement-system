import { inject } from '@angular/core';
import { Routes } from '@angular/router';
import { AuthService } from './core/auth/auth.service';
import { authGuard, guestGuard, roleGuard } from './core/auth/auth.guards';
import { Shell } from './layout/shell/shell';

/**
 * Top-level routes.
 * - /login is public (guestGuard sends logged-in users to their dashboard).
 * - Everything else sits inside the Shell (sidebar + toolbar) and needs a login.
 * - /manager/** is lazy-loaded and limited to managers.
 */
export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login/login').then((m) => m.Login),
  },
  {
    path: '',
    component: Shell,
    canActivate: [authGuard],
    children: [
      {
  path: 'employee',
  canActivate: [roleGuard],
  data: { roles: ['Employee'] },
  loadChildren: () =>
    import('./features/employee/employee.routes').then((m) => m.EMPLOYEE_ROUTES),
},
      {
        path: 'profile',
        loadComponent: () => import('./features/profile/profile').then((m) => m.Profile),
      },
      // "/" -> the right dashboard for the logged-in role
      { path: '', pathMatch: 'full', redirectTo: () => inject(AuthService).homeRoute() },
    ],
  },
  { path: '**', redirectTo: '' },
];
