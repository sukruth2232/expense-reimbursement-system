using ExpenseReimbursement.Core.DTOs.Auth;
using ExpenseReimbursement.Core.Exceptions;
using ExpenseReimbursement.Core.Interfaces;
using ExpenseReimbursement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace ExpenseReimbursement.Infrastructure.Services;

/// <summary>Login and "who am I".</summary>
public class AuthService(AppDbContext db, IPasswordService passwords, ITokenService tokens) : IAuthService
{
    // One message for every login failure, so an attacker can't learn which emails exist.
    private const string InvalidLogin = "Invalid email or password.";

    public async Task<LoginResponse> LoginAsync(LoginRequest request, CancellationToken ct)
    {
        var email = request.Email.Trim().ToLowerInvariant();

        var user = await db.Users
            .Include(u => u.Manager)
            .FirstOrDefaultAsync(u => u.Email == email, ct);

        if (user is null || !user.IsActive || !passwords.Verify(user, request.Password))
            throw new UnauthorizedAccessException(InvalidLogin);

        var (token, expiresAt) = tokens.CreateToken(user);
        return new LoginResponse(token, expiresAt, ToDto(user));
    }

    public async Task<CurrentUserDto> GetCurrentUserAsync(int userId, CancellationToken ct)
    {
        var user = await db.Users
            .AsNoTracking()
            .Include(u => u.Manager)
            .FirstOrDefaultAsync(u => u.UserId == userId && u.IsActive, ct)
            ?? throw new NotFoundException("User not found.");

        return ToDto(user);
    }

    private static CurrentUserDto ToDto(Core.Entities.User u) =>
        new(u.UserId, u.FullName, u.Email, u.Role, u.Manager?.FullName);
}
