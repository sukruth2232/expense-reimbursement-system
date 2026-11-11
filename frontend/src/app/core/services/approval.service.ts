import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  ApprovalHistoryItem,
  ExpenseDetail,
  ExpenseStatus,
  ExpenseSummary,
  ManagerDashboard,
  PagedResult,
  TeamMember,
} from '../models/models';

/** Every manager-side API call in one place (Member 2's module). */
@Injectable({ providedIn: 'root' })
export class ApprovalService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/manager';

  getTeamMembers(): Observable<TeamMember[]> {
    return this.http.get<TeamMember[]>(`${this.base}/team-members`);
  }

  getPending(page: number, pageSize: number): Observable<PagedResult<ExpenseSummary>> {
    const params = new HttpParams().set('page', page).set('pageSize', pageSize);
    return this.http.get<PagedResult<ExpenseSummary>>(`${this.base}/pending`, { params });
  }

  getTeamExpenses(page: number, pageSize: number, status?: ExpenseStatus | null): Observable<PagedResult<ExpenseSummary>> {
    let params = new HttpParams().set('page', page).set('pageSize', pageSize);
    if (status) params = params.set('status', status);
    return this.http.get<PagedResult<ExpenseSummary>>(`${this.base}/team-expenses`, { params });
  }

  getHistory(page: number, pageSize: number): Observable<PagedResult<ApprovalHistoryItem>> {
    const params = new HttpParams().set('page', page).set('pageSize', pageSize);
    return this.http.get<PagedResult<ApprovalHistoryItem>>(`${this.base}/approval-history`, { params });
  }

  approve(expenseId: number, comments: string | null): Observable<ExpenseDetail> {
    return this.http.post<ExpenseDetail>(`${this.base}/${expenseId}/approve`, { comments });
  }

  reject(expenseId: number, reason: string): Observable<ExpenseDetail> {
    return this.http.post<ExpenseDetail>(`${this.base}/${expenseId}/reject`, { reason });
  }

  getDashboard(): Observable<ManagerDashboard> {
    return this.http.get<ManagerDashboard>('/api/dashboard/manager');
  }
}
