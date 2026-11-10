using ExpenseReimbursement.Core.Interfaces;
using ExpenseReimbursement.Infrastructure.Data;
using ExpenseReimbursement.Infrastructure.Security;
using ExpenseReimbursement.Infrastructure.Services;
using ExpenseReimbursement.Infrastructure.Storage;
using Microsoft.EntityFrameworkCore;
using Microsoft.Data.Sqlite;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace ExpenseReimbursement.Infrastructure;

/// <summary>
/// One place that tells ASP.NET Core "when a controller asks for IExpenseService, give it
/// an ExpenseService". Program.cs just calls builder.Services.AddInfrastructure(config).
/// </summary>
public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration config, string contentRootPath)
    {
        var connectionString = config.GetConnectionString("Default") ?? "Data Source=expenso.db";
        var sqliteConnection = new SqliteConnectionStringBuilder(connectionString);
        if (!Path.IsPathRooted(sqliteConnection.DataSource))
            sqliteConnection.DataSource = Path.Combine(contentRootPath, sqliteConnection.DataSource);

        // DbContext is "scoped": one instance per HTTP request.
        services.AddDbContext<AppDbContext>(options => options.UseSqlite(sqliteConnection.ConnectionString));

        services.Configure<JwtOptions>(config.GetSection(JwtOptions.SectionName));
        services.Configure<FileStorageOptions>(config.GetSection(FileStorageOptions.SectionName));

        // TimeProvider lets services ask for "now" in a way tests can control.
        services.AddSingleton(TimeProvider.System);

        services.AddSingleton<IPasswordService, PasswordService>();
        services.AddSingleton<ITokenService, JwtTokenService>();
        services.AddSingleton<IFileStorage, LocalFileStorage>();

        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<ICategoryService, CategoryService>();
        services.AddScoped<IExpenseService, ExpenseService>();
        services.AddScoped<IApprovalService, ApprovalService>();
        services.AddScoped<IDashboardService, DashboardService>();

        return services;
    }
}
