namespace ExpenseReimbursement.Infrastructure.Storage;

/// <summary>Bound from the "FileStorage" section of appsettings.json.</summary>
public class FileStorageOptions
{
    public const string SectionName = "FileStorage";

    /// <summary>Folder for receipts, relative to the API's content root. Git-ignored.</summary>
    public string RootPath { get; set; } = "storage/receipts";

    /// <summary>5 MB by default.</summary>
    public long MaxFileSizeBytes { get; set; } = 5 * 1024 * 1024;
}
