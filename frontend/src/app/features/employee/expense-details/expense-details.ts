import { Component, OnInit, inject, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Router, RouterLink } from '@angular/router';
import { filter, switchMap } from 'rxjs';
import { Attachment, ExpenseDetail } from '../../../core/models/models';
import { ExpenseService } from '../../../core/services/expense.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ConfirmDialog } from '../../../shared/components/confirm-dialog';
import { ExpenseDetailView } from '../../../shared/components/expense-detail-view';
import { PageHeader } from '../../../shared/components/page-header';

/**
 * Employee's view of one claim. Shows Edit / Submit buttons only when the API says
 * they are allowed (canEdit / canSubmit flags), so the rules stay on the server.
 */
@Component({
  selector: 'app-expense-details',
  imports: [RouterLink, MatButtonModule, MatIconModule, MatProgressBarModule, PageHeader, ExpenseDetailView],
  template: `
    @if (expense(); as e) {
      <app-page-header [title]="e.expenseNumber" subtitle="Expense details">
        <a mat-button routerLink="/employee/expenses"><mat-icon>arrow_back</mat-icon>Back</a>
        @if (e.canEdit) {
          <a mat-stroked-button [routerLink]="['/employee/expenses', e.expenseId, 'edit']"><mat-icon>edit</mat-icon>Edit</a>
        }
        @if (e.canEdit) {
          <button mat-flat-button [disabled]="!e.canSubmit || busy()" (click)="submit()"
                  [title]="e.canSubmit ? '' : 'Attach a receipt first'">
            <mat-icon>send</mat-icon>{{ e.status === 'Rejected' ? 'Resubmit' : 'Submit for approval' }}
          </button>
        }
      </app-page-header>
      @if (busy()) {
        <mat-progress-bar mode="indeterminate" />
      }
      <app-expense-detail-view [expense]="e" [allowDeleteReceipts]="e.canEdit" (deleteReceipt)="deleteReceipt($event)" />
    } @else {
      <mat-progress-bar mode="indeterminate" />
    }
  `,
})
export class ExpenseDetails implements OnInit {
  private readonly expenses = inject(ExpenseService);
  private readonly notify = inject(NotificationService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);

  readonly id = input.required<string>();
  readonly expense = signal<ExpenseDetail | null>(null);
  readonly busy = signal(false);

  ngOnInit(): void {
    this.expenses.getById(Number(this.id())).subscribe({
      next: (e) => this.expense.set(e),
      error: () => this.router.navigate(['/employee/expenses']),
    });
  }

  submit(): void {
    const e = this.expense()!;
    this.dialog
      .open(ConfirmDialog, {
        data: {
          title: 'Submit for approval?',
          message: `${e.expenseNumber} will be sent to your manager. You cannot edit it while it is pending.`,
          confirmText: 'Submit',
        },
      })
      .afterClosed()
      .pipe(
        filter((ok) => ok === true),
        switchMap(() => {
          this.busy.set(true);
          return this.expenses.submit(e.expenseId);
        }),
      )
      .subscribe({
        next: (updated) => {
          this.expense.set(updated);
          this.busy.set(false);
          this.notify.success(`${updated.expenseNumber} submitted for approval.`);
        },
        error: () => this.busy.set(false),
      });
  }

  deleteReceipt(attachment: Attachment): void {
    const e = this.expense()!;
    this.expenses.deleteReceipt(e.expenseId, attachment.attachmentId).subscribe(() => {
      // Reload so canSubmit is recalculated by the server.
      this.expenses.getById(e.expenseId).subscribe((fresh) => this.expense.set(fresh));
      this.notify.success('Receipt removed.');
    });
  }
}
