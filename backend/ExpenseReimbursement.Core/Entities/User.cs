using ExpenseReimbursement.Core.Enums;

namespace ExpenseReimbursement.Core.Entities;

/// <summary>
/// An employee or a manager. Each employee points to their manager through ManagerId
/// (a self-referencing foreign key on the Users table).
/// </summary>
public class User
{
    public int UserId { get; set; }
    public string FullName { get; set; } = string.Empty;

    /// <summary>Always stored in lower case so login is case-insensitive.</summary>
    public string Email { get; set; } = string.Empty;

    /// <summary>PBKDF2 hash produced by ASP.NET Core's PasswordHasher. Never the plain password.</summary>
    public string PasswordHash { get; set; } = string.Empty;

    public UserRole Role { get; set; }

    /// <summary>The employee's manager. Null for managers.</summary>
    public int? ManagerId { get; set; }
    public User? Manager { get; set; }

    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>Employees reporting to this user (only filled for managers).</summary>
    public ICollection<User> TeamMembers { get; set; } = new List<User>();
}
