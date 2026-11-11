import { CurrencyPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { ExpenseSummary, ManagerDashboard as DashboardData } from '../../../core/models/models';
import { ApprovalService } from '../../../core/services/approval.service';
import { EmptyState } from '../../../shared/components/empty-state';
import { ExpenseTable } from '../../../shared/components/expense-table';
import { PageHeader } from '../../../shared/components/page-header';

/** Manager home: team size, pending queue size/amount, this month's decisions, oldest pending claims. */
@Component({
  selector: 'app-manager-dashboard',
  imports: [CurrencyPipe, RouterLink, MatCardModule, MatIconModule, MatButtonModule, MatProgressBarModule,
    PageHeader, ExpenseTable, EmptyState],
  template: `
    <app-page-header [title]="'Welcome, ' + (user()?.fullName ?? '')" subtitle="Your team's claims at a glance">
      <a mat-stroked-button routerLink="/manager/my-team"><mat-icon>people</mat-icon>My team</a>
      <a mat-flat-button routerLink="/manager/pending"><mat-icon>pending_actions</mat-icon>Review pending</a>
    </app-page-header>

    @if (loading()) {
      <mat-progress-bar mode="indeterminate" />
    }

    @if (data(); as d) {
      <div class="stat-grid">
        <mat-card appearance="outlined" class="stat stat--pending">
          <span class="stat__label">Waiting for you</span>
          <span class="stat__value">{{ d.pendingCount }}</span>
          <span class="stat__sub">{{ d.pendingAmount | currency: 'INR' : 'symbol' : '1.0-0' : 'en-IN' }}</span>
        </mat-card>
        <mat-card appearance="outlined" class="stat stat--approved">
          <span class="stat__label">Approved this month</span>
          <span class="stat__value">{{ d.approvedThisMonth }}</span>
        </mat-card>
        <mat-card appearance="outlined" class="stat stat--rejected">
          <span class="stat__label">Rejected this month</span>
          <span class="stat__value">{{ d.rejectedThisMonth }}</span>
        </mat-card>
        <mat-card appearance="outlined" class="stat stat--draft">
          <span class="stat__label">Team members</span>
          <span class="stat__value">{{ d.teamSize }}</span>
        </mat-card>
      </div>

      <mat-card appearance="outlined">
        <mat-card-header><mat-card-title>Oldest pending claims</mat-card-title></mat-card-header>
        <mat-card-content>
          @if (d.oldestPending.length > 0) {
            <app-expense-table [rows]="d.oldestPending"
                               [columns]="['expenseNumber', 'employeeName', 'title', 'submittedAt', 'amount']"
                               (rowClick)="open($event)" />
          } @else {
            <app-empty-state icon="task_alt" title="All caught up" message="No claims are waiting for your review." />
          }
        </mat-card-content>
      </mat-card>
    }
  `,
})
export class ManagerDashboard {
  private readonly router = inject(Router);

  readonly user = inject(AuthService).currentUser;
  readonly data = signal<DashboardData | null>(null);
  readonly loading = signal(true);

  constructor() {
    inject(ApprovalService)
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
    this.router.navigate(['/manager/expenses', row.expenseId]);
  }
}
