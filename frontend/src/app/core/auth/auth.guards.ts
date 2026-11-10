import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { UserRole } from '../models/models';
import { AuthService } from './auth.service';

/**
 * Route guards decide which screens can open. They improve the user experience only:
 * even if someone bypasses them in the browser, the API still rejects the request.
 */

/** Only logged-in users. Otherwise go to /login. */
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.isLoggedIn() ? true : inject(Router).createUrlTree(['/login']);
};

/**
 * Only users whose role is listed in the route's data, e.g.
 *   { path: 'manager', canActivate: [roleGuard], data: { roles: ['Manager'] } }
 * A user with the wrong role is sent to their own home screen.
 */
export const roleGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const allowed = (route.data['roles'] as UserRole[] | undefined) ?? [];
  const role = auth.role();
  return role && allowed.includes(role) ? true : inject(Router).createUrlTree([auth.homeRoute()]);
};

/** The login page itself: a logged-in user is sent straight to their dashboard. */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.isLoggedIn() && auth.role() === 'Manager'
    ? inject(Router).createUrlTree([auth.homeRoute()])
    : true;
};
