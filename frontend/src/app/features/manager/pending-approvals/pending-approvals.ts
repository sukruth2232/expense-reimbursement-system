import { Component, inject, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Router } from '@angular/router';
import { ExpenseSummary } from '../../../core/models/models';
import { ApprovalService } from '../../../core/services/approval.service';
import { EmptyState } from '../../../shared/components/empty-state';
import { ExpenseTable } from '../../../shared/components/expense-table';
import { PageHeader } from '../../../shared/components/page-header';

/** The manager's review queue, oldest submission first. Clicking a row opens Approval Details. */
@Component({
  selector: 'app-pending-approvals',
  imports: [MatCardModule, MatPaginatorModule, MatProgressBarModule, PageHeader, ExpenseTable, EmptyState],
  template: `
    <app-page-header title="Pending approvals" subtitle="Claims from your team waiting for a decision" />
    <mat-card appearance="outlined">
      @if (loading()) {
        <mat-progress-bar mode="indeterminate" />
      }
      @if (rows().length > 0) {
        <app-expense-table [rows]="rows()"
                           [columns]="['expenseNumber', 'employeeName', 'title', 'categoryName', 'submittedAt', 'amount']"
                           (rowClick)="open($event)" />
        <mat-paginator [length]="total()" [pageIndex]="page() - 1" [pageSize]="pageSize()"
                       [pageSizeOptions]="[5, 10, 25]" (page)="onPage($event)" />
      } @else if (!loading()) {
        <app-empty-state icon="task_alt" title="All caught up" message="No claims are waiting for your review." />
      }
    </mat-card>
  `,
})
export class PendingApprovals {
  private readonly approvals = inject(ApprovalService);
  private readonly router = inject(Router);

  readonly rows = signal<ExpenseSummary[]>([]);
  readonly total = signal(0);
  readonly loading = signal(false);
  readonly page = signal(1);
  readonly pageSize = signal(10);

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.approvals.getPending(this.page(), this.pageSize()).subscribe({
      next: (result) => {
        this.rows.set(result.items);
        this.total.set(result.totalCount);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  onPage(event: PageEvent): void {
    this.page.set(event.pageIndex + 1);
    this.pageSize.set(event.pageSize);
    this.load();
  }

  open(row: ExpenseSummary): void {
    this.router.navigate(['/manager/expenses', row.expenseId]);
  }
}
