using ExpenseReimbursement.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ExpenseReimbursement.Infrastructure.Data.Configurations;

/// <summary>Table "ExpenseCategories" plus its six fixed rows.</summary>
public class ExpenseCategoryConfiguration : IEntityTypeConfiguration<ExpenseCategory>
{
    public void Configure(EntityTypeBuilder<ExpenseCategory> b)
    {
        b.ToTable("ExpenseCategories");
        b.HasKey(c => c.CategoryId);
        b.Property(c => c.CategoryName).HasMaxLength(50).IsRequired();
        b.HasIndex(c => c.CategoryName).IsUnique();

        // HasData = seed rows written into the migration itself,
        // so every database created from the migrations has the same categories.
        b.HasData(
            new ExpenseCategory { CategoryId = 1, CategoryName = "Travel" },
            new ExpenseCategory { CategoryId = 2, CategoryName = "Food" },
            new ExpenseCategory { CategoryId = 3, CategoryName = "Accommodation" },
            new ExpenseCategory { CategoryId = 4, CategoryName = "Transportation" },
            new ExpenseCategory { CategoryId = 5, CategoryName = "Office Supplies" },
            new ExpenseCategory { CategoryId = 6, CategoryName = "Other" });
    }
}
