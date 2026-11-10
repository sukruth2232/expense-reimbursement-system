using ExpenseReimbursement.Core.Entities;
using ExpenseReimbursement.Core.Enums;
using ExpenseReimbursement.Core.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace ExpenseReimbursement.Infrastructure.Data;

/// <summary>
/// Creates the demo users (Development only): 1 manager and 3 employees reporting to them.
///
/// Why not HasData like the categories? HasData values are baked into the migration file,
/// and a password hash in a migration would be committed to Git. Here the password comes
/// from configuration (user-secrets) and is hashed at runtime.
///
/// Idempotent: it only inserts users that don't exist yet, so running it on every start is safe.
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

        var manager = await EnsureUserAsync(db, passwords, "Rahul Verma", "manager@expenso.local",
            UserRole.Manager, managerId: null, defaultPassword);

        await EnsureUserAsync(db, passwords, "Ananya Reddy", "employee1@expenso.local", UserRole.Employee, manager.UserId, defaultPassword);
        await EnsureUserAsync(db, passwords, "Karthik Rao", "employee2@expenso.local", UserRole.Employee, manager.UserId, defaultPassword);
        await EnsureUserAsync(db, passwords, "Sneha Iyer", "employee3@expenso.local", UserRole.Employee, manager.UserId, defaultPassword);

        logger.LogInformation("Demo users are ready (manager@expenso.local, employee1-3@expenso.local).");
    }

    private static async Task<User> EnsureUserAsync(AppDbContext db, IPasswordService passwords,
        string fullName, string email, UserRole role, int? managerId, string password)
    {
        var existing = await db.Users.FirstOrDefaultAsync(u => u.Email == email);
        if (existing is not null) return existing;

        var user = new User
        {
            FullName = fullName,
            Email = email,
            Role = role,
            ManagerId = managerId,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
        user.PasswordHash = passwords.Hash(user, password);

        db.Users.Add(user);
        await db.SaveChangesAsync();
        return user;
    }
}
