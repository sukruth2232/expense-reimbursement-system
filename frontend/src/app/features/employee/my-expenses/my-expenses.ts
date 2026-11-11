
import { Component, inject, signal } from '@angular/core';

// Angular Material modules
import { MatCardModule } from '@angular/material/card';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

// Angular routing
import { Router, RouterLink } from '@angular/router';

// Models
import { ExpenseSummary } from '../../../core/models/models';

// Services
import { ExpenseService } from '../../../core/services/expense.service';

// Shared components
import { EmptyState } from '../../../shared/components/empty-state';
import { ExpenseTable } from '../../../shared/components/expense-table';
import { PageHeader } from '../../../shared/components/page-header';

@Component({
  selector: 'app-my-expenses',

  // Every standalone component or module used in this template
  // must be registered here.
  imports: [
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatPaginatorModule,
    MatProgressBarModule,
    PageHeader,
    ExpenseTable,
    EmptyState,
  ],

  template: `
    <!-- Page heading with Create New Expense button -->
    <app-page-header
      title="My Expenses"
      subtitle="View and manage your expenses"
    >
      <a mat-flat-button routerLink="/employee/expenses/new">
        <mat-icon>add</mat-icon>
        Create New Expense
      </a>
    </app-page-header>

    <!-- Expense list card -->
    <mat-card appearance="outlined">

      <!-- Loading indicator -->
      @if (loading()) {
        <mat-progress-bar mode="indeterminate" />
      }

      <!-- Display expenses when records are available -->
      @if (rows().length > 0) {

        <app-expense-table
          [rows]="rows()"
          [columns]="[
            'expenseNumber',
            'title',
            'categoryName',
            'expenseDate',
            'amount',
            'status'
          ]"
          (rowClick)="open($event)"
        />

        <!-- Pagination -->
        <mat-paginator
          [length]="total()"
          [pageIndex]="page() - 1"
          [pageSize]="pageSize()"
          [pageSizeOptions]="[5, 10, 25]"
          (page)="onPage($event)"
        />

      } @else if (!loading()) {

        <!-- Display when there are no expenses -->
        <app-empty-state
          icon="receipt_long"
          title="No expenses found"
          message="You have not created any expenses yet."
        />

      }

    </mat-card>
  `,
})
export class MyExpenses {

  // Inject the service responsible for Employee expense API calls.
  private readonly expenses = inject(ExpenseService);

  // Router is used to navigate to the selected expense.
  private readonly router = inject(Router);

  // Stores the expenses returned by the backend.
  readonly rows = signal<ExpenseSummary[]>([]);

  // Stores the total number of expense records.
  readonly total = signal(0);

  // Tracks whether the API request is running.
  readonly loading = signal(false);

  // The backend uses page numbers starting from 1.
  readonly page = signal(1);

  // Number of expenses displayed on each page.
  readonly pageSize = signal(10);

  constructor() {
    // Load the first page when this component is created.
    this.load();
  }

  load(): void {
    this.loading.set(true);

    // Retrieve expenses belonging to the logged-in employee.
    this.expenses
      .getMyExpenses(this.page(), this.pageSize())
      .subscribe({
        next: (result) => {

          // Store the expense records.
          this.rows.set(result.items);

          // Store the total number of records for pagination.
          this.total.set(result.totalCount);

          this.loading.set(false);
        },

        error: (error) => {
          console.error('Unable to load employee expenses:', error);
          this.loading.set(false);
        },
      });
  }

  onPage(event: PageEvent): void {

    // Angular Material pageIndex starts at 0.
    // Our backend API page numbers start at 1.
    this.page.set(event.pageIndex + 1);

    this.pageSize.set(event.pageSize);

    // Retrieve the selected page from the backend.
    this.load();
  }

  open(row: ExpenseSummary): void {

    // Navigate to the selected expense's details page.
    this.router.navigate(['/employee/expenses', row.expenseId]);
  }
}
