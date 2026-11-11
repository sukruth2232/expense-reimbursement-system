using System.Security.Claims;
using System.Text;
using ExpenseReimbursement.Core.Entities;
using ExpenseReimbursement.Core.Interfaces;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;

namespace ExpenseReimbursement.Infrastructure.Security;

/// <summary>
/// Creates the JWT returned by POST /api/auth/login.
///
/// The token carries four claims:
///   sub   - the user's ID (this is how every later request knows WHO is calling)
///   email - for display
///   name  - for display
///   role  - Employee or Manager (used by [Authorize(Roles = "...")])
///
/// It is signed with HMAC-SHA256 using a server-only secret key, so the browser can read it
/// but cannot change it: altering "role" or "sub" breaks the signature and the API rejects it.
/// </summary>
public class JwtTokenService(IOptions<JwtOptions> options) : ITokenService
{
    private readonly JwtOptions _options = options.Value;

    public (string Token, DateTime ExpiresAt) CreateToken(User user)
    {
        var expiresAt = DateTime.UtcNow.AddMinutes(_options.ExpiryMinutes);
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_options.SigningKey));

        var descriptor = new SecurityTokenDescriptor
        {
            Issuer = _options.Issuer,
            Audience = _options.Audience,
            Expires = expiresAt,
            SigningCredentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256),
            Subject = new ClaimsIdentity(
            [
                new Claim(JwtRegisteredClaimNames.Sub, user.UserId.ToString()),
                new Claim(JwtRegisteredClaimNames.Email, user.Email),
                new Claim(JwtRegisteredClaimNames.Name, user.FullName),
                new Claim("role", user.Role.ToString())
            ])
        };

        var token = new JsonWebTokenHandler().CreateToken(descriptor);
        return (token, expiresAt);
    }
}
