using System.ComponentModel.DataAnnotations;
using ExpenseReimbursement.Core.DTOs.Approvals;
using ExpenseReimbursement.Core.Enums;
using ExpenseReimbursement.Core.Validation;

namespace ExpenseReimbursement.Core.DTOs.Expenses;

/// <summary>
/// Body of POST /api/expenses (create) and PUT /api/expenses/{id} (update).
/// The Data Annotations below are checked automatically by [ApiController]
/// before the controller runs; a failure returns 400 with field-level errors.
/// Notice there is NO EmployeeId here: the owner always comes from the JWT.
/// </summary>
public class ExpenseRequest
{
    [Required, StringLength(150, MinimumLength = 3)]
    public string Title { get; set; } = string.Empty;

    [Range(1, int.MaxValue, ErrorMessage = "Select a category.")]
    public int CategoryId { get; set; }

    [Required, NotInFuture]
    public DateOnly? ExpenseDate { get; set; }

    [Required, Range(0.01, 9_999_999_999.99, ErrorMessage = "Amount must be greater than 0.")]
    public decimal? Amount { get; set; }

    [StringLength(150)]
    public string? MerchantName { get; set; }

    [StringLength(1000)]
    public string? Description { get; set; }

    [Required, EnumDataType(typeof(PaymentMethod))]
    public PaymentMethod? PaymentMethod { get; set; }
}

/// <summary>Query string for GET /api/expenses/my and GET /api/manager/team-expenses.</summary>
public class ExpenseListQuery : Common.PageQuery
{
    public ExpenseStatus? Status { get; set; }

    /// <summary>Manager screen only: filter by one team member.</summary>
    public int? EmployeeId { get; set; }
}

/// <summary>One row in a table (My Expenses, Pending Approvals, Team Expenses).</summary>
public record ExpenseSummaryDto(
    int ExpenseId,
    string ExpenseNumber,
    string Title,
    string CategoryName,
    decimal Amount,
    DateOnly ExpenseDate,
    ExpenseStatus Status,
    DateTime? SubmittedAt,
    string EmployeeName);

public record AttachmentDto(
    int AttachmentId,
    string FileName,
    string ContentType,
    long FileSizeBytes,
    DateTime UploadedAt);

/// <summary>
/// Everything the details screens need. The Can* flags are calculated on the server
/// for the current caller, so Angular only shows buttons - it never decides the rules.
/// </summary>
public record ExpenseDetailDto(
    int ExpenseId,
    string ExpenseNumber,
    string Title,
    int CategoryId,
    string CategoryName,
    decimal Amount,
    DateOnly ExpenseDate,
    string? MerchantName,
    string? Description,
    PaymentMethod PaymentMethod,
    ExpenseStatus Status,
    DateTime? SubmittedAt,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    string EmployeeName,
    string? AssignedManagerName,
    bool CanEdit,
    bool CanSubmit,
    bool CanApprove,
    string? RejectionReason,
    IReadOnlyList<AttachmentDto> Attachments,
    IReadOnlyList<ApprovalHistoryDto> History);

public record CategoryDto(int CategoryId, string CategoryName);

/// <summary>A receipt file being downloaded: the stream plus what the browser needs to show it.</summary>
public record FileDownload(Stream Content, string ContentType, string FileName);
