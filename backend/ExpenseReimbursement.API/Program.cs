using ExpenseReimbursement.API.Extensions;
using ExpenseReimbursement.Core.Interfaces;
using ExpenseReimbursement.Infrastructure;
using ExpenseReimbursement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

// ============================================================================
// Expenso API - application start-up
// 1) Register services (dependency injection)
// 2) Build the app
// 3) Configure the HTTP pipeline (the order of middleware matters)
// ============================================================================

var builder = WebApplication.CreateBuilder(args);

// ---- 1. Services -----------------------------------------------------------
builder.Services
    .AddApiCore()                                      // controllers, JSON, error handling
    .AddJwtAuthentication(builder.Configuration)       // who is calling?
    .AddAngularCors(builder.Configuration)
    .AddApiDocumentation()                             // OpenAPI + Swagger UI
    .AddInfrastructure(builder.Configuration, builder.Environment.ContentRootPath); // EF Core, services, storage, JWT signing

var app = builder.Build();

// ---- 2. Development-only start-up tasks ------------------------------------
if (app.Environment.IsDevelopment())
{
    // Create the local SQLite schema if needed, then create the demo users.
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.EnsureCreatedAsync();
    await DbSeeder.SeedAsync(
        db,
        scope.ServiceProvider.GetRequiredService<IPasswordService>(),
        app.Configuration["Seed:DefaultPassword"] ?? string.Empty,
        app.Logger);

    app.MapOpenApi();                                  // /openapi/v1.json
    app.UseSwaggerUI(o =>
    {
        o.SwaggerEndpoint("/openapi/v1.json", "Expenso API v1");
        o.DocumentTitle = "Expenso API";
    });
}

// ---- 3. HTTP pipeline -------------------------------------------------------
app.UseExceptionHandler();                             // GlobalExceptionHandler -> ProblemDetails
app.UseStatusCodePages();                              // empty 401/403/404 bodies become ProblemDetails too
app.UseHttpsRedirection();
app.UseCors(ApiServiceExtensions.AngularCorsPolicy);
app.UseAuthentication();                               // reads the JWT and fills HttpContext.User
app.UseAuthorization();                                // enforces [Authorize] / roles

app.MapControllers();
app.MapGet("/", () => Results.Redirect("/swagger")).ExcludeFromDescription();

app.Run();
