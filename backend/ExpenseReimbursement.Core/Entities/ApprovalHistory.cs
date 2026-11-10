using ExpenseReimbursement.Core.Enums;

namespace ExpenseReimbursement.Core.Entities;

/// <summary>
/// Audit trail. One row is written for every approve or reject action and is never
/// updated or deleted, so we can always answer "who decided what, and when".
/// </summary>
public class ApprovalHistory
{
    public int ApprovalId { get; set; }

    public int ExpenseId { get; set; }
    public Expense Expense { get; set; } = null!;

    public int ApproverId { get; set; }
    public User Approver { get; set; } = null!;

    public ApprovalAction Action { get; set; }

    /// <summary>Optional for approvals, required for rejections (the rejection reason).</summary>
    public string? Comments { get; set; }

    public DateTime ActionDate { get; set; } = DateTime.UtcNow;
}
