using System.ComponentModel.DataAnnotations;

namespace QL_nhaTro_KTX.Backend.DTOs
{
    public class LoginDto
    {
        [Required] public string Username { get; set; }
        [Required] public string Password { get; set; }
    }

    public class RegisterDto
    {
        [Required] public string Username { get; set; }
        [Required] public string Password { get; set; }
        public int Role { get; set; } // 0: Admin, 1: Staff, 2: TenantUser
        
        // Thông tin hồ sơ (chỉ bắt buộc khi tự đăng ký tài khoản Khách thuê)
        public string? FullName { get; set; }
        public string? Cccd { get; set; }
        public string? Phone { get; set; }
        public string? Email { get; set; }
        
        public int? TenantId { get; set; } // Dùng nếu tài khoản này được Admin gán cho Người thuê đã có sẵn
    }

    /// <summary>Response sau khi login/refresh thành công.</summary>
    public class AuthResponseDto
    {
        public string AccessToken { get; set; }
        public string RefreshToken { get; set; }
        public DateTime AccessTokenExpires { get; set; }
        public DateTime RefreshTokenExpires { get; set; }
        public string Username { get; set; }
        public string Role { get; set; }
        public int? TenantId { get; set; }
    }

    /// <summary>Dùng cho endpoint POST /auth/refresh.</summary>
    public class RefreshTokenDto
    {
        [Required] public string RefreshToken { get; set; }
    }

    /// <summary>Dùng cho endpoint POST /auth/revoke (logout).</summary>
    public class RevokeTokenDto
    {
        [Required] public string RefreshToken { get; set; }
        /// <summary>Nếu true, revoke toàn bộ thiết bị (logout all).</summary>
        public bool RevokeAll { get; set; } = false;
    }

    public class ChangePasswordDto
    {
        [Required] public string OldPassword { get; set; } = "";
        [Required] public string NewPassword { get; set; } = "";
    }
}
