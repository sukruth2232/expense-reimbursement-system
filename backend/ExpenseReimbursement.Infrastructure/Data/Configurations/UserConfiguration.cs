using ExpenseReimbursement.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ExpenseReimbursement.Infrastructure.Data.Configurations;

/// <summary>Table "Users".</summary>
public class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> b)
    {
        b.ToTable("Users", t =>
        {
            t.HasCheckConstraint("CK_Users_Role", "\"Role\" IN ('Employee', 'Manager')");
            t.HasCheckConstraint("CK_Users_NotOwnManager", "\"ManagerId\" IS NULL OR \"ManagerId\" <> \"UserId\"");
        });

        b.HasKey(u => u.UserId);

        b.Property(u => u.FullName).HasMaxLength(100).IsRequired();
        b.Property(u => u.Email).HasMaxLength(256).IsRequired();
        b.Property(u => u.PasswordHash).IsRequired();
        b.Property(u => u.Role).HasConversion<string>().HasMaxLength(20).IsRequired();
        b.Property(u => u.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");

        // Login looks users up by email, and two users can never share one.
        b.HasIndex(u => u.Email).IsUnique();

        // Self-referencing relationship: an employee has one manager, a manager has many employees.
        // Restrict = you cannot delete a manager who still has team members.
        b.HasOne(u => u.Manager)
            .WithMany(m => m.TeamMembers)
            .HasForeignKey(u => u.ManagerId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
