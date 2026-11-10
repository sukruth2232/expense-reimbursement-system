using System.Text;
using System.Text.Json.Serialization;
using ExpenseReimbursement.API.Middleware;
using ExpenseReimbursement.Infrastructure.Security;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;

namespace ExpenseReimbursement.API.Extensions;

/// <summary>Keeps Program.cs short: each method sets up one concern.</summary>
public static class ApiServiceExtensions
{
    public const string AngularCorsPolicy = "Angular";

    /// <summary>Controllers, JSON settings, validation errors and global error handling.</summary>
    public static IServiceCollection AddApiCore(this IServiceCollection services)
    {
        services.AddControllers()
            .AddJsonOptions(o =>
            {
                // Send enums as text ("PendingApproval") instead of numbers.
                o.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
            });

        services.AddProblemDetails();
        services.AddExceptionHandler<GlobalExceptionHandler>();
        return services;
    }

    /// <summary>
    /// JWT authentication: on every request, read "Authorization: Bearer &lt;token&gt;",
    /// check its signature, issuer, audience and expiry, then fill HttpContext.User.
    /// </summary>
    public static IServiceCollection AddJwtAuthentication(this IServiceCollection services, IConfiguration config)
    {
        var jwt = config.GetSection(JwtOptions.SectionName).Get<JwtOptions>() ?? new JwtOptions();

        if (Encoding.UTF8.GetByteCount(jwt.SigningKey) < 32)
            throw new InvalidOperationException(
                "Jwt:SigningKey must be at least 32 characters. Run backend/setup-dev-secrets.ps1 (see README).");

        services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options =>
            {
                // Keep claim names exactly as issued ("sub", "role") instead of long XML-style names.
                options.MapInboundClaims = false;
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidIssuer = jwt.Issuer,
                    ValidateAudience = true,
                    ValidAudience = jwt.Audience,
                    ValidateLifetime = true,
                    ClockSkew = TimeSpan.FromSeconds(30),
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.SigningKey)),
                    NameClaimType = "name",
                    RoleClaimType = "role"   // makes [Authorize(Roles = "Manager")] read our "role" claim
                };
            });

        services.AddAuthorization();
        return services;
    }

    /// <summary>
    /// Allows the Angular dev server to call the API directly if needed.
    /// (In development Angular normally goes through its proxy, which needs no CORS.)
    /// </summary>
    public static IServiceCollection AddAngularCors(this IServiceCollection services, IConfiguration config)
    {
        var origins = config.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? ["http://localhost:4200"];
        services.AddCors(o => o.AddPolicy(AngularCorsPolicy, p =>
            p.WithOrigins(origins).AllowAnyHeader().AllowAnyMethod()));
        return services;
    }

    /// <summary>OpenAPI document + an "Authorize" button in Swagger UI for pasting a JWT.</summary>
    public static IServiceCollection AddApiDocumentation(this IServiceCollection services)
    {
        services.AddOpenApi(options =>
        {
            options.AddDocumentTransformer((document, _, _) =>
            {
                document.Info.Title = "Expenso API";
                document.Info.Description = "Expense Reimbursement & Approval System. " +
                                            "Log in with POST /api/auth/login, then click Authorize and paste the accessToken.";

                document.Components ??= new OpenApiComponents();
                document.Components.SecuritySchemes ??= new Dictionary<string, IOpenApiSecurityScheme>();
                document.Components.SecuritySchemes["Bearer"] = new OpenApiSecurityScheme
                {
                    Type = SecuritySchemeType.Http,
                    Scheme = "bearer",
                    BearerFormat = "JWT",
                    Description = "Paste the accessToken returned by /api/auth/login"
                };

                document.Security ??= new List<OpenApiSecurityRequirement>();
                document.Security.Add(new OpenApiSecurityRequirement
                {
                    [new OpenApiSecuritySchemeReference("Bearer", document)] = new List<string>()
                });
                return Task.CompletedTask;
            });
        });
        return services;
    }
}
