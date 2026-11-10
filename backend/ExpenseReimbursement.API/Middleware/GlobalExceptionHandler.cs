using ExpenseReimbursement.Core.Exceptions;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ExpenseReimbursement.API.Middleware;

/// <summary>
/// Catches every unhandled exception and turns it into a consistent JSON error
/// (RFC 7807 "ProblemDetails"). Controllers therefore contain no try/catch blocks.
///
///   NotFoundException            -> 404
///   ForbiddenException           -> 403
///   UnauthorizedAccessException  -> 401 (wrong login)
///   BusinessRuleException        -> 409 (workflow rule broken)
///   DbUpdateConcurrencyException -> 409 (someone else changed the record first)
///   anything else                -> 500, details logged but hidden from the client
/// </summary>
public class GlobalExceptionHandler(IProblemDetailsService problemDetails, ILogger<GlobalExceptionHandler> logger)
    : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext context, Exception exception, CancellationToken ct)
    {
        var (status, title, detail) = exception switch
        {
            NotFoundException e => (StatusCodes.Status404NotFound, "Not found", e.Message),
            ForbiddenException e => (StatusCodes.Status403Forbidden, "Forbidden", e.Message),
            UnauthorizedAccessException e => (StatusCodes.Status401Unauthorized, "Unauthorized", e.Message),
            BusinessRuleException e => (StatusCodes.Status409Conflict, "Business rule violated", e.Message),
            DbUpdateConcurrencyException => (StatusCodes.Status409Conflict, "Concurrent update",
                "This expense was changed by someone else. Reload and try again."),
            _ => (StatusCodes.Status500InternalServerError, "Server error",
                "Something went wrong. Please try again.")
        };

        if (status == StatusCodes.Status500InternalServerError)
            logger.LogError(exception, "Unhandled exception for {Method} {Path}", context.Request.Method, context.Request.Path);
        else
            logger.LogInformation("{Status} {Title}: {Detail}", status, title, detail);

        context.Response.StatusCode = status;
        return await problemDetails.TryWriteAsync(new ProblemDetailsContext
        {
            HttpContext = context,
            Exception = exception,
            ProblemDetails = new ProblemDetails { Status = status, Title = title, Detail = detail }
        });
    }
}
