import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { CurrentUser, LoginRequest, LoginResponse } from '../models/models';

const TOKEN_KEY = 'expenso.token';
const USER_KEY = 'expenso.user';
const EXPIRES_KEY = 'expenso.expiresAt';

/**
 * Holds the logged-in user and the JWT.
 *
 * - The token is kept in sessionStorage: it survives a page refresh but is cleared when
 *   the browser tab closes.
 * - `currentUser` is a signal, so the sidebar, toolbar and guards update automatically
 *   when the user logs in or out.
 * - The role stored here is only used to choose which screens to show. The API checks
 *   the role again from the signed token on every request.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly user = signal<CurrentUser | null>(this.readUser());

  readonly currentUser = this.user.asReadonly();
  readonly isLoggedIn = computed(() => this.user() !== null && this.token !== null);
  readonly role = computed(() => this.user()?.role ?? null);

  get token(): string | null {
    const token = sessionStorage.getItem(TOKEN_KEY);
    const expiresAt = sessionStorage.getItem(EXPIRES_KEY);
    if (!token || !expiresAt) return null;
    // Treat an expired token as "not logged in" without waiting for a 401.
    return new Date(expiresAt).getTime() > Date.now() ? token : null;
  }

  login(request: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>('/api/auth/login', request).pipe(
      tap((response) => {
        sessionStorage.setItem(TOKEN_KEY, response.accessToken);
        sessionStorage.setItem(EXPIRES_KEY, response.expiresAt);
        sessionStorage.setItem(USER_KEY, JSON.stringify(response.user));
        this.user.set(response.user);
      }),
    );
  }

  /** Fresh copy of the current user from the server (GET /api/auth/me). */
  me(): Observable<CurrentUser> {
    return this.http.get<CurrentUser>('/api/auth/me');
  }

  logout(): void {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(EXPIRES_KEY);
    sessionStorage.removeItem(USER_KEY);
    this.user.set(null);
    this.router.navigate(['/login']);
  }

  /** Where each role lands after login. */
  homeRoute(): string {
    return this.role() === 'Manager' ? '/manager/dashboard' : '/employee/dashboard';
  }

  private readUser(): CurrentUser | null {
    const raw = sessionStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as CurrentUser) : null;
  }
}
