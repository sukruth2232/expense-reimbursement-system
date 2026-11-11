using System.Linq.Expressions;
using ExpenseReimbursement.Core.DTOs.Approvals;
using ExpenseReimbursement.Core.DTOs.Expenses;
using ExpenseReimbursement.Core.Entities;
using ExpenseReimbursement.Core.Enums;

namespace ExpenseReimbursement.Infrastructure.Services;

/// <summary>
/// Converts entities to DTOs in one place, so every endpoint returns the same shape.
/// </summary>
internal static class ExpenseMapper
{
    /// <summary>
    /// Used inside LINQ queries: EF Core turns this into a SELECT of only the needed columns
    /// (with JOINs for category and employee name) instead of loading whole entities.
    /// </summary>
    public static readonly Expression<Func<Expense, ExpenseSummaryDto>> ToSummary = e =>
        new ExpenseSummaryDto(
            e.ExpenseId,
            e.ExpenseNumber,
            e.Title,
            e.Category.CategoryName,
            e.Amount,
            e.ExpenseDate,
            e.Status,
            e.SubmittedAt,
            e.Employee.FullName);

    /// <summary>
    /// Builds the details DTO for a specific caller. The expense must be loaded with
    /// Employee, AssignedManager, Category, Attachments and History.Approver.
    /// </summary>
    public static ExpenseDetailDto ToDetail(Expense e, int callerId)
    {
        var isOwner = e.EmployeeId == callerId;
        var canEdit = isOwner && e.IsEditable;

        var history = e.History
            .OrderBy(h => h.ActionDate)
            .Select(h => new ApprovalHistoryDto(h.ApprovalId, h.Action, h.Approver.FullName, h.Comments, h.ActionDate))
            .ToList();

        // Show the latest rejection reason only while the claim is still rejected.
        var rejectionReason = e.Status == ExpenseStatus.Rejected
            ? history.LastOrDefault(h => h.Action == ApprovalAction.Rejected)?.Comments
            : null;

        return new ExpenseDetailDto(
            e.ExpenseId,
            e.ExpenseNumber,
            e.Title,
            e.CategoryId,
            e.Category.CategoryName,
            e.Amount,
            e.ExpenseDate,
            e.MerchantName,
            e.Description,
            e.PaymentMethod,
            e.Status,
            e.SubmittedAt,
            e.CreatedAt,
            e.UpdatedAt,
            e.Employee.FullName,
            e.AssignedManager?.FullName,
            CanEdit: canEdit,
            CanSubmit: canEdit && e.Attachments.Count > 0,
            CanApprove: e.AssignedManagerId == callerId && e.Status == ExpenseStatus.PendingApproval,
            RejectionReason: rejectionReason,
            Attachments: e.Attachments.OrderBy(a => a.UploadedAt).Select(ToAttachment).ToList(),
            History: history);
    }

    public static AttachmentDto ToAttachment(ExpenseAttachment a) =>
        new(a.AttachmentId, a.FileName, a.ContentType, a.FileSizeBytes, a.UploadedAt);
}
