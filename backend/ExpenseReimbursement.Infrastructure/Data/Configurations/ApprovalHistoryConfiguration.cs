using ExpenseReimbursement.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ExpenseReimbursement.Infrastructure.Data.Configurations;

/// <summary>Table "ApprovalHistory" - the audit trail.</summary>
public class ApprovalHistoryConfiguration : IEntityTypeConfiguration<ApprovalHistory>
{
    public void Configure(EntityTypeBuilder<ApprovalHistory> b)
    {
        b.ToTable("ApprovalHistory", t =>
        {
            t.HasCheckConstraint("CK_ApprovalHistory_Action", "\"Action\" IN ('Approved', 'Rejected')");
            // A rejection without a reason cannot even be stored.
            t.HasCheckConstraint("CK_ApprovalHistory_RejectReason",
                "\"Action\" <> 'Rejected' OR length(btrim(coalesce(\"Comments\", ''))) > 0");
        });

        b.HasKey(h => h.ApprovalId);
        b.Property(h => h.Action).HasConversion<string>().HasMaxLength(20).IsRequired();
        b.Property(h => h.Comments).HasMaxLength(1000);
        b.Property(h => h.ActionDate).HasDefaultValueSql("now()");

        // Restrict: an expense that has audit history can never be deleted.
        b.HasOne(h => h.Expense)
            .WithMany(e => e.History)
            .HasForeignKey(h => h.ExpenseId)
            .OnDelete(DeleteBehavior.Restrict);

        b.HasOne(h => h.Approver).WithMany()
            .HasForeignKey(h => h.ApproverId)
            .OnDelete(DeleteBehavior.Restrict);

        b.HasIndex(h => new { h.ExpenseId, h.ActionDate });
        b.HasIndex(h => h.ApproverId);
    }
}
