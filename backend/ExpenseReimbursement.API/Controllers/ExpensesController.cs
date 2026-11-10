using ExpenseReimbursement.API.Extensions;
using ExpenseReimbursement.Core.DTOs.Common;
using ExpenseReimbursement.Core.DTOs.Expenses;
using ExpenseReimbursement.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ExpenseReimbursement.API.Controllers;

/// <summary>
/// Employee expense endpoints (Member 1's module).
/// The class needs a logged-in user; each action then states which role may call it.
/// (Role attributes on a class and a method are combined with AND, so the role is set per
/// action: employees create and edit, while employees AND managers may read.)
/// </summary>
[ApiController]
[Route("api/expenses")]
[Authorize]
public class ExpensesController(IExpenseService expenses) : ControllerBase
{
    /// <summary>Create a Draft expense.</summary>
    [HttpPost]
    [Authorize(Roles = "Employee")]
    [ProducesResponseType<ExpenseDetailDto>(StatusCodes.Status201Created)]
    public async Task<ActionResult<ExpenseDetailDto>> Create(ExpenseRequest request, CancellationToken ct)
    {
        var created = await expenses.CreateAsync(User.GetUserId(), request, ct);
        return CreatedAtAction(nameof(GetById), new { id = created.ExpenseId }, created);
    }

    /// <summary>My expenses, newest first. Optional ?status=PendingApproval&amp;page=1&amp;pageSize=10.</summary>
    [HttpGet("my")]
    [Authorize(Roles = "Employee")]
    public async Task<ActionResult<PagedResult<ExpenseSummaryDto>>> GetMine([FromQuery] ExpenseListQuery query, CancellationToken ct) =>
        Ok(await expenses.GetMyExpensesAsync(User.GetUserId(), query, ct));

    /// <summary>One expense. Allowed for its owner or its assigned manager; anyone else gets 404.</summary>
    [HttpGet("{id:int}")]
    [Authorize(Roles = "Employee,Manager")]
    public async Task<ActionResult<ExpenseDetailDto>> GetById(int id, CancellationToken ct) =>
        Ok(await expenses.GetByIdAsync(User.GetUserId(), id, ct));

    /// <summary>Edit a Draft or Rejected expense.</summary>
    [HttpPut("{id:int}")]
    [Authorize(Roles = "Employee")]
    public async Task<ActionResult<ExpenseDetailDto>> Update(int id, ExpenseRequest request, CancellationToken ct) =>
        Ok(await expenses.UpdateAsync(User.GetUserId(), id, request, ct));

    /// <summary>Send for approval: Draft/Rejected -> PendingApproval. Needs at least one receipt.</summary>
    [HttpPost("{id:int}/submit")]
    [Authorize(Roles = "Employee")]
    public async Task<ActionResult<ExpenseDetailDto>> Submit(int id, CancellationToken ct) =>
        Ok(await expenses.SubmitAsync(User.GetUserId(), id, ct));

    /// <summary>Upload one receipt (JPG, PNG or PDF, max 5 MB) as multipart/form-data field "file".</summary>
    [HttpPost("{id:int}/attachments")]
    [Authorize(Roles = "Employee")]
    [RequestSizeLimit(6 * 1024 * 1024)]
    [ProducesResponseType<AttachmentDto>(StatusCodes.Status201Created)]
    public async Task<ActionResult<AttachmentDto>> Upload(int id, IFormFile file, CancellationToken ct)
    {
        await using var stream = file.OpenReadStream();
        var attachment = await expenses.AddAttachmentAsync(User.GetUserId(), id, stream, file.FileName, file.Length, ct);
        return CreatedAtAction(nameof(DownloadAttachment), new { id, attachmentId = attachment.AttachmentId }, attachment);
    }

    /// <summary>Remove a receipt from a Draft or Rejected expense.</summary>
    [HttpDelete("{id:int}/attachments/{attachmentId:int}")]
    [Authorize(Roles = "Employee")]
    public async Task<IActionResult> DeleteAttachment(int id, int attachmentId, CancellationToken ct)
    {
        await expenses.DeleteAttachmentAsync(User.GetUserId(), id, attachmentId, ct);
        return NoContent();
    }

    /// <summary>
    /// Stream a receipt to the browser. Angular fetches it with the JWT and shows it as a blob,
    /// because a plain &lt;img src&gt; cannot send the Authorization header.
    /// </summary>
    [HttpGet("{id:int}/attachments/{attachmentId:int}")]
    [Authorize(Roles = "Employee,Manager")]
    public async Task<IActionResult> DownloadAttachment(int id, int attachmentId, CancellationToken ct)
    {
        var file = await expenses.GetAttachmentAsync(User.GetUserId(), id, attachmentId, ct);
        Response.Headers["X-Content-Type-Options"] = "nosniff";
        return File(file.Content, file.ContentType, file.FileName);
    }
}
