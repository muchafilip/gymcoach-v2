using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using GymCoach.Api.Data;
using GymCoach.Api.Models;

namespace GymCoach.Api.Services;

public interface IAuthService
{
    Task<AuthResult> AuthenticateWithGoogle(string idToken);
    Task<AuthResult> AuthenticateWithApple(string idToken, string? name);
    string GenerateJwtToken(User user);
}

public class AuthResult
{
    public bool Success { get; set; }
    public string? Token { get; set; }
    public UserDto? User { get; set; }
    public string? Error { get; set; }
}

public class UserDto
{
    public int Id { get; set; }
    public string Email { get; set; } = "";
    public string? DisplayName { get; set; }
    public string? ProfilePictureUrl { get; set; }
    public string SubscriptionStatus { get; set; } = "free";
    public bool IsNewUser { get; set; }
}

public class AuthService : IAuthService
{
    private readonly GymCoachDbContext _context;
    private readonly IConfiguration _config;
    private readonly HttpClient _httpClient;

    public AuthService(
        GymCoachDbContext context,
        IConfiguration config,
        IHttpClientFactory httpClientFactory)
    {
        _context = context;
        _config = config;
        _httpClient = httpClientFactory.CreateClient();
    }

    public async Task<AuthResult> AuthenticateWithGoogle(string idToken)
    {
        try
        {
            var payload = await ValidateGoogleToken(idToken);
            if (payload == null)
                return new AuthResult { Success = false, Error = "Invalid Google token" };

            var (user, isNewUser) = await FindOrCreateUser(
                email: payload.Email,
                googleId: payload.GoogleId,
                displayName: payload.Name,
                profilePicture: payload.Picture
            );

            var token = GenerateJwtToken(user);

            return new AuthResult
            {
                Success = true,
                Token = token,
                User = MapToDto(user, isNewUser)
            };
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[Auth] Google auth error: {ex.Message}");
            Console.WriteLine($"[Auth] Stack trace: {ex.StackTrace}");
            return new AuthResult { Success = false, Error = $"Authentication failed: {ex.Message}" };
        }
    }

    public async Task<AuthResult> AuthenticateWithApple(string idToken, string? name)
    {
        try
        {
            var payload = await ValidateAppleToken(idToken);
            if (payload == null)
                return new AuthResult { Success = false, Error = "Invalid Apple token" };

            var (user, isNewUser) = await FindOrCreateUser(
                email: payload.Email,
                appleId: payload.AppleId,
                displayName: name
            );

            var token = GenerateJwtToken(user);

            return new AuthResult
            {
                Success = true,
                Token = token,
                User = MapToDto(user, isNewUser)
            };
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[Auth] Apple auth error: {ex.Message}");
            return new AuthResult { Success = false, Error = "Authentication failed" };
        }
    }

    private async Task<GoogleTokenPayload?> ValidateGoogleToken(string idToken)
    {
        var response = await _httpClient.GetAsync(
            $"https://oauth2.googleapis.com/tokeninfo?id_token={idToken}");

        if (!response.IsSuccessStatusCode)
        {
            Console.WriteLine($"[Auth] Google token validation failed: {response.StatusCode}");
            return null;
        }

        var json = await response.Content.ReadAsStringAsync();
        var payload = JsonSerializer.Deserialize<GoogleTokenInfo>(json, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });

        if (payload == null) return null;

        // Verify audience matches our client IDs
        var validClientIds = new[]
        {
            _config["Google:iOSClientId"],
            _config["Google:AndroidClientId"],
            _config["Google:WebClientId"]
        }.Where(id => !string.IsNullOrEmpty(id)).ToArray();

        if (validClientIds.Length > 0 && !validClientIds.Contains(payload.Aud))
        {
            Console.WriteLine($"[Auth] Google token audience mismatch: {payload.Aud}");
            return null;
        }

        return new GoogleTokenPayload
        {
            GoogleId = payload.Sub,
            Email = payload.Email,
            Name = payload.Name,
            Picture = payload.Picture
        };
    }

    private Task<AppleTokenPayload?> ValidateAppleToken(string idToken)
    {
        try
        {
            var handler = new JwtSecurityTokenHandler();
            var jwtToken = handler.ReadJwtToken(idToken);

            // Verify issuer
            if (jwtToken.Issuer != "https://appleid.apple.com")
            {
                Console.WriteLine("[Auth] Apple token issuer mismatch");
                return Task.FromResult<AppleTokenPayload?>(null);
            }

            // Verify expiration
            if (jwtToken.ValidTo < DateTime.UtcNow)
            {
                Console.WriteLine("[Auth] Apple token expired");
                return Task.FromResult<AppleTokenPayload?>(null);
            }

            var email = jwtToken.Claims.FirstOrDefault(c => c.Type == "email")?.Value;
            var sub = jwtToken.Claims.FirstOrDefault(c => c.Type == "sub")?.Value;

            if (string.IsNullOrEmpty(email) || string.IsNullOrEmpty(sub))
            {
                Console.WriteLine("[Auth] Apple token missing email or sub");
                return Task.FromResult<AppleTokenPayload?>(null);
            }

            return Task.FromResult<AppleTokenPayload?>(new AppleTokenPayload
            {
                AppleId = sub,
                Email = email
            });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[Auth] Apple token parsing error: {ex.Message}");
            return Task.FromResult<AppleTokenPayload?>(null);
        }
    }

    private async Task<(User user, bool isNewUser)> FindOrCreateUser(
        string email,
        string? googleId = null,
        string? appleId = null,
        string? displayName = null,
        string? profilePicture = null)
    {
        User? user = null;

        // Find by provider ID first
        if (!string.IsNullOrEmpty(googleId))
            user = await _context.Users.FirstOrDefaultAsync(u => u.GoogleId == googleId);

        if (user == null && !string.IsNullOrEmpty(appleId))
            user = await _context.Users.FirstOrDefaultAsync(u => u.AppleId == appleId);

        // Then try by email
        user ??= await _context.Users.FirstOrDefaultAsync(u => u.Email == email);

        bool isNewUser = false;

        if (user == null)
        {
            user = new User
            {
                Email = email,
                GoogleId = googleId,
                AppleId = appleId,
                DisplayName = displayName,
                ProfilePictureUrl = profilePicture,
                CreatedAt = DateTime.UtcNow,
                LastLoginAt = DateTime.UtcNow
            };
            _context.Users.Add(user);
            isNewUser = true;
            Console.WriteLine($"[Auth] Created new user: {email}");
        }
        else
        {
            // Link additional provider if needed
            if (!string.IsNullOrEmpty(googleId) && user.GoogleId == null)
                user.GoogleId = googleId;
            if (!string.IsNullOrEmpty(appleId) && user.AppleId == null)
                user.AppleId = appleId;

            // Update profile info
            if (!string.IsNullOrEmpty(displayName) && user.DisplayName == null)
                user.DisplayName = displayName;
            if (!string.IsNullOrEmpty(profilePicture))
                user.ProfilePictureUrl = profilePicture;

            user.LastLoginAt = DateTime.UtcNow;
            Console.WriteLine($"[Auth] Existing user login: {email}");
        }

        await _context.SaveChangesAsync();
        return (user, isNewUser);
    }

    public string GenerateJwtToken(User user)
    {
        var jwtSettings = _config.GetSection("Jwt");
        var key = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(jwtSettings["Secret"]!));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, user.Email),
            new Claim("userId", user.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        var expirationDays = int.Parse(jwtSettings["ExpirationDays"] ?? "30");
        var token = new JwtSecurityToken(
            issuer: jwtSettings["Issuer"],
            audience: jwtSettings["Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddDays(expirationDays),
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private static UserDto MapToDto(User user, bool isNewUser) => new()
    {
        Id = user.Id,
        Email = user.Email,
        DisplayName = user.DisplayName,
        ProfilePictureUrl = user.ProfilePictureUrl,
        SubscriptionStatus = user.SubscriptionStatus.ToString().ToLower(),
        IsNewUser = isNewUser
    };
}

// Helper classes
internal class GoogleTokenInfo
{
    public string Sub { get; set; } = "";
    public string Email { get; set; } = "";
    public string? Name { get; set; }
    public string? Picture { get; set; }
    public string Aud { get; set; } = "";
}

internal class GoogleTokenPayload
{
    public string GoogleId { get; set; } = "";
    public string Email { get; set; } = "";
    public string? Name { get; set; }
    public string? Picture { get; set; }
}

internal class AppleTokenPayload
{
    public string AppleId { get; set; } = "";
    public string Email { get; set; } = "";
}
