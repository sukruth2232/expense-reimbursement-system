import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  Attachment,
  Category,
  EmployeeDashboard,
  ExpenseDetail,
  ExpenseRequest,
  ExpenseStatus,
  ExpenseSummary,
  PagedResult,
} from '../models/models';

/**
 * Every employee-side API call in one place (Member 1's module).
 * Components never build URLs themselves; they call these methods.
 * URLs are relative ("/api/...") - in development the Angular proxy forwards them
 * to the ASP.NET Core API (see proxy.conf.json).
 */
@Injectable({ providedIn: 'root' })
export class ExpenseService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/expenses';

  getCategories(): Observable<Category[]> {
    return this.http.get<Category[]>('/api/categories');
  }

  getMyExpenses(page: number, pageSize: number, status?: ExpenseStatus | null): Observable<PagedResult<ExpenseSummary>> {
    let params = new HttpParams().set('page', page).set('pageSize', pageSize);
    if (status) params = params.set('status', status);
    return this.http.get<PagedResult<ExpenseSummary>>(`${this.base}/my`, { params });
  }

  getById(id: number): Observable<ExpenseDetail> {
    return this.http.get<ExpenseDetail>(`${this.base}/${id}`);
  }

  create(request: ExpenseRequest): Observable<ExpenseDetail> {
    return this.http.post<ExpenseDetail>(this.base, request);
  }

  update(id: number, request: ExpenseRequest): Observable<ExpenseDetail> {
    return this.http.put<ExpenseDetail>(`${this.base}/${id}`, request);
  }

  submit(id: number): Observable<ExpenseDetail> {
    return this.http.post<ExpenseDetail>(`${this.base}/${id}/submit`, {});
  }

  /** Sends the file as multipart/form-data with the field name "file" (matches IFormFile file in C#). */
  uploadReceipt(id: number, file: File): Observable<Attachment> {
    const form = new FormData();
    form.append('file', file, file.name);
    return this.http.post<Attachment>(`${this.base}/${id}/attachments`, form);
  }

  deleteReceipt(id: number, attachmentId: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}/attachments/${attachmentId}`);
  }

  /** Downloads a receipt as a Blob (with the JWT) so it can be previewed in the page. */
  downloadReceipt(id: number, attachmentId: number): Observable<Blob> {
    return this.http.get(`${this.base}/${id}/attachments/${attachmentId}`, { responseType: 'blob' });
  }

  getDashboard(): Observable<EmployeeDashboard> {
    return this.http.get<EmployeeDashboard>('/api/dashboard/employee');
  }
}
