
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
    // Create a new expense.
    // Keep this before the expense details route.
    path: 'expenses/new',
    loadComponent: () =>
      import('./create-expense/create-expense')
        .then((m) => m.CreateExpense),
  },
  {
    // Employee Expense Details.
    path: 'expenses/:id',
    loadComponent: () =>
      import('./expense-details/expense-details')
        .then((m) => m.EmployeeExpenseDetails),
  },
  {
    // Employee My Expenses page.
    path: 'expenses',
    loadComponent: () =>
      import('./my-expenses/my-expenses')
        .then((m) => m.MyExpenses),
  },
];
