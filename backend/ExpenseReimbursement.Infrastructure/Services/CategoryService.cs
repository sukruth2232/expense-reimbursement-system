using ExpenseReimbursement.Core.DTOs.Expenses;
using ExpenseReimbursement.Core.Interfaces;
using ExpenseReimbursement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace ExpenseReimbursement.Infrastructure.Services;

/// <summary>Feeds the Category dropdown on the expense form.</summary>
public class CategoryService(AppDbContext db) : ICategoryService
{
    public async Task<IReadOnlyList<CategoryDto>> GetAllAsync(CancellationToken ct) =>
        await db.ExpenseCategories
            .AsNoTracking()
            .OrderBy(c => c.CategoryId)
            .Select(c => new CategoryDto(c.CategoryId, c.CategoryName))
            .ToListAsync(ct);
}
