using ExpenseReimbursement.Core.DTOs.Approvals;
using ExpenseReimbursement.Core.DTOs.Auth;
using ExpenseReimbursement.Core.DTOs.Common;
using ExpenseReimbursement.Core.DTOs.Dashboard;
using ExpenseReimbursement.Core.DTOs.Expenses;
using ExpenseReimbursement.Core.Entities;

namespace ExpenseReimbursement.Core.Interfaces;

// Controllers depend on these interfaces, not on the classes that implement them.
// ASP.NET Core's dependency injection supplies the implementation from Infrastructure
// (registered in Infrastructure/DependencyInjection.cs).
//
// Every method that acts for a user takes the user's ID as a parameter. That ID always
// comes from the validated JWT (User.GetUserId() in the controller), never from the body.

public interface IAuthService
{
    Task<LoginResponse> LoginAsync(LoginRequest request, CancellationToken ct);
    Task<CurrentUserDto> GetCurrentUserAsync(int userId, CancellationToken ct);
}

public interface ITokenService
{
    (string Token, DateTime ExpiresAt) CreateToken(User user);
}

/// <summary>Wraps password hashing so Core does not depend on ASP.NET Identity.</summary>
public interface IPasswordService
{
    string Hash(User user, string password);
    bool Verify(User user, string password);
}

public interface ICategoryService
{
    Task<IReadOnlyList<CategoryDto>> GetAllAsync(CancellationToken ct);
}

/// <summary>Employee side: create, edit, list, submit and attach receipts.</summary>
public interface IExpenseService
{
    Task<ExpenseDetailDto> CreateAsync(int employeeId, ExpenseRequest request, CancellationToken ct);
    Task<ExpenseDetailDto> UpdateAsync(int employeeId, int expenseId, ExpenseRequest request, CancellationToken ct);
    Task<PagedResult<ExpenseSummaryDto>> GetMyExpensesAsync(int employeeId, ExpenseListQuery query, CancellationToken ct);
    Task<ExpenseDetailDto> GetByIdAsync(int callerId, int expenseId, CancellationToken ct);
    Task<ExpenseDetailDto> SubmitAsync(int employeeId, int expenseId, CancellationToken ct);
    Task<AttachmentDto> AddAttachmentAsync(int employeeId, int expenseId, Stream content, string fileName, long length, CancellationToken ct);
    Task DeleteAttachmentAsync(int employeeId, int expenseId, int attachmentId, CancellationToken ct);
    Task<FileDownload> GetAttachmentAsync(int callerId, int expenseId, int attachmentId, CancellationToken ct);
}

/// <summary>Manager side: review queue, decisions and history.</summary>
public interface IApprovalService
{
    Task<IReadOnlyList<TeamMemberDto>> GetTeamMembersAsync(int managerId, CancellationToken ct);
    Task<PagedResult<ExpenseSummaryDto>> GetPendingAsync(int managerId, PageQuery query, CancellationToken ct);
    Task<PagedResult<ExpenseSummaryDto>> GetTeamExpensesAsync(int managerId, ExpenseListQuery query, CancellationToken ct);
    Task<ExpenseDetailDto> ApproveAsync(int managerId, int expenseId, ApproveExpenseRequest request, CancellationToken ct);
    Task<ExpenseDetailDto> RejectAsync(int managerId, int expenseId, RejectExpenseRequest request, CancellationToken ct);
    Task<PagedResult<ApprovalHistoryItemDto>> GetHistoryAsync(int managerId, PageQuery query, CancellationToken ct);
}

public interface IDashboardService
{
    Task<EmployeeDashboardDto> GetEmployeeDashboardAsync(int employeeId, CancellationToken ct);
    Task<ManagerDashboardDto> GetManagerDashboardAsync(int managerId, CancellationToken ct);
}

/// <summary>Where receipt files are kept. Today: local disk. Tomorrow: Azure Blob or S3, same interface.</summary>
public interface IFileStorage
{
    Task<string> SaveAsync(int expenseId, Stream content, string extension, CancellationToken ct);
    Stream OpenRead(string relativePath);
    void Delete(string relativePath);
}
