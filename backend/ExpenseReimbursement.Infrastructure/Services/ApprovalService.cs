using ExpenseReimbursement.Core.DTOs.Approvals;
using ExpenseReimbursement.Core.DTOs.Common;
using ExpenseReimbursement.Core.DTOs.Expenses;
using ExpenseReimbursement.Core.Entities;
using ExpenseReimbursement.Core.Enums;
using ExpenseReimbursement.Core.Exceptions;
using ExpenseReimbursement.Core.Interfaces;
using ExpenseReimbursement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace ExpenseReimbursement.Infrastructure.Services;

/// <summary>
/// Manager-side business logic (Member 2's module).
///
/// Team rule: a manager only ever sees expenses where AssignedManagerId = their own ID.
/// That value is set on submit from the employee's ManagerId, so "my team's claims"
/// is enforced by the WHERE clause of every query here.
/// </summary>
public class ApprovalService(AppDbContext db, IExpenseService expenses, TimeProvider clock) : IApprovalService
{
    public async Task<PagedResult<ExpenseSummaryDto>> GetPendingAsync(int managerId, PageQuery query, CancellationToken ct)
    {
        var pending = db.Expenses.AsNoTracking()
            .Where(e => e.AssignedManagerId == managerId && e.Status == ExpenseStatus.PendingApproval);

        var total = await pending.CountAsync(ct);
        var items = await pending
            .OrderBy(e => e.SubmittedAt)           // oldest first: first in, first reviewed
            .Skip(query.Skip).Take(query.PageSize)
            .Select(ExpenseMapper.ToSummary)
            .ToListAsync(ct);

        return new PagedResult<ExpenseSummaryDto>(items, query.Page, query.PageSize, total);
    }

    public async Task<PagedResult<ExpenseSummaryDto>> GetTeamExpensesAsync(int managerId, ExpenseListQuery query, CancellationToken ct)
    {
        // Drafts are private to the employee until submitted.
        var team = db.Expenses.AsNoTracking()
            .Where(e => e.AssignedManagerId == managerId && e.Status != ExpenseStatus.Draft);

        if (query.Status is not null)
            team = team.Where(e => e.Status == query.Status);
        if (query.EmployeeId is not null)
            team = team.Where(e => e.EmployeeId == query.EmployeeId);

        var total = await team.CountAsync(ct);
        var items = await team
            .OrderByDescending(e => e.SubmittedAt)
            .Skip(query.Skip).Take(query.PageSize)
            .Select(ExpenseMapper.ToSummary)
            .ToListAsync(ct);

        return new PagedResult<ExpenseSummaryDto>(items, query.Page, query.PageSize, total);
    }

    public async Task<ExpenseDetailDto> ApproveAsync(int managerId, int expenseId, ApproveExpenseRequest request, CancellationToken ct)
    {
        var expense = await LoadAsync(expenseId, ct);

        // The entity checks: assigned to this manager? still pending? Then it adds the history row.
        var historyEntry = expense.Approve(managerId, request.Comments, clock.GetUtcNow().UtcDateTime);
        db.ApprovalHistory.Add(historyEntry);

        // One SaveChanges = one database transaction: status change + audit row succeed or fail together.
        await db.SaveChangesAsync(ct);
        return await expenses.GetByIdAsync(managerId, expenseId, ct);
    }

    public async Task<ExpenseDetailDto> RejectAsync(int managerId, int expenseId, RejectExpenseRequest request, CancellationToken ct)
    {
        var expense = await LoadAsync(expenseId, ct);

        var historyEntry = expense.Reject(managerId, request.Reason, clock.GetUtcNow().UtcDateTime);
        db.ApprovalHistory.Add(historyEntry);

        await db.SaveChangesAsync(ct);
        return await expenses.GetByIdAsync(managerId, expenseId, ct);
    }

    public async Task<PagedResult<ApprovalHistoryItemDto>> GetHistoryAsync(int managerId, PageQuery query, CancellationToken ct)
    {
        var mine = db.ApprovalHistory.AsNoTracking().Where(h => h.ApproverId == managerId);

        var total = await mine.CountAsync(ct);
        var items = await mine
            .OrderByDescending(h => h.ActionDate)
            .Skip(query.Skip).Take(query.PageSize)
            .Select(h => new ApprovalHistoryItemDto(
                h.ApprovalId,
                h.ExpenseId,
                h.Expense.ExpenseNumber,
                h.Expense.Title,
                h.Expense.Employee.FullName,
                h.Expense.Amount,
                h.Action,
                h.Comments,
                h.ActionDate))
            .ToListAsync(ct);

        return new PagedResult<ApprovalHistoryItemDto>(items, query.Page, query.PageSize, total);
    }

    private async Task<Expense> LoadAsync(int expenseId, CancellationToken ct) =>
        await db.Expenses.FirstOrDefaultAsync(e => e.ExpenseId == expenseId, ct)
        ?? throw new NotFoundException("Expense not found.");
}
