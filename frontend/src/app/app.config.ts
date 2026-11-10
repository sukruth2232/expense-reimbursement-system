import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, LOCALE_ID, provideBrowserGlobalErrorListeners } from '@angular/core';
import { MAT_DATE_LOCALE, provideNativeDateAdapter } from '@angular/material/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { registerLocaleData } from '@angular/common';
import localeEnIn from '@angular/common/locales/en-IN';
import { routes } from './app.routes';
import { authInterceptor } from './core/auth/auth.interceptor';
import { errorInterceptor } from './core/http/error.interceptor';

// Indian number and date formats: ₹1,23,456.00 and dd/MM/yyyy.
registerLocaleData(localeEnIn);

/**
 * Application-wide providers (Angular's equivalent of Program.cs).
 * - Router with component input binding: a route param like :id arrives as an input() in the component.
 * - HttpClient with two interceptors, run in order for every request:
 *     authInterceptor  -> adds the JWT
 *     errorInterceptor -> shows API errors as toasts, logs out on 401
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withInterceptors([authInterceptor, errorInterceptor])),
    provideNativeDateAdapter(),
    { provide: LOCALE_ID, useValue: 'en-IN' },
    { provide: MAT_DATE_LOCALE, useValue: 'en-IN' },
  ],
};
