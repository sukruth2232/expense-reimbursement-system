using ExpenseReimbursement.Core.DTOs.Dashboard;
using ExpenseReimbursement.Core.Enums;
using ExpenseReimbursement.Core.Interfaces;
using ExpenseReimbursement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace ExpenseReimbursement.Infrastructure.Services;

/// <summary>Numbers for the dashboard cards. Every figure is scoped to the caller.</summary>
public class DashboardService(AppDbContext db, TimeProvider clock) : IDashboardService
{
    public async Task<EmployeeDashboardDto> GetEmployeeDashboardAsync(int employeeId, CancellationToken ct)
    {
        var mine = db.Expenses.AsNoTracking().Where(e => e.EmployeeId == employeeId);

        // SQLite cannot aggregate decimal values in SQL, so aggregate the selected rows in C#.
        var statusAmounts = await mine.Select(e => new { e.Status, e.Amount }).ToListAsync(ct);
        var byStatus = statusAmounts.GroupBy(x => x.Status)
            .Select(g => new { Status = g.Key, Count = g.Count(), Total = g.Sum(x => x.Amount) })
            .ToList();

        int Count(ExpenseStatus s) => byStatus.FirstOrDefault(x => x.Status == s)?.Count ?? 0;
        decimal Total(ExpenseStatus s) => byStatus.FirstOrDefault(x => x.Status == s)?.Total ?? 0m;

        var recent = await mine
            .OrderByDescending(e => e.UpdatedAt)
            .Take(5)
            .Select(ExpenseMapper.ToSummary)
            .ToListAsync(ct);

        return new EmployeeDashboardDto(
            Count(ExpenseStatus.Draft),
            Count(ExpenseStatus.PendingApproval),
            Count(ExpenseStatus.Approved),
            Count(ExpenseStatus.Rejected),
            Total(ExpenseStatus.PendingApproval),
            Total(ExpenseStatus.Approved),
            recent);
    }

    public async Task<ManagerDashboardDto> GetManagerDashboardAsync(int managerId, CancellationToken ct)
    {
        var now = clock.GetUtcNow().UtcDateTime;
        var monthStart = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);

        var teamSize = await db.Users.CountAsync(u => u.ManagerId == managerId && u.IsActive, ct);

        var pending = db.Expenses.AsNoTracking()
            .Where(e => e.AssignedManagerId == managerId && e.Status == ExpenseStatus.PendingApproval);

        var pendingCount = await pending.CountAsync(ct);
        var pendingAmounts = await pending.Select(e => e.Amount).ToListAsync(ct);
        var pendingAmount = pendingAmounts.Sum();

        var decisionsThisMonth = db.ApprovalHistory.AsNoTracking()
            .Where(h => h.ApproverId == managerId && h.ActionDate >= monthStart);
        var approved = await decisionsThisMonth.CountAsync(h => h.Action == ApprovalAction.Approved, ct);
        var rejected = await decisionsThisMonth.CountAsync(h => h.Action == ApprovalAction.Rejected, ct);

        var oldest = await pending
            .OrderBy(e => e.SubmittedAt)
            .Take(5)
            .Select(ExpenseMapper.ToSummary)
            .ToListAsync(ct);

        return new ManagerDashboardDto(teamSize, pendingCount, pendingAmount, approved, rejected, oldest);
    }
}
