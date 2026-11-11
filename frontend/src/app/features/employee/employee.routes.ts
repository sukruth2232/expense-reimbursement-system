
import { Routes } from '@angular/router';

// Routes available inside the Employee module.
export const EMPLOYEE_ROUTES: Routes = [
  {
    // Redirect /employee to /employee/dashboard.
    path: '',
    pathMatch: 'full',
    redirectTo: 'dashboard',
  },
  {
    // Employee Dashboard.
    path: 'dashboard',
    loadComponent: () =>
      import('./employee-dashboard/employee-dashboard')
        .then((m) => m.EmployeeDashboard),
  },
  {
    // Employee My Expenses page.
    path: 'expenses',
    loadComponent: () =>
      import('./my-expenses/my-expenses')
        .then((m) => m.MyExpenses),
  },
];
