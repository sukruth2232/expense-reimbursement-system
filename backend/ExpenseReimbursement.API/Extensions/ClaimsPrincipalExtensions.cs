using System.Security.Claims;

namespace ExpenseReimbursement.API.Extensions;

/// <summary>
/// Reads the logged-in user's ID from the validated JWT ("sub" claim).
/// This is the ONLY place the API gets "who is calling" from - never from a request body,
/// query string or route value, so a user cannot pretend to be someone else.
/// </summary>
public static class ClaimsPrincipalExtensions
{
    public static int GetUserId(this ClaimsPrincipal user)
    {
        var sub = user.FindFirstValue("sub");
        return int.TryParse(sub, out var id)
            ? id
            : throw new UnauthorizedAccessException("Invalid token.");
    }
}
