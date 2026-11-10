# Expenso – Expense Reimbursement & Approval System

Employees submit business expenses with receipts; their manager approves or rejects them with comments; every decision is recorded in an audit history.

**Stack:** Angular 22 + Angular Material · ASP.NET Core 10 Web API · EF Core 10 · PostgreSQL

| Folder | What it is |
| --- | --- |
| `backend/` | .NET solution: `ExpenseReimbursement.API`, `.Core`, `.Infrastructure` |
| `frontend/` | Angular app (`expenso-web`) |
| `database/` | Reference SQL for the schema (the real schema is created by EF Core migrations) |
| `documentation/` | `IMPLEMENTATION_GUIDE.md` – how everything works, for reviews and demos |

---

## Run it locally (Windows, PowerShell)

**Quick start:** from the repo root run

```powershell
powershell -ExecutionPolicy Bypass -File .\run-dev.ps1
```

It checks prerequisites, sets up secrets (asks for your PostgreSQL password once), creates the first migration, installs packages and opens the API and Angular in two windows. The manual steps below do the same thing.

### Prerequisites (once per machine)

- .NET 10 SDK, Node.js 22+ (24 LTS recommended), PostgreSQL 16+ running on `localhost:5432`
- EF Core CLI: `dotnet tool install --global dotnet-ef --version "10.*"`

### 1. Secrets (once per machine)

```powershell
cd backend
powershell -ExecutionPolicy Bypass -File .\setup-dev-secrets.ps1
```

It asks for your PostgreSQL password (user `postgres`) and stores the connection string, a random JWT signing key and the demo password in **user-secrets** (outside the repo).

### 2. Database migration (only if `ExpenseReimbursement.Infrastructure/Data/Migrations` does not exist yet)

```powershell
cd backend
dotnet ef migrations add InitialCreate -p ExpenseReimbursement.Infrastructure -s ExpenseReimbursement.API -o Data/Migrations
```

You do **not** need to run `dotnet ef database update`: in Development the API applies migrations and seeds demo users on start-up. The database `expenso_dev` is created automatically.

### 3. Start the API (terminal 1)

```powershell
cd backend
dotnet run --project ExpenseReimbursement.API --launch-profile http
```

Swagger UI: http://localhost:5180/swagger

### 4. Start Angular (terminal 2)

```powershell
cd frontend
npm install
npm start
```

App: http://localhost:4200 — calls to `/api/*` are proxied to the API (`proxy.conf.json`).

### Demo logins

| Role | Email | Password |
| --- | --- | --- |
| Manager | `manager@expenso.local` (Rahul Verma) | `Expenso@123` |
| Employee | `employee1@expenso.local` (Ananya Reddy) | `Expenso@123` |
| Employee | `employee2@expenso.local` (Karthik Rao) | `Expenso@123` |
| Employee | `employee3@expenso.local` (Sneha Iyer) | `Expenso@123` |

(The password is whatever you gave `setup-dev-secrets.ps1`; `Expenso@123` is its default.)

### 5-minute demo script

1. Log in as **employee1** → Dashboard → **New expense**.
2. Fill the form, attach a JPG/PNG/PDF receipt → **Save & submit**. Status becomes *Pending approval*.
3. Log out, log in as **manager** → **Pending approvals** → open the claim → view the receipt.
4. **Reject** with a reason. Log back in as employee1: the reason is shown; **Edit** → fix → **Resubmit**.
5. As manager, **Approve**. Check **My decisions** and the claim's approval timeline.
6. Security check in Swagger: log in as employee2 and call `GET /api/expenses/{id}` for employee1's claim → **404**.

---

## Branches

`main` (demo-ready) ← `develop` (integration) ← `feature/*`. Every change goes through a pull request reviewed by the other member.
