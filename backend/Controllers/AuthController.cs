using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using QL_nhaTro_KTX.Backend.Data;
using QL_nhaTro_KTX.Backend.DTOs;
using QL_nhaTro_KTX.Backend.Models;
using QL_nhaTro_KTX.Backend.Services;

namespace QL_nhaTro_KTX.Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IConfiguration _config;
        private readonly ITokenService _tokenService;
        private readonly ILogger<AuthController> _logger;

        public AuthController(
            AppDbContext context,
            IConfiguration config,
            ITokenService tokenService,
            ILogger<AuthController> logger)
        {
            _context = context;
            _config = config;
            _tokenService = tokenService;
            _logger = logger;
        }

        // ── POST /api/auth/register ──────────────────────────────────────
        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterDto dto)
        {
            if (await _context.Users.AnyAsync(u => u.Username == dto.Username))
                return BadRequest(new { message = "Username đã tồn tại." });

            if (dto.Username.ToLower().Trim() == "admin")
                return BadRequest(new { message = "Không được đặt tên đăng nhập là 'admin'." });

            var passwordRegex = new System.Text.RegularExpressions.Regex(@"^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?"":{}|<>]).{8,}$");
            if (string.IsNullOrEmpty(dto.Password) || !passwordRegex.IsMatch(dto.Password))
                return BadRequest(new { message = "Mật khẩu phải đủ 8 ký tự, có chữ hoa, có số và ký tự đặc biệt." });

            // Kiểm tra tính hợp lệ dữ liệu
            if (dto.Role == 2) // TenantUser
            {
                if (string.IsNullOrEmpty(dto.Cccd) || dto.Cccd.Length != 12 || !dto.Cccd.All(char.IsDigit))
                    return BadRequest(new { message = "Số CCCD phải bao gồm đúng 12 chữ số." });

                if (string.IsNullOrEmpty(dto.Phone) || dto.Phone.Length != 10 || !dto.Phone.All(char.IsDigit))
                    return BadRequest(new { message = "Số điện thoại phải bao gồm đúng 10 chữ số." });

                if (string.IsNullOrEmpty(dto.Email) || !System.Text.RegularExpressions.Regex.IsMatch(dto.Email, @"^[^@\s]+@[^@\s]+\.[^@\s]+$"))
                    return BadRequest(new { message = "Email không đúng định dạng." });
            }

            int? finalTenantId = dto.TenantId;

            // Nếu tự đăng ký là Tenant và có CCCD → tự động tạo hoặc liên kết hồ sơ
            if (dto.Role == 2 && !string.IsNullOrEmpty(dto.Cccd))
            {
                var existingTenant = await _context.Tenants.FirstOrDefaultAsync(t => t.Cccd == dto.Cccd);
                if (existingTenant != null)
                {
                    // Nếu đã có hồ sơ (do Admin tạo trước), thì liên kết luôn
                    finalTenantId = existingTenant.Id;
                }
                else
                {
                    // Nếu chưa có, tạo mới hoàn toàn
                    var newTenant = new Tenant
                    {
                        FullName = dto.FullName ?? "Người dùng mới",
                        Cccd     = dto.Cccd,
                        Phone    = dto.Phone ?? "",
                        Email    = dto.Email ?? ""
                    };
                    _context.Tenants.Add(newTenant);
                    await _context.SaveChangesAsync();
                    finalTenantId = newTenant.Id;
                }
            }

            var user = new AppUser
            {
                Username     = dto.Username,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
                Role         = (Role)dto.Role,
                TenantId     = finalTenantId
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            _logger.LogInformation("User mới đã đăng ký: {Username} (Role={Role})", dto.Username, (Role)dto.Role);
            return Ok(new { message = "Đăng ký thành công." });
        }

        // ── POST /api/auth/login ─────────────────────────────────────────
        /// <summary>
        /// Đăng nhập. Trả về Access Token (ngắn hạn) + Refresh Token (30 ngày).
        /// </summary>
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginDto dto)
        {
            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Username == dto.Username);

            if (user == null || !BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
            {
                _logger.LogWarning("Đăng nhập thất bại: username={Username} IP={Ip}",
                    dto.Username, GetClientIp());
                // Trả cùng 1 message để tránh Username Enumeration Attack
                return Unauthorized(new { message = "Tên đăng nhập hoặc mật khẩu không đúng." });
            }

            var jwt                 = _config.GetSection("Jwt");
            var expireMinutes       = int.TryParse(jwt["AccessTokenExpireMinutes"], out var m) ? m : 60;
            var refreshExpireDays   = int.TryParse(jwt["RefreshTokenExpireDays"], out var d) ? d : 30;

            var accessToken     = _tokenService.GenerateAccessToken(user);
            var refreshToken    = await _tokenService.GenerateRefreshTokenAsync(user.Id, GetClientIp());

            _logger.LogInformation("Đăng nhập thành công: {Username} (Role={Role}) IP={Ip}",
                user.Username, user.Role, GetClientIp());

            return Ok(new AuthResponseDto
            {
                AccessToken         = accessToken,
                RefreshToken        = refreshToken.Token,   // Raw token gửi về client
                AccessTokenExpires  = DateTime.UtcNow.AddMinutes(expireMinutes),
                RefreshTokenExpires = refreshToken.ExpiresAt,
                Username            = user.Username,
                Role                = user.Role.ToString(),
                TenantId            = user.TenantId
            });
        }

        // ── POST /api/auth/refresh ───────────────────────────────────────
        /// <summary>
        /// Dùng Refresh Token để lấy Access Token mới mà không cần đăng nhập lại.
        /// Áp dụng Refresh Token Rotation: token cũ bị vô hiệu hóa, token mới được tạo.
        /// </summary>
        [HttpPost("refresh")]
        public async Task<IActionResult> Refresh([FromBody] RefreshTokenDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.RefreshToken))
                return BadRequest(new { message = "Refresh token không hợp lệ." });

            try
            {
                var (newAccessToken, newRefreshToken) = await _tokenService
                    .RotateRefreshTokenAsync(dto.RefreshToken, GetClientIp());

                var jwt           = _config.GetSection("Jwt");
                var expireMinutes = int.TryParse(jwt["AccessTokenExpireMinutes"], out var m) ? m : 60;

                return Ok(new AuthResponseDto
                {
                    AccessToken         = newAccessToken,
                    RefreshToken        = newRefreshToken.Token,
                    AccessTokenExpires  = DateTime.UtcNow.AddMinutes(expireMinutes),
                    RefreshTokenExpires = newRefreshToken.ExpiresAt,
                    Username            = newRefreshToken.User?.Username ?? "",
                    Role                = newRefreshToken.User?.Role.ToString() ?? "",
                    TenantId            = newRefreshToken.User?.TenantId
                });
            }
            catch (SecurityTokenException ex)
            {
                _logger.LogWarning("Refresh token thất bại: {Reason} IP={Ip}", ex.Message, GetClientIp());
                return Unauthorized(new { message = ex.Message });
            }
        }

        // ── POST /api/auth/revoke ────────────────────────────────────────
        /// <summary>
        /// Đăng xuất: vô hiệu hóa Refresh Token.
        /// RevokeAll=true → đăng xuất khỏi tất cả thiết bị.
        /// </summary>
        [HttpPost("revoke")]
        [Authorize] // Phải đang đăng nhập mới được logout
        public async Task<IActionResult> Revoke([FromBody] RevokeTokenDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.RefreshToken))
                return BadRequest(new { message = "Refresh token không hợp lệ." });

            var ip = GetClientIp();

            if (dto.RevokeAll)
            {
                // Lấy userId từ JWT claim
                var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                if (int.TryParse(userIdClaim, out var userId))
                {
                    await _tokenService.RevokeAllUserTokensAsync(userId, ip);
                    _logger.LogInformation("Đã logout tất cả thiết bị. UserId={UserId}", userId);
                    return Ok(new { message = "Đã đăng xuất khỏi tất cả thiết bị." });
                }
            }

            await _tokenService.RevokeRefreshTokenAsync(dto.RefreshToken, ip);
            return Ok(new { message = "Đã đăng xuất thành công." });
        }

        // ── POST /api/auth/change-password ───────────────────────────────
        /// <summary>
        /// Đổi mật khẩu của người dùng đang đăng nhập.
        /// </summary>
        [HttpPost("change-password")]
        [Authorize]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordDto dto)
        {
            var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out int userId))
                return Unauthorized();

            var user = await _context.Users.FindAsync(userId);
            if (user == null) return NotFound("Người dùng không tồn tại.");

            if (!BCrypt.Net.BCrypt.Verify(dto.OldPassword, user.PasswordHash))
            {
                return BadRequest(new { message = "Mật khẩu cũ không chính xác." });
            }

            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Người dùng {Username} đã đổi mật khẩu thành công.", user.Username);
            return Ok(new { message = "Đổi mật khẩu thành công." });
        }

        // ── GET /api/auth/me ─────────────────────────────────────────────
        /// <summary>
        /// Lấy thông tin user đang đăng nhập từ JWT claim (không query DB).
        /// Frontend dùng để hiển thị tên/role mà không cần gọi thêm API.
        /// </summary>
        [HttpGet("me")]
        [Authorize]
        public IActionResult Me()
        {
            return Ok(new
            {
                Id       = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value,
                Username = User.Identity?.Name,
                Role     = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value,
                TenantId = User.FindFirst("TenantId")?.Value
            });
        }

        // ── Helper ───────────────────────────────────────────────────────
        private string? GetClientIp() =>
            HttpContext.Connection.RemoteIpAddress?.ToString();
    }
}
