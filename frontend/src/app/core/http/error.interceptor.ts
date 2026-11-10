import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { ProblemDetails } from '../models/models';
import { NotificationService } from '../services/notification.service';

/**
 * Central place for API errors, so components don't each write their own handling.
 *  - 401 on any call except login -> token expired or invalid -> log out.
 *  - Anything else -> show the server's ProblemDetails message as a toast.
 * The error is re-thrown so a component can still react (e.g. stop a spinner).
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const notify = inject(NotificationService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      const isLogin = req.url.endsWith('/api/auth/login');

      if (error.status === 401 && !isLogin) {
        notify.error('Your session has expired. Please log in again.');
        auth.logout();
      } else {
        notify.error(describeError(error));
      }
      return throwError(() => error);
    }),
  );
};

/** Turns an HTTP error into one readable sentence. */
export function describeError(error: HttpErrorResponse): string {
  if (error.status === 0) return 'Cannot reach the server. Is the API running?';

  const problem = error.error as ProblemDetails | null;
  if (problem?.errors) {
    // 400 validation errors: show the first field message.
    const first = Object.values(problem.errors)[0]?.[0];
    if (first) return first;
  }
  return problem?.detail ?? problem?.title ?? `Request failed (${error.status}).`;
}
