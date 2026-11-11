
import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { AuthService } from '../../../core/auth/auth.service';
import {
  EmployeeDashboard as DashboardData,
} from '../../../core/models/models';
import { ExpenseService } from '../../../core/services/expense.service';
import { PageHeader } from '../../../shared/components/page-header';

/**
 * Employee Dashboard:
 * Displays the logged-in employee's expense summary.
 *
 * Flow:
 * Angular Component -> ExpenseService -> GET /api/dashboard/employee
 * -> ASP.NET Core API -> Dashboard data -> Display on screen.
 */
@Component({
  selector: 'app-employee-dashboard',
  imports: [
    CurrencyPipe,
    DatePipe,
    MatCardModule,
    MatIconModule,
    MatProgressBarModule,
    PageHeader,
  ],
  template: `
    <app-page-header
      [title]="'Welcome, ' + (user()?.fullName ?? '')"
      subtitle="Your expense activity at a glance">
    </app-page-header>

    @if (loading()) {
      <mat-progress-bar mode="indeterminate" />
    }

    @if (data(); as d) {
      <div class="stat-grid">

        <mat-card appearance="outlined" class="stat stat--draft">
          <span class="stat__label">Draft expenses</span>
          <span class="stat__value">{{ d.draftCount }}</span>
        </mat-card>

        <mat-card appearance="outlined" class="stat stat--pending">
          <span class="stat__label">Pending approval</span>
          <span class="stat__value">{{ d.pendingCount }}</span>
          <span class="stat__sub">
            {{ d.pendingAmount | currency: 'INR' : 'symbol' : '1.0-0' : 'en-IN' }}
          </span>
        </mat-card>

        <mat-card appearance="outlined" class="stat stat--approved">
          <span class="stat__label">Approved expenses</span>
          <span class="stat__value">{{ d.approvedCount }}</span>
          <span class="stat__sub">
            {{ d.approvedAmount | currency: 'INR' : 'symbol' : '1.0-0' : 'en-IN' }}
          </span>
        </mat-card>

        <mat-card appearance="outlined" class="stat stat--rejected">
          <span class="stat__label">Rejected expenses</span>
          <span class="stat__value">{{ d.rejectedCount }}</span>
        </mat-card>

      </div>

      <mat-card appearance="outlined">
        <mat-card-header>
          <mat-card-title>Recent expenses</mat-card-title>
        </mat-card-header>

        <mat-card-content>
          @if (d.recent.length > 0) {
            <div class="recent-list">
              @for (expense of d.recent; track expense.expenseId) {
                <div class="recent-item">
                  <div>
                    <strong>{{ expense.title }}</strong>
                    <p>{{ expense.expenseNumber }} · {{ expense.categoryName }}</p>
                    <small>{{ expense.expenseDate | date: 'mediumDate' }}</small>
                  </div>

                  <div class="recent-amount">
                    <strong>
                      {{ expense.amount | currency: 'INR' : 'symbol' : '1.0-0' : 'en-IN' }}
                    </strong>
                    <span>{{ expense.status }}</span>
                  </div>
                </div>
              }
            </div>
          } @else {
            <p>No expenses found. Create your first expense to get started.</p>
          }
        </mat-card-content>
      </mat-card>
    }
  `,
})
export class EmployeeDashboard {
  // Gets the currently logged-in employee's information.
  readonly user = inject(AuthService).currentUser;

  // Stores dashboard data received from the backend.
  readonly data = signal<DashboardData | null>(null);

  // Tracks whether the API request is still running.
  readonly loading = signal(true);

  constructor() {
    // Calls the existing Employee Dashboard API service.
    inject(ExpenseService).getDashboard().subscribe({
      next: (dashboard) => {
        this.data.set(dashboard);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }
}
