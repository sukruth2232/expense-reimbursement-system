import { Component, OnInit, inject, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Router, RouterLink } from '@angular/router';
import { Observable, filter, switchMap } from 'rxjs';
import { ExpenseDetail } from '../../../core/models/models';
import { ApprovalService } from '../../../core/services/approval.service';
import { ExpenseService } from '../../../core/services/expense.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ExpenseDetailView } from '../../../shared/components/expense-detail-view';
import { PageHeader } from '../../../shared/components/page-header';
import { DecisionDialog, DecisionDialogResult } from './decision-dialog';

/**
 * Manager's review screen for one claim.
 * Approve / Reject buttons appear only when the API says canApprove = true
 * (claim is pending AND assigned to this manager). The API re-checks on every call.
 */
@Component({
  selector: 'app-approval-details',
  imports: [RouterLink, MatButtonModule, MatIconModule, MatProgressBarModule, PageHeader, ExpenseDetailView],
  template: `
    @if (expense(); as e) {
      <app-page-header [title]="e.expenseNumber" [subtitle]="'Submitted by ' + e.employeeName">
        <a mat-button routerLink="/manager/pending"><mat-icon>arrow_back</mat-icon>Back</a>
        @if (e.canApprove) {
          <button mat-stroked-button class="btn-reject" [disabled]="busy()" (click)="decide('reject')">
            <mat-icon>close</mat-icon>Reject
          </button>
          <button mat-flat-button class="btn-approve" [disabled]="busy()" (click)="decide('approve')">
            <mat-icon>check</mat-icon>Approve
          </button>
        }
      </app-page-header>
      @if (busy()) {
        <mat-progress-bar mode="indeterminate" />
      }
      <app-expense-detail-view [expense]="e" />
    } @else {
      <mat-progress-bar mode="indeterminate" />
    }
  `,
})
export class ApprovalDetails implements OnInit {
  private readonly approvals = inject(ApprovalService);
  private readonly expenses = inject(ExpenseService);
  private readonly notify = inject(NotificationService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);

  readonly id = input.required<string>();
  readonly expense = signal<ExpenseDetail | null>(null);
  readonly busy = signal(false);

  ngOnInit(): void {
    // Same endpoint the employee uses; the API allows it because this manager is the assigned reviewer.
    this.expenses.getById(Number(this.id())).subscribe({
      next: (e) => this.expense.set(e),
      error: () => this.router.navigate(['/manager/pending']),
    });
  }

  decide(mode: 'approve' | 'reject'): void {
    const e = this.expense()!;
    this.dialog
      .open<DecisionDialog, unknown, DecisionDialogResult>(DecisionDialog, {
        data: { mode, expense: e },
        width: '480px',
      })
      .afterClosed()
      .pipe(
        filter((result): result is DecisionDialogResult => !!result),
        switchMap((result): Observable<ExpenseDetail> => {
          this.busy.set(true);
          return mode === 'approve'
            ? this.approvals.approve(e.expenseId, result.text || null)
            : this.approvals.reject(e.expenseId, result.text);
        }),
      )
      .subscribe({
        next: (updated) => {
          this.expense.set(updated);
          this.busy.set(false);
          this.notify.success(`${updated.expenseNumber} ${mode === 'approve' ? 'approved' : 'rejected'}.`);
        },
        error: () => this.busy.set(false),
      });
  }
}
