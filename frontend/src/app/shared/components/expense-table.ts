import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { ExpenseSummary } from '../../core/models/models';
import { StatusBadge } from './status-badge';

/**
 * Reusable table of expense rows (My Expenses, Pending Approvals, Team Expenses, dashboards).
 * The parent decides which columns to show and what happens when a row is clicked.
 */
@Component({
  selector: 'app-expense-table',
  imports: [MatTableModule, CurrencyPipe, DatePipe, StatusBadge],
  template: `
    <div class="table-wrap">
      <table mat-table [dataSource]="rows()" class="expense-table">
        <ng-container matColumnDef="expenseNumber">
          <th mat-header-cell *matHeaderCellDef>Number</th>
          <td mat-cell *matCellDef="let r" class="mono">{{ r.expenseNumber }}</td>
        </ng-container>
        <ng-container matColumnDef="title">
          <th mat-header-cell *matHeaderCellDef>Title</th>
          <td mat-cell *matCellDef="let r">{{ r.title }}</td>
        </ng-container>
        <ng-container matColumnDef="employeeName">
          <th mat-header-cell *matHeaderCellDef>Employee</th>
          <td mat-cell *matCellDef="let r">{{ r.employeeName }}</td>
        </ng-container>
        <ng-container matColumnDef="categoryName">
          <th mat-header-cell *matHeaderCellDef>Category</th>
          <td mat-cell *matCellDef="let r">{{ r.categoryName }}</td>
        </ng-container>
        <ng-container matColumnDef="expenseDate">
          <th mat-header-cell *matHeaderCellDef>Date</th>
          <td mat-cell *matCellDef="let r">{{ r.expenseDate | date: 'mediumDate' }}</td>
        </ng-container>
        <ng-container matColumnDef="submittedAt">
          <th mat-header-cell *matHeaderCellDef>Submitted</th>
          <td mat-cell *matCellDef="let r">{{ r.submittedAt ? (r.submittedAt | date: 'medium') : '—' }}</td>
        </ng-container>
        <ng-container matColumnDef="amount">
          <th mat-header-cell *matHeaderCellDef class="num">Amount</th>
          <td mat-cell *matCellDef="let r" class="num">{{ r.amount | currency: 'INR' : 'symbol' : '1.2-2' : 'en-IN' }}</td>
        </ng-container>
        <ng-container matColumnDef="status">
          <th mat-header-cell *matHeaderCellDef>Status</th>
          <td mat-cell *matCellDef="let r"><app-status-badge [status]="r.status" /></td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="columns()"></tr>
        <tr mat-row *matRowDef="let row; columns: columns()" class="clickable" (click)="rowClick.emit(row)"></tr>
      </table>
    </div>
  `,
})
export class ExpenseTable {
  readonly rows = input.required<ExpenseSummary[]>();
  readonly columns = input<string[]>(['expenseNumber', 'title', 'categoryName', 'expenseDate', 'amount', 'status']);
  readonly rowClick = output<ExpenseSummary>();
}
