
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';

import {
  Category,
  ExpenseRequest,
  PAYMENT_METHODS,
} from '../../../core/models/models';

import { ExpenseService } from '../../../core/services/expense.service';

@Component({
  selector: 'app-create-expense',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
    MatSelectModule,
  ],
  templateUrl: './create-expense.html',
})
export class CreateExpense implements OnInit {
  // Inject the services required by this component.
  private readonly fb = inject(FormBuilder);
  private readonly expenses = inject(ExpenseService);
  private readonly router = inject(Router);

  // Store categories and payment methods for the dropdowns.
  readonly categories = signal<Category[]>([]);
  readonly paymentMethods = PAYMENT_METHODS;

  // Track loading and submission states.
  readonly loadingCategories = signal(true);
  readonly saving = signal(false);
  readonly errorMessage = signal('');

  // Create the expense form and define validation rules.
  readonly form = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(150)]],
    categoryId: [null as number | null, Validators.required],
    expenseDate: [this.getToday(), Validators.required],
    amount: [null as number | null, [Validators.required, Validators.min(0.01)]],
    merchantName: [''],
    description: [''],
    paymentMethod: ['' as string, Validators.required],
  });

  ngOnInit(): void {
    this.loadCategories();
  }

  // Return today's date in YYYY-MM-DD format for the date input.
  private getToday(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  // Get available expense categories from the backend.
  loadCategories(): void {
    this.expenses.getCategories().subscribe({
      next: (result) => {
        this.categories.set(result);
        this.loadingCategories.set(false);
      },
      error: (error) => {
        console.error('Unable to load categories:', error);
        this.errorMessage.set('Unable to load expense categories.');
        this.loadingCategories.set(false);
      },
    });
  }

  // Validate and save the expense.
  saveExpense(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();

    // Prepare the request expected by the backend API.
    const request: ExpenseRequest = {
      title: value.title!.trim(),
      categoryId: value.categoryId!,
      expenseDate: value.expenseDate!,
      amount: value.amount!,
      merchantName: value.merchantName?.trim() || null,
      description: value.description?.trim() || null,
      paymentMethod: value.paymentMethod as ExpenseRequest['paymentMethod'],
    };

    this.saving.set(true);
    this.errorMessage.set('');

    // Send the expense to POST /api/expenses.
    this.expenses.create(request).subscribe({
      next: (createdExpense) => {
        this.saving.set(false);

        // Open the details page of the newly created expense.
        this.router.navigate([
          '/employee/expenses',
          createdExpense.expenseId,
        ]);
      },
      error: (error) => {
        console.error('Expense creation failed:', error);
        this.errorMessage.set(
          'Unable to create expense. Please check your details and try again.',
        );
        this.saving.set(false);
      },
    });
  }
}
