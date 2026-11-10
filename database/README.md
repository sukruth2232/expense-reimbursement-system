# Database

The PostgreSQL schema is defined in C# (EF Core Code First) and created by migrations:

- Entities: `backend/ExpenseReimbursement.Core/Entities`
- Table rules (keys, lengths, indexes, CHECK constraints): `backend/ExpenseReimbursement.Infrastructure/Data/Configurations`
- Migrations: `backend/ExpenseReimbursement.Infrastructure/Data/Migrations`

To see the exact SQL EF Core generates (useful for review or for a DBA):

```powershell
cd backend
dotnet ef migrations script -p ExpenseReimbursement.Infrastructure -s ExpenseReimbursement.API -o ..\database\schema.sql
```

Tables: `Users`, `ExpenseCategories`, `Expenses`, `ExpenseAttachments`, `ApprovalHistory`, plus the sequence `expense_number_seq`.
The API creates the `expenso_dev` database, applies migrations and seeds demo users automatically when it starts in Development.
