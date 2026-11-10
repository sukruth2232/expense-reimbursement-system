import { CurrencyPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ExpenseDetail } from '../../../core/models/models';

export interface DecisionDialogData {
  mode: 'approve' | 'reject';
  expense: ExpenseDetail;
}

export interface DecisionDialogResult {
  text: string;
}

/**
 * Approve (optional comment) or Reject (reason REQUIRED, 5-1000 characters).
 * The same rule is enforced by RejectExpenseRequest in C# and by a CHECK constraint in PostgreSQL.
 */
@Component({
  selector: 'app-decision-dialog',
  imports: [CurrencyPipe, ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  template: `
    <h2 mat-dialog-title>{{ isReject ? 'Reject' : 'Approve' }} {{ data.expense.expenseNumber }}?</h2>
    <mat-dialog-content>
      <p>
        {{ data.expense.title }} — {{ data.expense.employeeName }},
        <strong>{{ data.expense.amount | currency: 'INR' : 'symbol' : '1.2-2' : 'en-IN' }}</strong>
      </p>
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>{{ isReject ? 'Reason for rejection' : 'Comment (optional)' }}</mat-label>
        <textarea matInput rows="4" [formControl]="text" maxlength="1000"></textarea>
        @if (text.hasError('required')) {
          <mat-error>A rejection reason is required.</mat-error>
        } @else if (text.hasError('minlength')) {
          <mat-error>Please write at least 5 characters.</mat-error>
        }
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-flat-button [class]="isReject ? 'btn-reject-solid' : 'btn-approve'" (click)="confirm()">
        {{ isReject ? 'Reject claim' : 'Approve claim' }}
      </button>
    </mat-dialog-actions>
  `,
})
export class DecisionDialog {
  readonly data = inject<DecisionDialogData>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<DecisionDialog, DecisionDialogResult>);

  readonly isReject = this.data.mode === 'reject';
  readonly text = new FormControl('', {
    nonNullable: true,
    validators: this.isReject ? [Validators.required, Validators.minLength(5), Validators.maxLength(1000)] : [Validators.maxLength(1000)],
  });

  confirm(): void {
    if (this.text.invalid) {
      this.text.markAsTouched();
      return;
    }
    this.ref.close({ text: this.text.value.trim() });
  }
}
