
import { Component, OnInit, inject, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Router, RouterLink } from '@angular/router';

import { Attachment, ExpenseDetail } from '../../../core/models/models';
import { ExpenseService } from '../../../core/services/expense.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ExpenseDetailView } from '../../../shared/components/expense-detail-view';
import { PageHeader } from '../../../shared/components/page-header';

@Component({
  selector: 'app-employee-expense-details',
  imports: [
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    PageHeader,
    ExpenseDetailView,
  ],
  template: `
    @if (expense(); as e) {

      <app-page-header
        [title]="e.expenseNumber"
        subtitle="Your expense details">

        <a mat-button routerLink="/employee/expenses">
          <mat-icon>arrow_back</mat-icon>
          Back
        </a>

        @if (e.canSubmit) {
          <button
            mat-flat-button
            [disabled]="busy()"
            (click)="submit()">
            <mat-icon>send</mat-icon>
            Submit expense
          </button>
        }

      </app-page-header>

      @if (busy()) {
        <mat-progress-bar mode="indeterminate" />
      }

      @if (errorMessage()) {
        <p class="error-message">{{ errorMessage() }}</p>
      }

      <!-- Show receipt upload only when the expense can be edited. -->
      @if (e.canEdit) {
        <section class="receipt-upload">
          <h3>Upload Receipt</h3>

          <input
            type="file"
            accept="image/*,.pdf"
            (change)="uploadReceipt($event)"
            [disabled]="busy()"
          />
        </section>
      }

      <!-- Display expense information and uploaded receipts. -->
      <app-expense-detail-view
        [expense]="e"
        [allowDeleteReceipts]="e.canEdit"
        (deleteReceipt)="removeReceipt($event)"
      />

    } @else {

      @if (loading()) {
        <mat-progress-bar mode="indeterminate" />
      } @else {
        <p>Unable to load expense details.</p>
        <a mat-button routerLink="/employee/expenses">
          Back to My Expenses
        </a>
      }

    }
  `,
})
export class EmployeeExpenseDetails implements OnInit {

  // Reads the expense ID from the URL.
  readonly id = input.required<string>();

  // Backend service used to retrieve and update expenses.
  private readonly expenses = inject(ExpenseService);

  // Displays success notifications.
  private readonly notify = inject(NotificationService);

  // Used for navigation.
  private readonly router = inject(Router);

  // Stores the selected expense details.
  readonly expense = signal<ExpenseDetail | null>(null);

  // Tracks loading and action processing.
  readonly loading = signal(true);
  readonly busy = signal(false);

  // Stores an error message if an API operation fails.
  readonly errorMessage = signal('');

  ngOnInit(): void {
    this.loadExpense();
  }

  // Retrieves the selected expense from the backend.
  loadExpense(): void {
    this.loading.set(true);

    this.expenses.getById(Number(this.id())).subscribe({
      next: (result) => {
        this.expense.set(result);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Unable to load expense:', error);
        this.loading.set(false);
        this.errorMessage.set('Unable to load expense details.');
      },
    });
  }

  // Submits the expense for manager approval.
  submit(): void {
    const currentExpense = this.expense();

    if (!currentExpense || !currentExpense.canSubmit) {
      return;
    }

    this.busy.set(true);
    this.errorMessage.set('');

    this.expenses.submit(currentExpense.expenseId).subscribe({
      next: (updatedExpense) => {
        this.expense.set(updatedExpense);
        this.busy.set(false);

        this.notify.success(
          `${updatedExpense.expenseNumber} submitted successfully.`,
        );
      },
      error: (error) => {
        console.error('Expense submission failed:', error);
        this.busy.set(false);
        this.errorMessage.set('Unable to submit expense. Please try again.');
      },
    });
  }

  // Uploads a receipt for the selected expense.
  uploadReceipt(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    const currentExpense = this.expense();

    if (!file || !currentExpense || !currentExpense.canEdit) {
      return;
    }

    this.busy.set(true);
    this.errorMessage.set('');

    // Send the selected file to the backend.
    this.expenses.uploadReceipt(currentExpense.expenseId, file)
      .subscribe({
        next: () => {
          this.busy.set(false);
          this.notify.success('Receipt uploaded successfully.');

          // Refresh the expense details to show the new receipt.
          this.loadExpense();
          input.value = '';
        },
        error: (error) => {
          console.error('Receipt upload failed:', error);
          this.busy.set(false);
          this.errorMessage.set('Unable to upload receipt.');
          input.value = '';
        },
      });
  }

  // Deletes a receipt attached to this expense.
  removeReceipt(attachment: Attachment): void {
    const currentExpense = this.expense();

    if (!currentExpense || !currentExpense.canEdit) {
      return;
    }

    this.busy.set(true);
    this.errorMessage.set('');

    this.expenses
      .deleteReceipt(currentExpense.expenseId, attachment.attachmentId)
      .subscribe({
        next: () => {
          this.busy.set(false);
          this.notify.success('Receipt deleted successfully.');

          // Reload the expense to display the updated receipt list.
          this.loadExpense();
        },
        error: (error) => {
          console.error('Receipt deletion failed:', error);
          this.busy.set(false);
          this.errorMessage.set('Unable to delete the receipt.');
        },
      });
  }
}
