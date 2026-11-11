using ExpenseReimbursement.Core.DTOs.Expenses;

namespace ExpenseReimbursement.Core.DTOs.Dashboard;

public record EmployeeDashboardDto(
    int DraftCount,
    int PendingCount,
    int ApprovedCount,
    int RejectedCount,
    decimal PendingAmount,
    decimal ApprovedAmount,
    IReadOnlyList<ExpenseSummaryDto> Recent);

public record ManagerDashboardDto(
    int TeamSize,
    int PendingCount,
    decimal PendingAmount,
    int ApprovedThisMonth,
    int RejectedThisMonth,
    IReadOnlyList<ExpenseSummaryDto> OldestPending);
