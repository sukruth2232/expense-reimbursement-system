// TypeScript shapes of the JSON the API sends and receives.
// They mirror the C# DTOs in ExpenseReimbursement.Core/DTOs one-to-one.

export type UserRole = 'Employee' | 'Manager';
export type ExpenseStatus = 'Draft' | 'PendingApproval' | 'Approved' | 'Rejected';
export type PaymentMethod = 'Cash' | 'CorporateCard' | 'PersonalCard' | 'Upi' | 'BankTransfer' | 'Other';
export type ApprovalAction = 'Approved' | 'Rejected';

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'Cash', label: 'Cash' },
  { value: 'CorporateCard', label: 'Corporate card' },
  { value: 'PersonalCard', label: 'Personal card' },
  { value: 'Upi', label: 'UPI' },
  { value: 'BankTransfer', label: 'Bank transfer' },
  { value: 'Other', label: 'Other' },
];

export const STATUS_LABELS: Record<ExpenseStatus, string> = {
  Draft: 'Draft',
  PendingApproval: 'Pending approval',
  Approved: 'Approved',
  Rejected: 'Rejected',
};

// ---- Auth -------------------------------------------------------------------
export interface LoginRequest {
  email: string;
  password: string;
}

export interface CurrentUser {
  userId: number;
  fullName: string;
  email: string;
  role: UserRole;
  managerName: string | null;
}

export interface LoginResponse {
  accessToken: string;
  expiresAt: string;
  user: CurrentUser;
}

// ---- Expenses ---------------------------------------------------------------
export interface Category {
  categoryId: number;
  categoryName: string;
}

export interface ExpenseRequest {
  title: string;
  categoryId: number;
  expenseDate: string; // yyyy-MM-dd
  amount: number;
  merchantName: string | null;
  description: string | null;
  paymentMethod: PaymentMethod;
}

export interface ExpenseSummary {
  expenseId: number;
  expenseNumber: string;
  title: string;
  categoryName: string;
  amount: number;
  expenseDate: string;
  status: ExpenseStatus;
  submittedAt: string | null;
  employeeName: string;
}

export interface Attachment {
  attachmentId: number;
  fileName: string;
  contentType: string;
  fileSizeBytes: number;
  uploadedAt: string;
}

export interface ApprovalHistoryEntry {
  approvalId: number;
  action: ApprovalAction;
  approverName: string;
  comments: string | null;
  actionDate: string;
}

export interface ExpenseDetail {
  expenseId: number;
  expenseNumber: string;
  title: string;
  categoryId: number;
  categoryName: string;
  amount: number;
  expenseDate: string;
  merchantName: string | null;
  description: string | null;
  paymentMethod: PaymentMethod;
  status: ExpenseStatus;
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
  employeeName: string;
  assignedManagerName: string | null;
  canEdit: boolean;
  canSubmit: boolean;
  canApprove: boolean;
  rejectionReason: string | null;
  attachments: Attachment[];
  history: ApprovalHistoryEntry[];
}

export interface PagedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
}

// ---- Manager ----------------------------------------------------------------
export interface ApprovalHistoryItem {
  approvalId: number;
  expenseId: number;
  expenseNumber: string;
  expenseTitle: string;
  employeeName: string;
  amount: number;
  action: ApprovalAction;
  comments: string | null;
  actionDate: string;
}

// ---- Dashboards -------------------------------------------------------------
export interface EmployeeDashboard {
  draftCount: number;
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
  pendingAmount: number;
  approvedAmount: number;
  recent: ExpenseSummary[];
}

export interface ManagerDashboard {
  teamSize: number;
  pendingCount: number;
  pendingAmount: number;
  approvedThisMonth: number;
  rejectedThisMonth: number;
  oldestPending: ExpenseSummary[];
}

// ---- Errors (RFC 7807 ProblemDetails) ----------------------------------------
export interface ProblemDetails {
  title?: string;
  status?: number;
  detail?: string;
  errors?: Record<string, string[]>;
}
