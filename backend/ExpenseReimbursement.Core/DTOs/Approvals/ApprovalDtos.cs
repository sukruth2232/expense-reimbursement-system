using System.ComponentModel.DataAnnotations;
using ExpenseReimbursement.Core.Enums;

namespace ExpenseReimbursement.Core.DTOs.Approvals;

/// <summary>Body of POST /api/manager/{id}/approve. Comments are optional.</summary>
public class ApproveExpenseRequest
{
    [StringLength(1000)]
    public string? Comments { get; set; }
}

/// <summary>Body of POST /api/manager/{id}/reject. A reason is mandatory.</summary>
public class RejectExpenseRequest
{
    [Required(ErrorMessage = "A rejection reason is required.")]
    [StringLength(1000, MinimumLength = 5, ErrorMessage = "Reason must be 5 to 1000 characters.")]
    public string Reason { get; set; } = string.Empty;
}

/// <summary>One entry in an expense's audit timeline.</summary>
public record ApprovalHistoryDto(
    int ApprovalId,
    ApprovalAction Action,
    string ApproverName,
    string? Comments,
    DateTime ActionDate);

/// <summary>One row in the manager's "My decisions" list.</summary>
public record ApprovalHistoryItemDto(
    int ApprovalId,
    int ExpenseId,
    string ExpenseNumber,
    string ExpenseTitle,
    string EmployeeName,
    decimal Amount,
    ApprovalAction Action,
    string? Comments,
    DateTime ActionDate);
