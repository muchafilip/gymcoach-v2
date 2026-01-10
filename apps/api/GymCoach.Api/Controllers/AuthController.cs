using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using GymCoach.Api.Services;

namespace GymCoach.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;

    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }

    /// <summary>
    /// Authenticate with Google ID token
    /// </summary>
    [HttpPost("google")]
    public async Task<ActionResult<AuthResponse>> GoogleAuth([FromBody] GoogleAuthRequest request)
    {
        var result = await _authService.AuthenticateWithGoogle(request.IdToken);

        if (!result.Success)
            return Unauthorized(new { error = result.Error });

        return new AuthResponse
        {
            Token = result.Token!,
            User = result.User!
        };
    }

    /// <summary>
    /// Authenticate with Apple ID token
    /// </summary>
    [HttpPost("apple")]
    public async Task<ActionResult<AuthResponse>> AppleAuth([FromBody] AppleAuthRequest request)
    {
        var result = await _authService.AuthenticateWithApple(request.IdToken, request.FullName);

        if (!result.Success)
            return Unauthorized(new { error = result.Error });

        return new AuthResponse
        {
            Token = result.Token!,
            User = result.User!
        };
    }

    /// <summary>
    /// Verify token is still valid
    /// </summary>
    [HttpGet("verify")]
    [Authorize]
    public ActionResult VerifyToken()
    {
        return Ok(new { valid = true });
    }
}

public class GoogleAuthRequest
{
    public required string IdToken { get; set; }
}

public class AppleAuthRequest
{
    public required string IdToken { get; set; }
    public string? FullName { get; set; }
}

public class AuthResponse
{
    public required string Token { get; set; }
    public required UserDto User { get; set; }
}
