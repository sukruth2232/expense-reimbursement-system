# Expenso Manager Module

Expenso is split into manager and employee experiences. This project checkout contains the **manager module and shared infrastructure**; the employee-facing Angular screens have been removed so the manager work can be developed independently. Shared expense, user, category, attachment, and approval records and APIs remain available for the employee module integration.

**Stack:** Angular 22 + Angular Material · ASP.NET Core 10 Web API · EF Core 10 · SQLite

| Folder | Contents |
| --- | --- |
| `frontend/` | Manager dashboard, pending approvals, team expenses, decision history, login, profile, and shared UI |
| `backend/` | API, shared domain model, manager approval workflows, and SQLite persistence |
| `database/` | Reference schema |
| `documentation/` | Implementation guide |

## Run locally (Windows PowerShell)

Requirements: .NET 10 SDK and Node.js 22 or newer. No PostgreSQL server is needed.

```powershell
powershell -ExecutionPolicy Bypass -File .\run-dev.ps1
```

The script builds the backend, installs frontend packages if needed, and starts both applications. It creates a JWT signing key and seeds the manager and seven team accounts. SQLite creates `backend/ExpenseReimbursement.API/expenso.db` automatically.

To set up the demo password manually:

```powershell
powershell -ExecutionPolicy Bypass -File .\backend\setup-dev-secrets.ps1
```

Manager login: `ramchinta@gmail.com` / `Password@123`.

Team logins use each member's name as their Gmail address (for example, `sukruth@gmail.com`) and the same `Password@123` password.

- Manager app: http://localhost:4200
- API and Swagger: http://localhost:5180/swagger

The SQLite database is a local development database. The employee submission endpoints remain in the API so employee-module work can integrate and populate the manager approval queues.
