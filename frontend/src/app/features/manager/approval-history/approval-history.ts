import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { Router } from '@angular/router';
import { ApprovalHistoryItem } from '../../../core/models/models';
import { ApprovalService } from '../../../core/services/approval.service';
import { EmptyState } from '../../../shared/components/empty-state';
import { PageHeader } from '../../../shared/components/page-header';

/** Audit trail of every approve/reject decision this manager has made. */
@Component({
  selector: 'app-approval-history',
  imports: [CurrencyPipe, DatePipe, MatCardModule, MatTableModule, MatPaginatorModule, MatProgressBarModule, PageHeader, EmptyState],
  template: `
    <app-page-header title="My decisions" subtitle="Every approval and rejection you have made" />
    <mat-card appearance="outlined">
      @if (loading()) {
        <mat-progress-bar mode="indeterminate" />
      }
      @if (rows().length > 0) {
        <div class="table-wrap">
          <table mat-table [dataSource]="rows()">
            <ng-container matColumnDef="actionDate">
              <th mat-header-cell *matHeaderCellDef>When</th>
              <td mat-cell *matCellDef="let r">{{ r.actionDate | date: 'medium' }}</td>
            </ng-container>
            <ng-container matColumnDef="expense">
              <th mat-header-cell *matHeaderCellDef>Expense</th>
              <td mat-cell *matCellDef="let r"><span class="mono">{{ r.expenseNumber }}</span> · {{ r.expenseTitle }}</td>
            </ng-container>
            <ng-container matColumnDef="employeeName">
              <th mat-header-cell *matHeaderCellDef>Employee</th>
              <td mat-cell *matCellDef="let r">{{ r.employeeName }}</td>
            </ng-container>
            <ng-container matColumnDef="amount">
              <th mat-header-cell *matHeaderCellDef class="num">Amount</th>
              <td mat-cell *matCellDef="let r" class="num">{{ r.amount | currency: 'INR' : 'symbol' : '1.2-2' : 'en-IN' }}</td>
            </ng-container>
            <ng-container matColumnDef="action">
              <th mat-header-cell *matHeaderCellDef>Decision</th>
              <td mat-cell *matCellDef="let r"><span [class]="'badge badge--' + r.action">{{ r.action }}</span></td>
            </ng-container>
            <ng-container matColumnDef="comments">
              <th mat-header-cell *matHeaderCellDef>Comment</th>
              <td mat-cell *matCellDef="let r" class="muted">{{ r.comments || '—' }}</td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="columns"></tr>
            <tr mat-row *matRowDef="let row; columns: columns" class="clickable" (click)="open(row)"></tr>
          </table>
        </div>
        <mat-paginator [length]="total()" [pageIndex]="page() - 1" [pageSize]="pageSize()"
                       [pageSizeOptions]="[5, 10, 25]" (page)="onPage($event)" />
      } @else if (!loading()) {
        <app-empty-state icon="history" title="No decisions yet" message="Approvals and rejections you make will be listed here." />
      }
    </mat-card>
  `,
})
export class ApprovalHistory {
  private readonly approvals = inject(ApprovalService);
  private readonly router = inject(Router);

  readonly columns = ['actionDate', 'expense', 'employeeName', 'amount', 'action', 'comments'];
  readonly rows = signal<ApprovalHistoryItem[]>([]);
  readonly total = signal(0);
  readonly loading = signal(false);
  readonly page = signal(1);
  readonly pageSize = signal(10);

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.approvals.getHistory(this.page(), this.pageSize()).subscribe({
      next: (result) => {
        this.rows.set(result.items);
        this.total.set(result.totalCount);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  onPage(event: PageEvent): void {
    this.page.set(event.pageIndex + 1);
    this.pageSize.set(event.pageSize);
    this.load();
  }

  open(row: ApprovalHistoryItem): void {
    this.router.navigate(['/manager/expenses', row.expenseId]);
  }
}
