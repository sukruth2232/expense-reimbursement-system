using ExpenseReimbursement.Core.Entities;
using ExpenseReimbursement.Core.Interfaces;
using Microsoft.AspNetCore.Identity;

namespace ExpenseReimbursement.Infrastructure.Security;

/// <summary>
/// Uses ASP.NET Core's built-in PasswordHasher: PBKDF2 with HMAC-SHA512, a random salt per
/// password and 100,000 iterations. The salt and settings are stored inside the hash string,
/// so we only need one column (PasswordHash). We never store or log the plain password.
/// </summary>
public class PasswordService : IPasswordService
{
    private readonly PasswordHasher<User> _hasher = new();

    public string Hash(User user, string password) => _hasher.HashPassword(user, password);

    public bool Verify(User user, string password)
    {
        var result = _hasher.VerifyHashedPassword(user, user.PasswordHash, password);
        return result is PasswordVerificationResult.Success or PasswordVerificationResult.SuccessRehashNeeded;
    }
}
