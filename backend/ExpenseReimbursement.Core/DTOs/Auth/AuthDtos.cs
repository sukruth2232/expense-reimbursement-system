using System.ComponentModel.DataAnnotations;
using ExpenseReimbursement.Core.Enums;

namespace ExpenseReimbursement.Core.DTOs.Auth;

// DTO = Data Transfer Object: the exact JSON shape the API sends or receives.
// We never return entities directly, so PasswordHash and internal fields can't leak.

public class LoginRequest
{
    [Required, EmailAddress, MaxLength(256)]
    public string Email { get; set; } = string.Empty;

    [Required, MaxLength(128)]
    public string Password { get; set; } = string.Empty;
}

public record CurrentUserDto(
    int UserId,
    string FullName,
    string Email,
    UserRole Role,
    string? ManagerName);

public record LoginResponse(
    string AccessToken,
    DateTime ExpiresAt,
    CurrentUserDto User);
