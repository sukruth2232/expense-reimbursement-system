import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Client-side copies of the server rules, so users see mistakes immediately.
 * The API repeats every check (NotInFutureAttribute, Range, file signature check),
 * because anything in the browser can be bypassed.
 */

/** Expense date must be today or earlier. Matches [NotInFuture] in C#. */
export const notFutureDate: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const value = control.value as Date | null;
  if (!value) return null;
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  return value.getTime() > endOfToday.getTime() ? { futureDate: true } : null;
};

export const RECEIPT_RULES = {
  maxBytes: 5 * 1024 * 1024,
  extensions: ['.jpg', '.jpeg', '.png', '.pdf'],
  accept: '.jpg,.jpeg,.png,.pdf',
};

/** Returns an error message, or null when the file is acceptable. */
export function checkReceipt(file: File): string | null {
  const name = file.name.toLowerCase();
  if (!RECEIPT_RULES.extensions.some((ext) => name.endsWith(ext))) {
    return 'Only JPG, PNG or PDF receipts are allowed.';
  }
  if (file.size === 0) return 'The file is empty.';
  if (file.size > RECEIPT_RULES.maxBytes) return 'Receipt must be 5 MB or smaller.';
  return null;
}

/** Formats a Date as yyyy-MM-dd in local time (what the API expects for DateOnly). */
export function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Parses yyyy-MM-dd as a local date (avoids the UTC off-by-one-day bug of new Date('2026-11-05')). */
export function fromIsoDate(value: string): Date {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d);
}
