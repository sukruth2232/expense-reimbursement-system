namespace ExpenseReimbursement.Core.Entities;

/// <summary>
/// Metadata for one receipt file. The file itself lives on disk under
/// storage/receipts; only its relative path is stored here.
/// </summary>
public class ExpenseAttachment
{
    public int AttachmentId { get; set; }

    public int ExpenseId { get; set; }
    public Expense Expense { get; set; } = null!;

    /// <summary>Original file name, cleaned. Shown to users only.</summary>
    public string FileName { get; set; } = string.Empty;

    /// <summary>Relative storage path with a random GUID name. Never sent to the browser.</summary>
    public string FilePath { get; set; } = string.Empty;

    /// <summary>Detected from the file's first bytes, not trusted from the browser.</summary>
    public string ContentType { get; set; } = string.Empty;

    public long FileSizeBytes { get; set; }
    public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
}
