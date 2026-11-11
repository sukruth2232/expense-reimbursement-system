using ExpenseReimbursement.Core.Interfaces;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;

namespace ExpenseReimbursement.Infrastructure.Storage;

/// <summary>
/// Saves receipts to the local disk.
///
/// Security choices:
///  - The stored name is a random GUID, never the user's file name, so nobody can
///    overwrite another file or use "..\..\" path tricks.
///  - Files sit outside wwwroot, so they cannot be opened by URL. The only way to read
///    one is GET /api/expenses/{id}/attachments/{attachmentId}, which checks permissions.
/// </summary>
public class LocalFileStorage(IOptions<FileStorageOptions> options, IHostEnvironment env) : IFileStorage
{
    // Always ends with a separator so the "is it inside the folder?" check below is exact.
    private readonly string _root = Path.TrimEndingDirectorySeparator(
        Path.GetFullPath(Path.Combine(env.ContentRootPath, options.Value.RootPath))) + Path.DirectorySeparatorChar;

    public async Task<string> SaveAsync(int expenseId, Stream content, string extension, CancellationToken ct)
    {
        var relativePath = Path.Combine(expenseId.ToString(), $"{Guid.NewGuid():N}{extension}");
        var fullPath = ToFullPath(relativePath);

        Directory.CreateDirectory(Path.GetDirectoryName(fullPath)!);
        await using var file = new FileStream(fullPath, FileMode.CreateNew, FileAccess.Write);
        await content.CopyToAsync(file, ct);

        // Store with forward slashes so paths look the same on Windows and Linux.
        return relativePath.Replace('\\', '/');
    }

    public Stream OpenRead(string relativePath)
    {
        var fullPath = ToFullPath(relativePath);
        if (!File.Exists(fullPath))
            throw new FileNotFoundException("Receipt file is missing from storage.");
        return new FileStream(fullPath, FileMode.Open, FileAccess.Read, FileShare.Read);
    }

    public void Delete(string relativePath)
    {
        var fullPath = ToFullPath(relativePath);
        if (File.Exists(fullPath))
            File.Delete(fullPath);
    }

    /// <summary>Resolves a stored path and refuses anything that would escape the storage folder.</summary>
    private string ToFullPath(string relativePath)
    {
        var fullPath = Path.GetFullPath(Path.Combine(_root, relativePath));
        if (!fullPath.StartsWith(_root, StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("Invalid storage path.");
        return fullPath;
    }
}
