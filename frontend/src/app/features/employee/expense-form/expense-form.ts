import { DecimalPipe } from '@angular/common';
import { Component, OnInit, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { Router, RouterLink } from '@angular/router';
import { Observable, concatMap, filter, from, last, map, of, switchMap, tap, toArray } from 'rxjs';
import { Attachment, Category, ExpenseDetail, ExpenseRequest, PAYMENT_METHODS, PaymentMethod } from '../../../core/models/models';
import { ExpenseService } from '../../../core/services/expense.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ConfirmDialog } from '../../../shared/components/confirm-dialog';
import { PageHeader } from '../../../shared/components/page-header';
import {
  RECEIPT_RULES,
  checkReceipt,
  fromIsoDate,
  notFutureDate,
  toIsoDate,
} from '../../../shared/validators/expense.validators';

/**
 * Create AND edit screen (same form; the :id route parameter decides which).
 *
 * Save flow, written as one RxJS chain so the steps run in order:
 *   1. POST /api/expenses (new) or PUT /api/expenses/{id} (edit)  -> Draft saved
 *   2. POST /api/expenses/{id}/attachments for each new receipt, one after another
 *   3. (Save & submit only) POST /api/expenses/{id}/submit         -> PendingApproval
 *   4. Navigate to the details screen
 */
@Component({
  selector: 'app-expense-form',
  imports: [
    DecimalPipe,
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    PageHeader,
  ],
  templateUrl: './expense-form.html',
})
export class ExpenseForm implements OnInit {
  private readonly expenses = inject(ExpenseService);
  private readonly notify = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);

  /** Route parameter (/employee/expenses/:id/edit). Undefined on the "new" route. */
  readonly id = input<string>();

  readonly categories = signal<Category[]>([]);
  readonly existing = signal<ExpenseDetail | null>(null);
  readonly newFiles = signal<File[]>([]);
  readonly fileError = signal<string | null>(null);
  readonly saving = signal(false);
  readonly loading = signal(false);

  readonly paymentMethods = PAYMENT_METHODS;
  readonly accept = RECEIPT_RULES.accept;
  readonly today = new Date();

  readonly form = inject(FormBuilder).group({
    title: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(150)]],
    categoryId: [null as number | null, Validators.required],
    expenseDate: [new Date() as Date | null, [Validators.required, notFutureDate]],
    amount: [null as number | null, [Validators.required, Validators.min(0.01), Validators.max(9_999_999_999.99)]],
    merchantName: ['', Validators.maxLength(150)],
    paymentMethod: ['PersonalCard' as PaymentMethod, Validators.required],
    description: ['', Validators.maxLength(1000)],
  });

  get isEdit(): boolean {
    return !!this.id();
  }

  ngOnInit(): void {
    this.expenses.getCategories().subscribe((c) => this.categories.set(c));

    if (this.isEdit) {
      this.loading.set(true);
      this.expenses.getById(Number(this.id())).subscribe({
        next: (e) => {
          if (!e.canEdit) {
            this.notify.error('This expense can no longer be edited.');
            this.router.navigate(['/employee/expenses', e.expenseId]);
            return;
          }
          this.existing.set(e);
          this.form.patchValue({
            title: e.title,
            categoryId: e.categoryId,
            expenseDate: fromIsoDate(e.expenseDate),
            amount: e.amount,
            merchantName: e.merchantName ?? '',
            paymentMethod: e.paymentMethod,
            description: e.description ?? '',
          });
          this.loading.set(false);
        },
        error: () => this.router.navigate(['/employee/expenses']),
      });
    }
  }

  // ---------------------------------------------------------------- receipts

  onFilesSelected(event: Event): void {
    const inputEl = event.target as HTMLInputElement;
    const picked = Array.from(inputEl.files ?? []);
    inputEl.value = ''; // allow picking the same file again later

    for (const file of picked) {
      const error = checkReceipt(file);
      if (error) {
        this.fileError.set(`${file.name}: ${error}`);
        return;
      }
    }
    this.fileError.set(null);
    this.newFiles.update((files) => [...files, ...picked]);
  }

  removeNewFile(index: number): void {
    this.newFiles.update((files) => files.filter((_, i) => i !== index));
  }

  removeExisting(attachment: Attachment): void {
    const expense = this.existing();
    if (!expense) return;
    this.expenses.deleteReceipt(expense.expenseId, attachment.attachmentId).subscribe(() => {
      this.existing.set({ ...expense, attachments: expense.attachments.filter((a) => a.attachmentId !== attachment.attachmentId) });
      this.notify.success('Receipt removed.');
    });
  }

  get receiptCount(): number {
    return (this.existing()?.attachments.length ?? 0) + this.newFiles().length;
  }

  // ---------------------------------------------------------------- save

  save(submitAfterSave: boolean): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (submitAfterSave && this.receiptCount === 0) {
      this.fileError.set('Attach at least one receipt before submitting.');
      return;
    }

    const confirm$: Observable<boolean> = submitAfterSave
      ? this.dialog
          .open(ConfirmDialog, {
            data: {
              title: 'Submit for approval?',
              message: 'Your manager will review this claim. You cannot edit it while it is pending.',
              confirmText: 'Submit',
            },
          })
          .afterClosed()
          .pipe(map((ok) => ok === true))
      : of(true);

    confirm$
      .pipe(
        filter((ok) => ok),
        switchMap(() => {
          this.saving.set(true);
          return this.saveDraft();
        }),
        // Remember the saved draft: if an upload fails, pressing Save again updates it
        // instead of creating a duplicate expense.
        tap((saved) => this.existing.set(saved)),
        concatMap((saved) => this.uploadNewFiles(saved.expenseId).pipe(map(() => saved))),
        concatMap((saved) => (submitAfterSave ? this.expenses.submit(saved.expenseId) : of(saved))),
      )
      .subscribe({
        next: (result) => {
          this.notify.success(submitAfterSave ? `${result.expenseNumber} submitted for approval.` : `${result.expenseNumber} saved as draft.`);
          this.router.navigate(['/employee/expenses', result.expenseId]);
        },
        error: () => this.saving.set(false),
      });
  }

  private saveDraft(): Observable<ExpenseDetail> {
    const v = this.form.getRawValue();
    const request: ExpenseRequest = {
      title: v.title!.trim(),
      categoryId: v.categoryId!,
      expenseDate: toIsoDate(v.expenseDate!),
      amount: Number(v.amount),
      merchantName: v.merchantName?.trim() || null,
      description: v.description?.trim() || null,
      paymentMethod: v.paymentMethod!,
    };
    const existing = this.existing();
    return existing ? this.expenses.update(existing.expenseId, request) : this.expenses.create(request);
  }

  /** Uploads new receipts one at a time; completes immediately when there are none. */
  private uploadNewFiles(expenseId: number): Observable<unknown> {
    const files = this.newFiles();
    if (files.length === 0) return of(null);
    return from(files).pipe(
      concatMap((file) =>
        this.expenses.uploadReceipt(expenseId, file).pipe(
          // Move the file from "ready to upload" to the uploaded list.
          tap((attachment) => {
            this.newFiles.update((list) => list.filter((f) => f !== file));
            const current = this.existing();
            if (current) this.existing.set({ ...current, attachments: [...current.attachments, attachment] });
          }),
        ),
      ),
      toArray(),
      last(),
    );
  }
}
