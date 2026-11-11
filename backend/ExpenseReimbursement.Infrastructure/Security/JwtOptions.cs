namespace ExpenseReimbursement.Infrastructure.Security;

/// <summary>
/// Bound from the "Jwt" section of configuration.
/// SigningKey is NOT in appsettings.json: in development it comes from user-secrets,
/// in production from an environment variable or a secret store.
/// </summary>
public class JwtOptions
{
    public const string SectionName = "Jwt";

    public string Issuer { get; set; } = "Expenso.API";
    public string Audience { get; set; } = "Expenso.Web";
    public int ExpiryMinutes { get; set; } = 60;
    public string SigningKey { get; set; } = string.Empty;
}
