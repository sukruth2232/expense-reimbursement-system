using ExpenseReimbursement.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ExpenseReimbursement.Infrastructure.Data.Configurations;

/// <summary>Table "ExpenseAttachments" - receipt metadata.</summary>
public class ExpenseAttachmentConfiguration : IEntityTypeConfiguration<ExpenseAttachment>
{
    public void Configure(EntityTypeBuilder<ExpenseAttachment> b)
    {
        b.ToTable("ExpenseAttachments", t =>
        {
            t.HasCheckConstraint("CK_Attachments_ContentType",
                "\"ContentType\" IN ('image/jpeg', 'image/png', 'application/pdf')");
            t.HasCheckConstraint("CK_Attachments_Size",
                "\"FileSizeBytes\" > 0 AND \"FileSizeBytes\" <= 5242880");
        });

        b.HasKey(a => a.AttachmentId);
        b.Property(a => a.FileName).HasMaxLength(255).IsRequired();
        b.Property(a => a.FilePath).HasMaxLength(500).IsRequired();
        b.Property(a => a.ContentType).HasMaxLength(100).IsRequired();
        b.Property(a => a.UploadedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
        b.HasIndex(a => a.FilePath).IsUnique();

        // Cascade: a receipt row has no meaning without its expense.
        b.HasOne(a => a.Expense)
            .WithMany(e => e.Attachments)
            .HasForeignKey(a => a.ExpenseId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
