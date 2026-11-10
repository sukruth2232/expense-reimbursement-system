import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Router, RouterLink } from '@angular/router';
import { ExpenseStatus, ExpenseSummary } from '../../../core/models/models';
import { ExpenseService } from '../../../core/services/expense.service';
import { EmptyState } from '../../../shared/components/empty-state';
import { ExpenseTable } from '../../../shared/components/expense-table';
import { PageHeader } from '../../../shared/components/page-header';

/** My Expenses: paged table with a status filter. Paging and filtering happen on the server. */
@Component({
  selector: 'app-my-expenses',
  imports: [RouterLink, MatCardModule, MatButtonModule, MatButtonToggleModule, MatIconModule, MatPaginatorModule,
    MatProgressBarModule, PageHeader, ExpenseTable, EmptyState],
  templateUrl: './my-expenses.html',
})
export class MyExpenses {
  private readonly expenses = inject(ExpenseService);
  private readonly router = inject(Router);

  readonly rows = signal<ExpenseSummary[]>([]);
  readonly total = signal(0);
  readonly loading = signal(false);
  readonly status = signal<ExpenseStatus | null>(null);
  readonly page = signal(1);
  readonly pageSize = signal(10);

  readonly filters: { value: ExpenseStatus | null; label: string }[] = [
    { value: null, label: 'All' },
    { value: 'Draft', label: 'Draft' },
    { value: 'PendingApproval', label: 'Pending' },
    { value: 'Approved', label: 'Approved' },
    { value: 'Rejected', label: 'Rejected' },
  ];

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.expenses.getMyExpenses(this.page(), this.pageSize(), this.status()).subscribe({
      next: (result) => {
        this.rows.set(result.items);
        this.total.set(result.totalCount);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  setStatus(status: ExpenseStatus | null): void {
    this.status.set(status);
    this.page.set(1);
    this.load();
  }

  onPage(event: PageEvent): void {
    this.page.set(event.pageIndex + 1); // paginator is 0-based, API is 1-based
    this.pageSize.set(event.pageSize);
    this.load();
  }

  open(row: ExpenseSummary): void {
    this.router.navigate(['/employee/expenses', row.expenseId]);
  }
}
