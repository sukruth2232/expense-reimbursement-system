# Expenso – Implementation Guide

This document explains **how** Expenso is built and **why** each decision was made, so either team member can answer a reviewer's questions about any part of the code.

---

## 1. The big picture

```
 Angular SPA (browser)                ASP.NET Core API                         PostgreSQL
 ─────────────────────                ─────────────────                        ──────────
 Component                            Controller  (HTTP only, no rules)
   │ calls                              │ reads user id from JWT ("sub")
 Service (ExpenseService…)              │ calls ONE service method
   │ HttpClient GET/POST /api/...       ▼
 authInterceptor adds JWT  ─────────▶ Service (business logic, ownership checks)
 errorInterceptor shows errors          │ uses
                                       Entity methods (Submit/Approve/Reject = workflow rules)
                                        │
                                       AppDbContext (EF Core) ───────────────▶ 5 tables
                                       LocalFileStorage ─────────▶ storage/receipts/{expenseId}/{guid}.pdf
```

| Project | Responsibility | Depends on |
| --- | --- | --- |
| `ExpenseReimbursement.Core` | Entities, enums, DTOs, interfaces, workflow rules, custom exceptions | nothing |
| `ExpenseReimbursement.Infrastructure` | EF Core + PostgreSQL, services, JWT creation, password hashing, file storage | Core |
| `ExpenseReimbursement.API` | Controllers, authentication setup, error handling, Swagger, start-up | Core, Infrastructure |

**Why three projects?** Core has no reference to EF Core or ASP.NET, so business rules can be read and unit-tested without a database. If we moved receipts from local disk to Azure Blob, only `Infrastructure/Storage` would change — the rest depends on the `IFileStorage` interface.

---

## 2. One request end-to-end: "Manager approves EXP-000014"

1. **Angular** `ApprovalDetails.decide('approve')` opens `DecisionDialog`, then calls `ApprovalService.approve(14, comment)` → `POST /api/manager/14/approve`.
2. **authInterceptor** adds `Authorization: Bearer <jwt>`.
3. Dev proxy (`proxy.conf.json`) forwards `/api/*` from `localhost:4200` to `localhost:5180`.
4. **JWT middleware** checks signature, issuer, audience and expiry. Invalid → **401**.
5. `[Authorize(Roles = "Manager")]` on `ManagerController` checks the `role` claim. An employee → **403**.
6. `ManagerController.Approve` reads the manager's id via `User.GetUserId()` (the `sub` claim) and calls `IApprovalService.ApproveAsync(14, managerId, request)`.
7. `ApprovalService` loads expense 14 and calls `expense.Approve(managerId, comment, now)`:
   - `AssignedManagerId != managerId` → `NotFoundException` → **404** (another manager can't even learn the claim exists),
   - status not `PendingApproval` → `BusinessRuleException` → **409**,
   - otherwise status becomes `Approved` and an `ApprovalHistory` row is created.
8. `SaveChangesAsync` writes the status change **and** the history row in one transaction. EF adds `WHERE xmin = <old>`; if another click changed the row first, `DbUpdateConcurrencyException` → **409**.
9. The controller returns **200** with the updated `ExpenseDetailDto`; Angular updates the screen and shows a toast.

---

## 3. Database design

| Table | Key columns | Notes |
| --- | --- | --- |
| `Users` | `UserId` PK, `Email` unique, `ManagerId` FK → `Users` | Self-referencing: employee → manager. `Role` stored as text. |
| `ExpenseCategories` | `CategoryId` PK, `CategoryName` unique | Six rows seeded with `HasData` (in the migration). |
| `Expenses` | `ExpenseId` PK, `ExpenseNumber` unique, `EmployeeId` FK, `AssignedManagerId` FK, `CategoryId` FK | `Amount numeric(12,2)`, `ExpenseDate date`, `Status` text. |
| `ExpenseAttachments` | `AttachmentId` PK, `ExpenseId` FK (cascade), `FilePath` unique | Metadata only; the file is on disk. |
| `ApprovalHistory` | `ApprovalId` PK, `ExpenseId` FK (restrict), `ApproverId` FK | Insert-only audit trail. |

**Design questions you may get:**

- **Why `numeric(12,2)` and `decimal`, not float?** Floating point can't represent 0.10 exactly; money must be exact.
- **Why store enums as text?** Readable in pgAdmin, and reordering the C# enum can't corrupt data. CHECK constraints restrict the allowed values.
- **Why `AssignedManagerId` on the expense when the employee already has a `ManagerId`?** It freezes "who must review this" at submit time. If an employee changes team, their pending claims stay with the original reviewer.
- **How is `EXP-000014` generated?** A PostgreSQL sequence `expense_number_seq` used as the column default: `'EXP-' || lpad(nextval(...)::text, 6, '0')`. Unique and race-free, even with concurrent inserts.
- **Delete behaviour?** History and money records use `RESTRICT` (an audited claim can never be deleted). Attachments use `CASCADE` (a receipt row means nothing without its expense).
- **Indexes?** `Users(Email)` unique for login; `Expenses(EmployeeId, Status)` for "My expenses"; `Expenses(AssignedManagerId, Status, SubmittedAt)` for the manager's pending queue; `ApprovalHistory(ExpenseId, ActionDate)` for timelines.
- **Concurrency?** PostgreSQL's hidden `xmin` column is mapped as a row version (`Expense.RowVersion`) — optimistic locking with no extra column.
- **CHECK constraints** (`Amount > 0`, valid statuses, "rejection must have a comment", "non-draft must have SubmittedAt and AssignedManagerId") are a second safety net behind the C# rules.

**Migrations.** EF Core Code First: C# entity classes + `Data/Configurations/*Configuration.cs` define the schema. `dotnet ef migrations add <Name>` generates a migration; the API applies pending migrations at start-up in Development (`Program.cs`).

**Seed data.** Categories via `HasData` (part of the migration). Users via `DbSeeder` at runtime, because a password hash must not be baked into a migration file in Git. The demo password comes from user-secrets.

---

## 4. Expense workflow (state machine)

```
            Submit (needs ≥1 receipt)            Approve
  Draft ───────────────────────────▶ PendingApproval ─────────▶ Approved (final)
    ▲                                     │
    │ edit                                │ Reject (reason required)
    └──────────── Rejected ◀──────────────┘
                  │  edit + Resubmit ──▶ PendingApproval
```

All transitions live in **one place**: methods on `Core/Entities/Expense.cs`. `Status` has a `private set`, so no controller or service can change it directly.

| Rule | Where enforced |
| --- | --- |
| Only Draft/Rejected can be edited, have receipts changed, or be submitted | `Expense.EnsureEditable()` |
| Submit needs ≥ 1 receipt and a manager | `Expense.Submit()` |
| Only the assigned manager can decide | `Expense.Approve/Reject()` → 404 for anyone else |
| Only pending claims can be decided | `Expense.Approve/Reject()` → 409 |
| Rejection needs a reason | `RejectExpenseRequest` (400) + `Expense.Reject()` + DB CHECK |
| Every decision is audited | `Approve/Reject()` create an `ApprovalHistory` row in the same transaction |

Angular never decides these rules. The API returns `canEdit`, `canSubmit`, `canApprove` flags computed for the current user, and Angular only uses them to show or hide buttons.

---

## 5. Security

| Requirement | Implementation | File |
| --- | --- | --- |
| Authentication | JWT (HMAC-SHA256), 60 min, claims `sub`, `email`, `name`, `role` | `Infrastructure/Security/JwtTokenService.cs` |
| Token validation | Signature, issuer, audience, lifetime | `API/Extensions/ApiServiceExtensions.cs` |
| Password storage | ASP.NET Core `PasswordHasher` (PBKDF2, random salt, 100k iterations) | `Infrastructure/Security/PasswordService.cs` |
| Role-based access | `[Authorize(Roles = "Employee")]` / `"Manager"` on controllers/actions | `API/Controllers/*` |
| Never trust the client's identity | User id read only from the JWT `sub` claim; request DTOs have no `EmployeeId` | `API/Extensions/ClaimsPrincipalExtensions.cs` |
| Employee sees only own data | Every query filters `EmployeeId == callerId` | `ExpenseService` |
| Manager sees only own team | Every query filters `AssignedManagerId == managerId` | `ApprovalService` |
| Not-yours returns 404, not 403 | IDs reveal nothing about other users' claims | services |
| Login doesn't leak accounts | Same "Invalid email or password." for unknown email, wrong password, inactive user | `AuthService` |
| Input validation | Data Annotations on DTOs (+ `[NotInFuture]`), mirrored in Angular validators | `Core/DTOs`, `shared/validators` |
| Secure uploads | Extension whitelist, 5 MB limit, **file signature check** (a renamed .exe fails), GUID file names, stored outside wwwroot, served only through an authorized endpoint with `nosniff` | `ExpenseService.AddAttachmentAsync`, `LocalFileStorage` |
| Path traversal | Storage resolves paths and refuses anything outside the receipts folder | `LocalFileStorage.ToFullPath` |
| No secrets in Git | Connection string, JWT key, demo password in user-secrets; `appsettings.json` has empty values | `setup-dev-secrets.ps1` |
| Errors don't leak internals | `GlobalExceptionHandler` → RFC 7807 ProblemDetails; 500s logged, generic message returned | `API/Middleware/GlobalExceptionHandler.cs` |
| Audit | `ApprovalHistory` row for every approve/reject | `Expense.Approve/Reject` |

**Why sessionStorage for the token?** It survives refresh but is cleared when the tab closes. The trade-off vs. HttpOnly cookies (XSS exposure) is acceptable for the MVP; cookies + refresh tokens are a V2 item.

**Why does Angular fetch receipts as a Blob?** `<img src="/api/...">` can't send the `Authorization` header. HttpClient (with the interceptor) downloads the file, and `ReceiptViewerDialog` shows it via a temporary object URL.

---

## 6. API reference

All routes except login require `Authorization: Bearer <token>`. Errors use ProblemDetails `{ title, status, detail, errors? }`.

| Method | Route | Role | Success | Typical errors |
| --- | --- | --- | --- | --- |
| POST | `/api/auth/login` | anonymous | 200 `{ accessToken, expiresAt, user }` | 400, 401 |
| GET | `/api/auth/me` | any | 200 user | 401 |
| GET | `/api/categories` | any | 200 list | 401 |
| POST | `/api/expenses` | Employee | 201 detail (Draft) | 400 |
| GET | `/api/expenses/my?status=&page=&pageSize=` | Employee | 200 paged | |
| GET | `/api/expenses/{id}` | owner or assigned manager | 200 detail | 404 |
| PUT | `/api/expenses/{id}` | Employee (owner) | 200 detail | 400, 404, 409 |
| POST | `/api/expenses/{id}/submit` | Employee (owner) | 200 detail | 404, 409 |
| POST | `/api/expenses/{id}/attachments` (form field `file`) | Employee (owner) | 201 attachment | 404, 409 |
| DELETE | `/api/expenses/{id}/attachments/{attachmentId}` | Employee (owner) | 204 | 404, 409 |
| GET | `/api/expenses/{id}/attachments/{attachmentId}` | owner or assigned manager | 200 file | 404 |
| GET | `/api/manager/pending?page=&pageSize=` | Manager | 200 paged (oldest first) | |
| GET | `/api/manager/team-expenses?status=&employeeId=` | Manager | 200 paged (no drafts) | |
| POST | `/api/manager/{id}/approve` `{ comments? }` | Manager (assigned) | 200 detail | 404, 409 |
| POST | `/api/manager/{id}/reject` `{ reason }` | Manager (assigned) | 200 detail | 400, 404, 409 |
| GET | `/api/manager/approval-history` | Manager | 200 paged | |
| GET | `/api/dashboard/employee` | Employee | 200 counts + recent | |
| GET | `/api/dashboard/manager` | Manager | 200 counts + oldest pending | |

Status code meaning: **400** invalid input · **401** not logged in / bad token · **403** wrong role · **404** not found or not yours · **409** workflow rule or concurrent change.

---

## 7. Angular structure

```
src/app/
├── app.config.ts            providers: router, HttpClient + interceptors, date adapter, en-IN locale
├── app.routes.ts            /login, shell with /employee/** and /manager/** (lazy, role-guarded), /profile
├── core/
│   ├── auth/                AuthService (signals), authInterceptor, authGuard / roleGuard / guestGuard
│   ├── http/                errorInterceptor (401 → logout, errors → toast)
│   ├── models/models.ts     TypeScript copies of the C# DTOs
│   └── services/            ExpenseService, ApprovalService, NotificationService (all API calls live here)
├── shared/
│   ├── components/          StatusBadge, ExpenseTable, ExpenseDetailView, ConfirmDialog, ReceiptViewerDialog, EmptyState, PageHeader
│   └── validators/          notFutureDate, checkReceipt (same rules as the API)
├── layout/shell/            sidebar + toolbar, role-based menu, responsive drawer
└── features/
    ├── auth/login/
    ├── profile/
    ├── employee/            dashboard, my-expenses, expense-form (create + edit), expense-details
    └── manager/             dashboard, pending-approvals, approval-details (+ decision dialog), team-expenses, approval-history
```

| Concept | Where |
| --- | --- |
| Reactive Forms + validators | `expense-form.ts`, `login.ts`, `decision-dialog.ts` |
| Signals | component state (`rows`, `loading`, `expense`), `AuthService.currentUser` |
| RxJS | `expense-form.save()`: save → upload receipts one by one (`concatMap`) → submit |
| Route guards | `core/auth/auth.guards.ts` |
| Interceptors | `core/auth/auth.interceptor.ts`, `core/http/error.interceptor.ts` |
| Lazy loading | `employee.routes.ts`, `manager.routes.ts` |
| Route params as inputs | `withComponentInputBinding()` → `id = input<string>()` |

**How does Angular talk to ASP.NET Core?** In development Angular runs on port 4200 and the API on 5180. Angular calls relative URLs (`/api/expenses`), and `ng serve` forwards them to the API using `proxy.conf.json`. Because the browser sees one origin, no CORS is needed (a CORS policy for `localhost:4200` exists anyway). In production the built Angular files can be served by the same host or behind the same reverse proxy.

---

## 8. Who built what (two-person split)

| Area | Member 1 (Expenses & Employee) | Member 2 (Auth & Manager) |
| --- | --- | --- |
| Backend | `Expense`, `ExpenseAttachment`, `ExpenseCategory` entities + configs; `ExpenseService`, `CategoryService`; `ExpensesController`, `CategoriesController`; `NotInFutureAttribute`; `LocalFileStorage` | `User`, `ApprovalHistory` entities + configs; `AuthService`, `JwtTokenService`, `PasswordService`, `DbSeeder`; `ApprovalService`; `AuthController`, `ManagerController`; `GlobalExceptionHandler`; JWT setup |
| Frontend | employee dashboard, my-expenses, expense-form, expense-details; `ExpenseService`; validators; `StatusBadge`, `ExpenseTable` | login, shell, guards, interceptors, `AuthService`; manager dashboard, pending approvals, approval details, decision dialog, approval history; `ApprovalService` |
| Phase-2 swap | Team expenses screen + `GET /api/manager/team-expenses` | Receipt viewer + attachment download endpoint; `DashboardService` employee half |

---

## 9. Likely manager questions — short answers

1. **What stops an employee from approving their own claim?** The approve endpoint requires the `Manager` role (from the signed token), and `Expense.Approve` requires `AssignedManagerId == caller`. An employee is never the assigned manager.
2. **Can someone change their role in the browser?** They can edit what Angular shows, but the token is signed with a server key. Any change breaks the signature → 401.
3. **What if two managers approve at once?** Only one manager is assigned. If the same manager double-clicks, the second save fails the `xmin` concurrency check → 409, so only one history row exists.
4. **How do you know who approved what?** `ApprovalHistory` stores approver, action, comment and timestamp; it is insert-only and deleting an audited expense is blocked by a `RESTRICT` foreign key.
5. **Why return 404 instead of 403 for someone else's claim?** 403 would confirm the ID exists. 404 reveals nothing.
6. **How are files kept safe?** Type whitelist + content signature check + 5 MB limit + random file names + stored outside the web root + downloadable only through an authorized endpoint.
7. **Where's the business logic?** In services and entity methods. Controllers are 1–3 lines each.
8. **How would you add multi-level approval later?** Add an approval-step table and a `CurrentStep` on the expense; extend the entity's state machine. Controllers and Angular screens stay mostly the same.
9. **How do you deploy?** Set `ConnectionStrings__Default`, `Jwt__SigningKey` as environment variables, run `dotnet ef database update` (or a migration bundle), host the API, and serve the Angular `dist/` build behind the same domain.
10. **How do you test it?** Swagger for API calls (Authorize button accepts the JWT), the `.http` file in the API project, and the demo script in the README, including negative tests (wrong role, another user's id, future date, wrong file type).
