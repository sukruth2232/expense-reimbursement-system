using ExpenseReimbursement.API.Extensions;
using ExpenseReimbursement.Core.DTOs.Auth;
using ExpenseReimbursement.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ExpenseReimbursement.API.Controllers;

/// <summary>
/// Login and current-user endpoints.
/// Controllers in this project follow one pattern: read the user from the token,
/// call ONE service method, return the result. No business logic lives here.
/// </summary>
[ApiController]
[Route("api/auth")]
public class AuthController(IAuthService auth) : ControllerBase
{
    /// <summary>Exchange email + password for a JWT.</summary>
    [HttpPost("login")]
    [AllowAnonymous]
    [ProducesResponseType<LoginResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<LoginResponse>> Login(LoginRequest request, CancellationToken ct) =>
        Ok(await auth.LoginAsync(request, ct));

    /// <summary>Who am I? Used by Angular after a page refresh to confirm the token is still good.</summary>
    [HttpGet("me")]
    [Authorize]
    public async Task<ActionResult<CurrentUserDto>> Me(CancellationToken ct) =>
        Ok(await auth.GetCurrentUserAsync(User.GetUserId(), ct));
}
