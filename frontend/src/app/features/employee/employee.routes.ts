import { Routes } from '@angular/router';

/** Employee screens. Loaded only when an Employee opens /employee/... (lazy loading). */
export const EMPLOYEE_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  {
    path: 'dashboard',
    loadComponent: () => import('./employee-dashboard/employee-dashboard').then((m) => m.EmployeeDashboard),
  },
  {
    path: 'expenses',
    loadComponent: () => import('./my-expenses/my-expenses').then((m) => m.MyExpenses),
  },
  {
    path: 'expenses/new',
    loadComponent: () => import('./expense-form/expense-form').then((m) => m.ExpenseForm),
  },
  {
    path: 'expenses/:id',
    loadComponent: () => import('./expense-details/expense-details').then((m) => m.ExpenseDetails),
  },
  {
    path: 'expenses/:id/edit',
    loadComponent: () => import('./expense-form/expense-form').then((m) => m.ExpenseForm),
  },
];
