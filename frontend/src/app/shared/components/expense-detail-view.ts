import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Attachment, ExpenseDetail, PAYMENT_METHODS } from '../../core/models/models';

import { ExpenseService } from '../../core/services/expense.service';
import { ReceiptViewerDialog } from './receipt-viewer-dialog';
import { StatusBadge } from './status-badge';

interface TimelineEvent {
  label: string;
  by: string;
  at: string;
  comments: string | null;
  tone: 'neutral' | 'ok' | 'bad';
}

/**
 * Read-only view of one expense: details, receipts and approval timeline.
 * Shared by the employee's Expense Details screen and the manager's Approval Details
 * screen, so both always show the same information. Action buttons live in the parents.
 */
@Component({
  selector: 'app-expense-detail-view',
  imports: [CurrencyPipe, DatePipe, DecimalPipe, MatCardModule, MatIconModule, MatButtonModule, MatTooltipModule, StatusBadge],
  templateUrl: './expense-detail-view.html',
})
export class ExpenseDetailView {
  private readonly expenses = inject(ExpenseService);
  private readonly dialog = inject(MatDialog);

  readonly expense = input.required<ExpenseDetail>();
  /** When true, each receipt gets a delete button (employee editing a Draft/Rejected claim). */
  readonly allowDeleteReceipts = input(false);
  readonly deleteReceipt = output<Attachment>();

  /**
   * Submission + every manager decision, in date order. The API only keeps the latest
   * submission time, so after a rejection and re-submit it appears after the rejection.
   */
  readonly timeline = computed<TimelineEvent[]>(() => {
    const e = this.expense();
    const events: TimelineEvent[] = e.history.map((h) => ({
      label: h.action,
      by: h.approverName,
      at: h.actionDate,
      comments: h.comments,
      tone: h.action === 'Approved' ? 'ok' : 'bad',
    }));
    if (e.submittedAt) {
      events.push({ label: 'Submitted', by: e.employeeName, at: e.submittedAt, comments: null, tone: 'neutral' });
    }
    return events.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
  });

  paymentLabel(value: string): string {
    return PAYMENT_METHODS.find((p) => p.value === value)?.label ?? value;
  }

  openReceipt(attachment: Attachment): void {
    this.expenses.downloadReceipt(this.expense().expenseId, attachment.attachmentId).subscribe((blob) =>
      this.dialog.open(ReceiptViewerDialog, {
        data: { fileName: attachment.fileName, blob },
        width: '900px',
        maxWidth: '95vw',
      }),
    );
  }
}
