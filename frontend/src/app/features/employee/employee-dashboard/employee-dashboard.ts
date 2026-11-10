import { CurrencyPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { EmployeeDashboard as DashboardData, ExpenseSummary } from '../../../core/models/models';
import { ExpenseService } from '../../../core/services/expense.service';
import { EmptyState } from '../../../shared/components/empty-state';
import { ExpenseTable } from '../../../shared/components/expense-table';
import { PageHeader } from '../../../shared/components/page-header';

/** Employee home: four status cards, two totals and the five most recent claims. */
@Component({
  selector: 'app-employee-dashboard',
  imports: [CurrencyPipe, RouterLink, MatCardModule, MatIconModule, MatButtonModule, MatProgressBarModule,
    PageHeader, ExpenseTable, EmptyState],
  templateUrl: './employee-dashboard.html',
})
export class EmployeeDashboard {
  private readonly router = inject(Router);

  readonly user = inject(AuthService).currentUser;
  readonly data = signal<DashboardData | null>(null);
  readonly loading = signal(true);

  constructor() {
    inject(ExpenseService)
      .getDashboard()
      .subscribe({
        next: (d) => {
          this.data.set(d);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  open(row: ExpenseSummary): void {
    this.router.navigate(['/employee/expenses', row.expenseId]);
  }
}
