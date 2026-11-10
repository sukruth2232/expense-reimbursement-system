import { Routes } from '@angular/router';

/** Manager screens. Loaded only when a Manager opens /manager/... (lazy loading). */
export const MANAGER_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  {
    path: 'dashboard',
    loadComponent: () => import('./manager-dashboard/manager-dashboard').then((m) => m.ManagerDashboard),
  },
  {
    path: 'pending',
    loadComponent: () => import('./pending-approvals/pending-approvals').then((m) => m.PendingApprovals),
  },
  {
    path: 'team',
    loadComponent: () => import('./team-expenses/team-expenses').then((m) => m.TeamExpenses),
  },
  {
    path: 'history',
    loadComponent: () => import('./approval-history/approval-history').then((m) => m.ApprovalHistory),
  },
  {
    path: 'expenses/:id',
    loadComponent: () => import('./approval-details/approval-details').then((m) => m.ApprovalDetails),
  },
];
