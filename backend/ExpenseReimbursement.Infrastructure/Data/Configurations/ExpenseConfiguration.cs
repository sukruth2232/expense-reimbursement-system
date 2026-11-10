using ExpenseReimbursement.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ExpenseReimbursement.Infrastructure.Data.Configurations;

/// <summary>Table "Expenses" - the centre of the data model.</summary>
public class ExpenseConfiguration : IEntityTypeConfiguration<Expense>
{
    public void Configure(EntityTypeBuilder<Expense> b)
    {
        b.ToTable("Expenses", t =>
        {
            // Database-level safety nets. The C# rules run first; these catch any bug that slips through.
            t.HasCheckConstraint("CK_Expenses_Amount", "\"Amount\" > 0");
            t.HasCheckConstraint("CK_Expenses_Status",
                "\"Status\" IN ('Draft', 'PendingApproval', 'Approved', 'Rejected')");
            t.HasCheckConstraint("CK_Expenses_PaymentMethod",
                "\"PaymentMethod\" IN ('Cash', 'CorporateCard', 'PersonalCard', 'Upi', 'BankTransfer', 'Other')");
            t.HasCheckConstraint("CK_Expenses_Submitted",
                "\"Status\" = 'Draft' OR (\"SubmittedAt\" IS NOT NULL AND \"AssignedManagerId\" IS NOT NULL)");
        });

        b.HasKey(e => e.ExpenseId);

        // Filled by PostgreSQL on insert using the sequence declared in AppDbContext.
        b.Property(e => e.ExpenseNumber)
            .HasMaxLength(20)
            .HasDefaultValueSql("'EXP-' || lpad(nextval('expense_number_seq')::text, 6, '0')")
            .ValueGeneratedOnAdd();
        b.HasIndex(e => e.ExpenseNumber).IsUnique();

        b.Property(e => e.Title).HasMaxLength(150).IsRequired();
        b.Property(e => e.Description).HasMaxLength(1000);
        b.Property(e => e.MerchantName).HasMaxLength(150);
        b.Property(e => e.PaymentMethod).HasConversion<string>().HasMaxLength(20).IsRequired();
        b.Property(e => e.Amount).HasPrecision(12, 2);          // numeric(12,2)
        b.Property(e => e.ExpenseDate).HasColumnType("date");
        b.Property(e => e.Status).HasConversion<string>().HasMaxLength(20).IsRequired();
        b.Property(e => e.CreatedAt).HasDefaultValueSql("now()");
        b.Property(e => e.UpdatedAt).HasDefaultValueSql("now()");

        // Npgsql maps a uint marked IsRowVersion() to PostgreSQL's built-in xmin column.
        // No extra column is created; EF adds "WHERE xmin = @old" to every UPDATE.
        b.Property(e => e.RowVersion).IsRowVersion();

        // Relationships (all Restrict: history and money records are never cascade-deleted).
        b.HasOne(e => e.Employee).WithMany()
            .HasForeignKey(e => e.EmployeeId).OnDelete(DeleteBehavior.Restrict);

        b.HasOne(e => e.AssignedManager).WithMany()
            .HasForeignKey(e => e.AssignedManagerId).OnDelete(DeleteBehavior.Restrict);

        b.HasOne(e => e.Category).WithMany()
            .HasForeignKey(e => e.CategoryId).OnDelete(DeleteBehavior.Restrict);

        // Indexes match the two main queries:
        //   "my expenses filtered by status"          -> (EmployeeId, Status)
        //   "manager's pending queue, oldest first"   -> (AssignedManagerId, Status, SubmittedAt)
        b.HasIndex(e => new { e.EmployeeId, e.Status });
        b.HasIndex(e => new { e.AssignedManagerId, e.Status, e.SubmittedAt });
    }
}
