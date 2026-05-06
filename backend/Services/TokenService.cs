using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using QL_nhaTro_KTX.Backend.Data;
using QL_nhaTro_KTX.Backend.Models;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;

namespace QL_nhaTro_KTX.Backend.Services
{
    public interface ITokenService
    {
        string GenerateAccessToken(AppUser user);
        Task<RefreshToken> GenerateRefreshTokenAsync(int userId, string? ipAddress);
        Task<(string AccessToken, RefreshToken NewRefreshToken)> RotateRefreshTokenAsync(
            string oldToken, string? ipAddress);
        Task RevokeRefreshTokenAsync(string token, string? ipAddress);
        Task RevokeAllUserTokensAsync(int userId, string? ipAddress);
        Task PurgeExpiredTokensAsync();
    }

    public class TokenService : ITokenService
    {
        private readonly IConfiguration _config;
        private readonly AppDbContext _context;
        private readonly ILogger<TokenService> _logger;

        public TokenService(IConfiguration config, AppDbContext context, ILogger<TokenService> logger)
        {
            _config = config;
            _context = context;
            _logger = logger;
        }

        // ─── ACCESS TOKEN (JWT, ngắn hạn) ──────────────────────────────
        public string GenerateAccessToken(AppUser user)
        {
            var jwt = _config.GetSection("Jwt");
            var key = new SymmetricSecurityKey(Encoding.ASCII.GetBytes(jwt["Key"]!));
            var expireMinutes = int.TryParse(jwt["AccessTokenExpireMinutes"], out var m) ? m : 60;

            var claims = new List<Claim>
            {
                new(JwtRegisteredClaimNames.Sub,  user.Id.ToString()),
                new(JwtRegisteredClaimNames.Jti,  Guid.NewGuid().ToString()),   // JWT ID duy nhất
                new(ClaimTypes.NameIdentifier,    user.Id.ToString()),
                new(ClaimTypes.Name,              user.Username),
                new(ClaimTypes.Role,              user.Role.ToString()),
            };

            if (user.TenantId.HasValue)
                claims.Add(new Claim("TenantId", user.TenantId.Value.ToString()));

            var descriptor = new SecurityTokenDescriptor
            {
                Subject            = new ClaimsIdentity(claims),
                Expires            = DateTime.UtcNow.AddMinutes(expireMinutes),
                Issuer             = jwt["Issuer"],
                Audience           = jwt["Audience"],
                SigningCredentials  = new SigningCredentials(key, SecurityAlgorithms.HmacSha256Signature)
            };

            var handler = new JwtSecurityTokenHandler();
            var token   = handler.CreateToken(descriptor);
            return handler.WriteToken(token);
        }

        // ─── REFRESH TOKEN (dài hạn, lưu vào DB) ──────────────────────
        public async Task<RefreshToken> GenerateRefreshTokenAsync(int userId, string? ipAddress)
        {
            var jwt         = _config.GetSection("Jwt");
            var expireDays  = int.TryParse(jwt["RefreshTokenExpireDays"], out var d) ? d : 30;

            // Tạo raw token ngẫu nhiên 256-bit (cryptographically secure)
            var rawToken    = Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));
            var tokenHash   = HashToken(rawToken);

            // Dọn token cũ đã hết hạn của user trước khi tạo mới (giữ DB sạch)
            var oldExpired = await _context.RefreshTokens
                .Where(t => t.UserId == userId && t.ExpiresAt < DateTime.UtcNow)
                .ToListAsync();
            if (oldExpired.Any())
                _context.RefreshTokens.RemoveRange(oldExpired);

            var refreshToken = new RefreshToken
            {
                UserId       = userId,
                Token        = rawToken,    // Gửi raw token về client
                TokenHash    = tokenHash,   // Lưu hash vào DB (không lưu raw)
                ExpiresAt    = DateTime.UtcNow.AddDays(expireDays),
                CreatedByIp  = ipAddress
            };

            _context.RefreshTokens.Add(refreshToken);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Đã tạo Refresh Token mới cho UserId={UserId} từ IP={Ip}", userId, ipAddress);
            return refreshToken;
        }

        // ─── REFRESH TOKEN ROTATION ─────────────────────────────────────
        // Mỗi lần dùng refresh token → tạo token mới, revoke token cũ
        // Nếu token đã bị dùng trước đó → phát hiện tấn công, revoke tất cả
        public async Task<(string AccessToken, RefreshToken NewRefreshToken)> RotateRefreshTokenAsync(
            string oldRawToken, string? ipAddress)
        {
            var tokenHash = HashToken(oldRawToken);
            var storedToken = await _context.RefreshTokens
                .Include(t => t.User)
                .FirstOrDefaultAsync(t => t.TokenHash == tokenHash);

            if (storedToken == null)
                throw new SecurityTokenException("Refresh token không tồn tại.");

            if (storedToken.IsRevoked)
            {
                // ⚠️ Token đã bị revoke → có thể bị tấn công Refresh Token Reuse
                // Revoke toàn bộ token của user để bảo vệ tài khoản
                _logger.LogWarning(
                    "CẢNH BÁO BẢO MẬT: Refresh Token đã bị revoke được dùng lại! UserId={UserId} IP={Ip}",
                    storedToken.UserId, ipAddress);
                await RevokeAllUserTokensAsync(storedToken.UserId, ipAddress);
                throw new SecurityTokenException("Phát hiện tấn công tái sử dụng token. Vui lòng đăng nhập lại.");
            }

            if (storedToken.IsUsed)
                throw new SecurityTokenException("Refresh token đã được sử dụng.");

            if (!storedToken.IsActive)
                throw new SecurityTokenException("Refresh token đã hết hạn.");

            // Đánh dấu token cũ đã dùng (rotation)
            storedToken.IsUsed     = true;
            storedToken.RevokedAt  = DateTime.UtcNow;
            storedToken.RevokedByIp = ipAddress;

            // Tạo cặp token mới
            var newAccessToken  = GenerateAccessToken(storedToken.User);
            var newRefreshToken = await GenerateRefreshTokenAsync(storedToken.UserId, ipAddress);

            // Ghi lại token thay thế để audit trail
            storedToken.ReplacedByToken = newRefreshToken.Token;
            await _context.SaveChangesAsync();

            _logger.LogInformation("Refresh Token rotation thành công. UserId={UserId}", storedToken.UserId);
            return (newAccessToken, newRefreshToken);
        }

        // ─── REVOKE (Logout) ────────────────────────────────────────────
        public async Task RevokeRefreshTokenAsync(string rawToken, string? ipAddress)
        {
            var tokenHash = HashToken(rawToken);
            var storedToken = await _context.RefreshTokens
                .FirstOrDefaultAsync(t => t.TokenHash == tokenHash);

            if (storedToken == null || !storedToken.IsActive)
                return; // Idempotent: không lỗi nếu token không tồn tại

            storedToken.IsRevoked    = true;
            storedToken.RevokedAt    = DateTime.UtcNow;
            storedToken.RevokedByIp  = ipAddress;
            await _context.SaveChangesAsync();

            _logger.LogInformation("Đã revoke Refresh Token. UserId={UserId} IP={Ip}", storedToken.UserId, ipAddress);
        }

        // ─── REVOKE ALL (Logout tất cả thiết bị) ───────────────────────
        public async Task RevokeAllUserTokensAsync(int userId, string? ipAddress)
        {
            var activeTokens = await _context.RefreshTokens
                .Where(t => t.UserId == userId && !t.IsRevoked && !t.IsUsed)
                .ToListAsync();

            foreach (var token in activeTokens)
            {
                token.IsRevoked   = true;
                token.RevokedAt   = DateTime.UtcNow;
                token.RevokedByIp = ipAddress;
            }
            await _context.SaveChangesAsync();
            _logger.LogInformation("Đã revoke {Count} token(s) của UserId={UserId}", activeTokens.Count, userId);
        }

        // ─── CLEANUP (Chạy bởi CronJob) ────────────────────────────────
        public async Task PurgeExpiredTokensAsync()
        {
            var cutoff = DateTime.UtcNow.AddDays(-7); // Giữ lại 7 ngày để audit
            var expired = await _context.RefreshTokens
                .Where(t => t.ExpiresAt < cutoff)
                .ToListAsync();

            if (expired.Any())
            {
                _context.RefreshTokens.RemoveRange(expired);
                await _context.SaveChangesAsync();
                _logger.LogInformation("Đã xóa {Count} refresh token hết hạn.", expired.Count);
            }
        }

        // ─── Helper: Hash token trước khi lưu vào DB ───────────────────
        private static string HashToken(string token)
        {
            var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(token));
            return Convert.ToBase64String(bytes);
        }
    }
}
