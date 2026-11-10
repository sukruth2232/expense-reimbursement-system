using ExpenseReimbursement.Core.Entities;
using Microsoft.EntityFrameworkCore;

namespace ExpenseReimbursement.Infrastructure.Data;

/// <summary>
/// The EF Core "unit of work". Each DbSet is one PostgreSQL table.
/// Table design (keys, lengths, indexes, check constraints) is NOT written here:
/// each entity has its own IEntityTypeConfiguration class in Data/Configurations,
/// and ApplyConfigurationsFromAssembly picks them all up.
/// </summary>
public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<ExpenseCategory> ExpenseCategories => Set<ExpenseCategory>();
    public DbSet<Expense> Expenses => Set<Expense>();
    public DbSet<ExpenseAttachment> ExpenseAttachments => Set<ExpenseAttachment>();
    public DbSet<ApprovalHistory> ApprovalHistory => Set<ApprovalHistory>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Generates readable expense numbers: EXP-000001, EXP-000002, ...
        modelBuilder.HasSequence<long>("expense_number_seq").StartsAt(1);

        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
    }
}
