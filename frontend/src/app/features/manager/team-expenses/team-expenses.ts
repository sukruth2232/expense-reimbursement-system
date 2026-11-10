import { Component, inject, signal } from '@angular/core';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Router } from '@angular/router';
import { ExpenseStatus, ExpenseSummary } from '../../../core/models/models';
import { ApprovalService } from '../../../core/services/approval.service';
import { EmptyState } from '../../../shared/components/empty-state';
import { ExpenseTable } from '../../../shared/components/expense-table';
import { PageHeader } from '../../../shared/components/page-header';

/** Every submitted claim from the manager's team (drafts stay private), filterable by status. */
@Component({
  selector: 'app-team-expenses',
  imports: [MatCardModule, MatButtonToggleModule, MatPaginatorModule, MatProgressBarModule, PageHeader, ExpenseTable, EmptyState],
  template: `
    <app-page-header title="Team expenses" subtitle="All submitted claims from your team" />
    <mat-button-toggle-group class="filter-bar" [value]="status()" (change)="setStatus($event.value)" aria-label="Filter by status">
      <mat-button-toggle [value]="null">All</mat-button-toggle>
      <mat-button-toggle value="PendingApproval">Pending</mat-button-toggle>
      <mat-button-toggle value="Approved">Approved</mat-button-toggle>
      <mat-button-toggle value="Rejected">Rejected</mat-button-toggle>
    </mat-button-toggle-group>
    <mat-card appearance="outlined">
      @if (loading()) {
        <mat-progress-bar mode="indeterminate" />
      }
      @if (rows().length > 0) {
        <app-expense-table [rows]="rows()"
                           [columns]="['expenseNumber', 'employeeName', 'title', 'submittedAt', 'amount', 'status']"
                           (rowClick)="open($event)" />
        <mat-paginator [length]="total()" [pageIndex]="page() - 1" [pageSize]="pageSize()"
                       [pageSizeOptions]="[5, 10, 25]" (page)="onPage($event)" />
      } @else if (!loading()) {
        <app-empty-state icon="groups" title="No team expenses" message="Submitted claims from your team appear here." />
      }
    </mat-card>
  `,
})
export class TeamExpenses {
  private readonly approvals = inject(ApprovalService);
  private readonly router = inject(Router);

  readonly rows = signal<ExpenseSummary[]>([]);
  readonly total = signal(0);
  readonly loading = signal(false);
  readonly status = signal<ExpenseStatus | null>(null);
  readonly page = signal(1);
  readonly pageSize = signal(10);

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.approvals.getTeamExpenses(this.page(), this.pageSize(), this.status()).subscribe({
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
    this.page.set(event.pageIndex + 1);
    this.pageSize.set(event.pageSize);
    this.load();
  }

  open(row: ExpenseSummary): void {
    this.router.navigate(['/manager/expenses', row.expenseId]);
  }
}
