using Microsoft.AspNetCore.SignalR;
using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using System.Linq;

namespace QL_nhaTro_KTX.Backend.Hubs
{
    [Authorize]
    public class ChatHub : Hub
    {
        // Nhận tin nhắn từ cả Tenant & Admin và phát tới TẤT CẢ mọi người
        public async Task SendMessageToAdmin(string message)
        {
            var username = Context.User?.Identity?.Name ?? "Ẩn danh";
            var userId = Context.UserIdentifier;
            var role = Context.User?.Claims.FirstOrDefault(c => c.Type == System.Security.Claims.ClaimTypes.Role)?.Value;

            // Kiểm tra xem có phải Tenant không
            bool isFromTenant = role == "TenantUser";

            // Phát tin nhắn đến TOÀN BỘ các Client đang kết nối
            await Clients.All.SendAsync("ReceiveMessage", new
            {
                SenderId = userId,
                SenderName = username,
                Message = message,
                Timestamp = DateTime.UtcNow,
                IsFromTenant = isFromTenant
            });
        }

        public async Task ReplyToTenant(string tenantUserId, string message)
        {
            // Dự phòng cho method cũ, vẫn phát tới tất cả
            await SendMessageToAdmin(message);
        }
    }
}
