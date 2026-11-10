using ExpenseReimbursement.Core.Entities;
using ExpenseReimbursement.Core.Enums;
using ExpenseReimbursement.Core.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace ExpenseReimbursement.Infrastructure.Data;

/// <summary>
/// Creates the manager demo account and their seven employee accounts in Development.
///
/// Why not HasData like the categories? HasData values are baked into the migration file,
/// and a password hash in a migration would be committed to Git. Here the password comes
/// from configuration (user-secrets) and is hashed at runtime.
///
/// Idempotent: it upserts the known accounts, including renaming the previous demo users.
/// </summary>
public static class DbSeeder
{
    public static async Task SeedAsync(AppDbContext db, IPasswordService passwords, string defaultPassword, ILogger logger)
    {
        if (string.IsNullOrWhiteSpace(defaultPassword))
        {
            logger.LogWarning("Seed:DefaultPassword is not set; demo users were not created. Run setup-dev-secrets.ps1.");
            return;
        }

        var manager = await EnsureUserAsync(db, passwords, "Ram chinta", "ramchinta@gmail.com",
            UserRole.Manager, managerId: null, defaultPassword,
            legacyEmails: ["manager@gmail.com", "manager@expenso.local"]);

        (string Name, string Email, string[] LegacyEmails)[] team =
        [
            ("Sukruth", "sukruth@gmail.com", ["employee1@expenso.local"]),
            ("Manikanta", "manikanta@gmail.com", ["employee2@expenso.local"]),
            ("Yashwanth", "yashwanth@gmail.com", ["employee3@expenso.local"]),
            ("Dawood", "dawood@gmail.com", []),
            ("Satwik", "satwik@gmail.com", []),
            ("jaynith", "jaynith@gmail.com", []),
            ("Charan", "charan@gmail.com", [])
        ];

        foreach (var member in team)
            await EnsureUserAsync(db, passwords, member.Name, member.Email, UserRole.Employee,
                manager.UserId, defaultPassword, member.LegacyEmails);

        logger.LogInformation("Manager and seven team accounts are ready (ramchinta@gmail.com).");
    }

    private static async Task<User> EnsureUserAsync(AppDbContext db, IPasswordService passwords,
        string fullName, string email, UserRole role, int? managerId, string password,
        string[]? legacyEmails = null)
    {
        var candidateEmails = new[] { email }.Concat(legacyEmails ?? []);
        var user = await db.Users.FirstOrDefaultAsync(u => candidateEmails.Contains(u.Email));
        if (user is null)
        {
            user = new User { CreatedAt = DateTime.UtcNow };
            db.Users.Add(user);
        }

        user.FullName = fullName;
        user.Email = email;
        user.Role = role;
        user.ManagerId = managerId;
        user.IsActive = true;
        user.PasswordHash = passwords.Hash(user, password);
        await db.SaveChangesAsync();
        return user;
    }
}
