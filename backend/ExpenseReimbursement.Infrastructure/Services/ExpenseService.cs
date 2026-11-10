using ExpenseReimbursement.Core.DTOs.Common;
using ExpenseReimbursement.Core.DTOs.Expenses;
using ExpenseReimbursement.Core.Entities;
using ExpenseReimbursement.Core.Exceptions;
using ExpenseReimbursement.Core.Interfaces;
using ExpenseReimbursement.Infrastructure.Data;
using ExpenseReimbursement.Infrastructure.Storage;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace ExpenseReimbursement.Infrastructure.Services;

/// <summary>
/// Shared expense access and employee-side business logic used by both app modules.
///
/// Ownership rule used everywhere below: an expense is loaded with
/// "WHERE ExpenseId = @id AND EmployeeId = @callerId". If it belongs to someone else the
/// query finds nothing and we return 404 - the caller cannot even tell the ID exists.
/// </summary>
public class ExpenseService(
    AppDbContext db,
    IFileStorage storage,
    IOptions<FileStorageOptions> storageOptions,
    TimeProvider clock) : IExpenseService
{
    // ------------------------------------------------------------------ create / update

    public async Task<ExpenseDetailDto> CreateAsync(int employeeId, ExpenseRequest request, CancellationToken ct)
    {
        await EnsureCategoryExistsAsync(request.CategoryId, ct);

        var now = clock.GetUtcNow().UtcDateTime;
        var expense = new Expense
        {
            EmployeeId = employeeId,   // from the JWT, never from the request body
            ExpenseNumber = $"NEW-{Guid.NewGuid():N}", // temporary unique value until SQLite assigns the ID
            CreatedAt = now,
            UpdatedAt = now
        };
        ApplyRequest(expense, request);

        db.Expenses.Add(expense);
        await db.SaveChangesAsync(ct);
        expense.AssignExpenseNumber();
        await db.SaveChangesAsync(ct);

        return await GetByIdAsync(employeeId, expense.ExpenseId, ct);
    }

    public async Task<ExpenseDetailDto> UpdateAsync(int employeeId, int expenseId, ExpenseRequest request, CancellationToken ct)
    {
        var expense = await LoadOwnedAsync(employeeId, expenseId, ct);
        expense.EnsureEditable();
        await EnsureCategoryExistsAsync(request.CategoryId, ct);

        ApplyRequest(expense, request);
        expense.UpdatedAt = clock.GetUtcNow().UtcDateTime;
        await db.SaveChangesAsync(ct);

        return await GetByIdAsync(employeeId, expenseId, ct);
    }

    // ------------------------------------------------------------------ read

    public async Task<PagedResult<ExpenseSummaryDto>> GetMyExpensesAsync(int employeeId, ExpenseListQuery query, CancellationToken ct)
    {
        var expenses = db.Expenses.AsNoTracking().Where(e => e.EmployeeId == employeeId);

        if (query.Status is not null)
            expenses = expenses.Where(e => e.Status == query.Status);

        var total = await expenses.CountAsync(ct);
        var items = await expenses
            .OrderByDescending(e => e.CreatedAt)
            .Skip(query.Skip).Take(query.PageSize)
            .Select(ExpenseMapper.ToSummary)
            .ToListAsync(ct);

        return new PagedResult<ExpenseSummaryDto>(items, query.Page, query.PageSize, total);
    }

    /// <summary>
    /// Shared by employee and manager screens. Allowed callers: the owner, or the manager
    /// the claim was assigned to on submission. Anyone else gets 404.
    /// </summary>
    public async Task<ExpenseDetailDto> GetByIdAsync(int callerId, int expenseId, CancellationToken ct)
    {
        var expense = await db.Expenses
            .AsNoTracking()
            .AsSplitQuery()
            .Include(e => e.Employee)
            .Include(e => e.AssignedManager)
            .Include(e => e.Category)
            .Include(e => e.Attachments)
            .Include(e => e.History).ThenInclude(h => h.Approver)
            .FirstOrDefaultAsync(e => e.ExpenseId == expenseId
                                      && (e.EmployeeId == callerId || e.AssignedManagerId == callerId), ct)
            ?? throw new NotFoundException("Expense not found.");

        return ExpenseMapper.ToDetail(expense, callerId);
    }

    // ------------------------------------------------------------------ submit

    public async Task<ExpenseDetailDto> SubmitAsync(int employeeId, int expenseId, CancellationToken ct)
    {
        var expense = await db.Expenses
            .Include(e => e.Attachments)
            .Include(e => e.Employee)
            .FirstOrDefaultAsync(e => e.ExpenseId == expenseId && e.EmployeeId == employeeId, ct)
            ?? throw new NotFoundException("Expense not found.");

        // The entity enforces the rules: must be Draft/Rejected, must have a receipt, must have a manager.
        expense.Submit(expense.Employee.ManagerId, clock.GetUtcNow().UtcDateTime);
        await db.SaveChangesAsync(ct);

        return await GetByIdAsync(employeeId, expenseId, ct);
    }

    // ------------------------------------------------------------------ receipts

    /// <summary>Allowed receipt types, identified by their first bytes ("magic numbers").</summary>
    private static readonly (string Extension, string ContentType, byte[] Signature)[] AllowedFiles =
    [
        (".jpg", "image/jpeg", [0xFF, 0xD8, 0xFF]),
        (".png", "image/png", [0x89, 0x50, 0x4E, 0x47]),
        (".pdf", "application/pdf", [0x25, 0x50, 0x44, 0x46]) // "%PDF"
    ];

    public async Task<AttachmentDto> AddAttachmentAsync(
        int employeeId, int expenseId, Stream content, string fileName, long length, CancellationToken ct)
    {
        var expense = await LoadOwnedAsync(employeeId, expenseId, ct);
        expense.EnsureEditable();

        var maxBytes = storageOptions.Value.MaxFileSizeBytes;
        if (length <= 0 || length > maxBytes)
            throw new BusinessRuleException($"Receipt must be between 1 byte and {maxBytes / (1024 * 1024)} MB.");

        // 1) Check the extension the user gave...
        var extension = Path.GetExtension(fileName).ToLowerInvariant();
        if (extension == ".jpeg") extension = ".jpg";
        var allowed = AllowedFiles.FirstOrDefault(f => f.Extension == extension);
        if (allowed.Extension is null)
            throw new BusinessRuleException("Only JPG, PNG or PDF receipts are allowed.");

        // 2) ...and confirm the file content really is that type (a renamed .exe fails here).
        await using var buffer = new MemoryStream();
        await content.CopyToAsync(buffer, ct);
        if (!StartsWith(buffer.GetBuffer(), buffer.Length, allowed.Signature))
            throw new BusinessRuleException("The file content does not match its extension.");

        buffer.Position = 0;
        var storedPath = await storage.SaveAsync(expenseId, buffer, allowed.Extension, ct);

        var attachment = new ExpenseAttachment
        {
            ExpenseId = expenseId,
            FileName = SafeDisplayName(fileName),
            FilePath = storedPath,
            ContentType = allowed.ContentType,
            FileSizeBytes = buffer.Length,
            UploadedAt = clock.GetUtcNow().UtcDateTime
        };
        db.ExpenseAttachments.Add(attachment);

        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch
        {
            storage.Delete(storedPath); // keep disk and database in sync
            throw;
        }

        return ExpenseMapper.ToAttachment(attachment);
    }

    public async Task DeleteAttachmentAsync(int employeeId, int expenseId, int attachmentId, CancellationToken ct)
    {
        var expense = await LoadOwnedAsync(employeeId, expenseId, ct);
        expense.EnsureEditable();

        var attachment = await db.ExpenseAttachments
            .FirstOrDefaultAsync(a => a.AttachmentId == attachmentId && a.ExpenseId == expenseId, ct)
            ?? throw new NotFoundException("Attachment not found.");

        db.ExpenseAttachments.Remove(attachment);
        await db.SaveChangesAsync(ct);
        storage.Delete(attachment.FilePath);
    }

    public async Task<FileDownload> GetAttachmentAsync(int callerId, int expenseId, int attachmentId, CancellationToken ct)
    {
        // Same permission rule as viewing the expense: owner or assigned manager.
        var attachment = await db.ExpenseAttachments
            .AsNoTracking()
            .FirstOrDefaultAsync(a => a.AttachmentId == attachmentId
                                      && a.ExpenseId == expenseId
                                      && (a.Expense.EmployeeId == callerId || a.Expense.AssignedManagerId == callerId), ct)
            ?? throw new NotFoundException("Attachment not found.");

        Stream stream;
        try
        {
            stream = storage.OpenRead(attachment.FilePath);
        }
        catch (FileNotFoundException)
        {
            throw new NotFoundException("Receipt file is missing from storage.");
        }

        return new FileDownload(stream, attachment.ContentType, attachment.FileName);
    }

    // ------------------------------------------------------------------ helpers

    private async Task<Expense> LoadOwnedAsync(int employeeId, int expenseId, CancellationToken ct) =>
        await db.Expenses.FirstOrDefaultAsync(e => e.ExpenseId == expenseId && e.EmployeeId == employeeId, ct)
        ?? throw new NotFoundException("Expense not found.");

    private async Task EnsureCategoryExistsAsync(int categoryId, CancellationToken ct)
    {
        if (!await db.ExpenseCategories.AnyAsync(c => c.CategoryId == categoryId, ct))
            throw new BusinessRuleException("Selected category does not exist.");
    }

    private static void ApplyRequest(Expense expense, ExpenseRequest r)
    {
        // The DTO's [Required] attributes guarantee these values are present.
        expense.Title = r.Title.Trim();
        expense.CategoryId = r.CategoryId;
        expense.ExpenseDate = r.ExpenseDate!.Value;
        expense.Amount = decimal.Round(r.Amount!.Value, 2);
        expense.MerchantName = string.IsNullOrWhiteSpace(r.MerchantName) ? null : r.MerchantName.Trim();
        expense.Description = string.IsNullOrWhiteSpace(r.Description) ? null : r.Description.Trim();
        expense.PaymentMethod = r.PaymentMethod!.Value;
    }

    private static bool StartsWith(byte[] data, long length, byte[] signature)
    {
        if (length < signature.Length) return false;
        for (var i = 0; i < signature.Length; i++)
            if (data[i] != signature[i]) return false;
        return true;
    }

    /// <summary>Keeps only the file name part and removes characters that are unsafe to display.</summary>
    private static string SafeDisplayName(string fileName)
    {
        var name = Path.GetFileName(fileName);
        foreach (var c in Path.GetInvalidFileNameChars())
            name = name.Replace(c, '_');
        name = name.Trim();
        if (name.Length == 0) name = "receipt";
        return name.Length > 255 ? name[^255..] : name;
    }
}
