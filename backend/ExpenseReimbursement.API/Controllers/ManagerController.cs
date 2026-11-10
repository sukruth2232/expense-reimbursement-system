using ExpenseReimbursement.API.Extensions;
using ExpenseReimbursement.Core.DTOs.Approvals;
using ExpenseReimbursement.Core.DTOs.Common;
using ExpenseReimbursement.Core.DTOs.Expenses;
using ExpenseReimbursement.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ExpenseReimbursement.API.Controllers;

/// <summary>
/// Manager approval endpoints (Member 2's module). Only tokens with role = Manager get in.
/// In every route, {id} is the EXPENSE id.
/// </summary>
[ApiController]
[Route("api/manager")]
[Authorize(Roles = "Manager")]
public class ManagerController(IApprovalService approvals) : ControllerBase
{
    /// <summary>Active employees reporting directly to this manager.</summary>
    [HttpGet("team-members")]
    public async Task<ActionResult<IReadOnlyList<TeamMemberDto>>> TeamMembers(CancellationToken ct) =>
        Ok(await approvals.GetTeamMembersAsync(User.GetUserId(), ct));

    /// <summary>Claims waiting for my decision, oldest first.</summary>
    [HttpGet("pending")]
    public async Task<ActionResult<PagedResult<ExpenseSummaryDto>>> Pending([FromQuery] PageQuery query, CancellationToken ct) =>
        Ok(await approvals.GetPendingAsync(User.GetUserId(), query, ct));

    /// <summary>All submitted claims from my team. Optional ?status= and ?employeeId= filters.</summary>
    [HttpGet("team-expenses")]
    public async Task<ActionResult<PagedResult<ExpenseSummaryDto>>> TeamExpenses([FromQuery] ExpenseListQuery query, CancellationToken ct) =>
        Ok(await approvals.GetTeamExpensesAsync(User.GetUserId(), query, ct));

    /// <summary>Approve a pending claim. Comments are optional.</summary>
    [HttpPost("{id:int}/approve")]
    public async Task<ActionResult<ExpenseDetailDto>> Approve(int id, ApproveExpenseRequest request, CancellationToken ct) =>
        Ok(await approvals.ApproveAsync(User.GetUserId(), id, request, ct));

    /// <summary>Reject a pending claim. A reason (5-1000 characters) is required.</summary>
    [HttpPost("{id:int}/reject")]
    public async Task<ActionResult<ExpenseDetailDto>> Reject(int id, RejectExpenseRequest request, CancellationToken ct) =>
        Ok(await approvals.RejectAsync(User.GetUserId(), id, request, ct));

    /// <summary>Every approve/reject decision I have made, newest first.</summary>
    [HttpGet("approval-history")]
    public async Task<ActionResult<PagedResult<ApprovalHistoryItemDto>>> History([FromQuery] PageQuery query, CancellationToken ct) =>
        Ok(await approvals.GetHistoryAsync(User.GetUserId(), query, ct));
}
