using ExpenseReimbursement.Core.Enums;
using ExpenseReimbursement.Core.Exceptions;

namespace ExpenseReimbursement.Core.Entities;

/// <summary>
/// One expense claim.
///
/// IMPORTANT DESIGN POINT: every status change goes through a method on this class
/// (Submit, Approve, Reject). Nothing else is allowed to set Status directly, so the
/// workflow rules live in exactly one place and cannot be bypassed by a controller,
/// a service or the Angular app.
/// </summary>
public class Expense
{
    public int ExpenseId { get; set; }

    /// <summary>
    /// Human-friendly number such as EXP-000014. Left null in C#; PostgreSQL fills it from a
    /// sequence on INSERT and EF Core reads the value back.
    /// </summary>
    public string ExpenseNumber { get; private set; } = null!;

    public int EmployeeId { get; set; }
    public User Employee { get; set; } = null!;

    /// <summary>
    /// The manager who must review this claim. Copied from the employee's ManagerId at
    /// submit time, so a later team change does not move a claim that is already pending.
    /// </summary>
    public int? AssignedManagerId { get; set; }
    public User? AssignedManager { get; set; }

    public int CategoryId { get; set; }
    public ExpenseCategory Category { get; set; } = null!;

    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? MerchantName { get; set; }
    public PaymentMethod PaymentMethod { get; set; }

    /// <summary>Money is always decimal in C# and numeric(12,2) in PostgreSQL - never float.</summary>
    public decimal Amount { get; set; }

    public DateOnly ExpenseDate { get; set; }

    // "private set": only the methods below can change the status.
    public ExpenseStatus Status { get; private set; } = ExpenseStatus.Draft;
    public DateTime? SubmittedAt { get; private set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Optimistic concurrency token mapped to PostgreSQL's hidden "xmin" column.
    /// If two managers click Approve at the same moment, the second save fails
    /// instead of silently overwriting the first.
    /// </summary>
    public uint RowVersion { get; set; }

    public ICollection<ExpenseAttachment> Attachments { get; set; } = new List<ExpenseAttachment>();
    public ICollection<ApprovalHistory> History { get; set; } = new List<ApprovalHistory>();

    // ---------------------------------------------------------------------
    // Workflow rules
    // ---------------------------------------------------------------------

    /// <summary>Only Draft or Rejected claims can be edited, have receipts changed, or be (re)submitted.</summary>
    public bool IsEditable => Status is ExpenseStatus.Draft or ExpenseStatus.Rejected;

    public void EnsureEditable()
    {
        if (!IsEditable)
            throw new BusinessRuleException(
                $"Only Draft or Rejected expenses can be changed. This expense is {Status}.");
    }

    /// <summary>Draft/Rejected -> PendingApproval.</summary>
    public void Submit(int? managerId, DateTime nowUtc)
    {
        EnsureEditable();

        if (Attachments.Count == 0)
            throw new BusinessRuleException("Attach at least one receipt before submitting.");

        if (managerId is null)
            throw new BusinessRuleException("You have no manager assigned. Contact your administrator.");

        AssignedManagerId = managerId;
        Status = ExpenseStatus.PendingApproval;
        SubmittedAt = nowUtc;
        UpdatedAt = nowUtc;
    }

    /// <summary>PendingApproval -> Approved, and records the decision in the audit history.</summary>
    public ApprovalHistory Approve(int managerId, string? comments, DateTime nowUtc)
    {
        EnsurePendingFor(managerId);

        Status = ExpenseStatus.Approved;
        UpdatedAt = nowUtc;
        return AddHistory(managerId, ApprovalAction.Approved, comments, nowUtc);
    }

    /// <summary>PendingApproval -> Rejected. A reason is mandatory.</summary>
    public ApprovalHistory Reject(int managerId, string reason, DateTime nowUtc)
    {
        if (string.IsNullOrWhiteSpace(reason))
            throw new BusinessRuleException("A rejection reason is required.");

        EnsurePendingFor(managerId);

        Status = ExpenseStatus.Rejected;
        UpdatedAt = nowUtc;
        return AddHistory(managerId, ApprovalAction.Rejected, reason.Trim(), nowUtc);
    }

    private void EnsurePendingFor(int managerId)
    {
        // A different manager should not even learn that this claim exists.
        if (AssignedManagerId != managerId)
            throw new NotFoundException("Expense not found.");

        if (Status != ExpenseStatus.PendingApproval)
            throw new BusinessRuleException($"Only pending expenses can be reviewed. This expense is {Status}.");
    }

    private ApprovalHistory AddHistory(int managerId, ApprovalAction action, string? comments, DateTime nowUtc)
    {
        var entry = new ApprovalHistory
        {
            ExpenseId = ExpenseId,
            ApproverId = managerId,
            Action = action,
            Comments = string.IsNullOrWhiteSpace(comments) ? null : comments.Trim(),
            ActionDate = nowUtc
        };
        History.Add(entry);
        return entry;
    }
}
