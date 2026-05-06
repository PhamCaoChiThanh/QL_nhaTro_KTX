using Microsoft.AspNetCore.SignalR;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using System;

namespace QL_nhaTro_KTX.Backend.Hubs
{
    [Authorize]
    public class NotificationHub : Hub
    {
        // Khi client kết nối, tự động đưa họ vào Group dựa trên Role và ID
        public override async Task OnConnectedAsync()
        {
            var userId = Context.UserIdentifier;
            var role = Context.User?.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;

            if (!string.IsNullOrEmpty(role))
            {
                // Thêm vào nhóm Role (ví dụ: Group "Admin")
                await Groups.AddToGroupAsync(Context.ConnectionId, role);
            }

            if (!string.IsNullOrEmpty(userId))
            {
                // Thêm vào nhóm User riêng biệt để gửi cá nhân
                await Groups.AddToGroupAsync(Context.ConnectionId, $"User_{userId}");
            }

            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            var userId = Context.UserIdentifier;
            var role = Context.User?.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;

            if (!string.IsNullOrEmpty(role))
            {
                await Groups.RemoveFromGroupAsync(Context.ConnectionId, role);
            }

            if (!string.IsNullOrEmpty(userId))
            {
                await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"User_{userId}");
            }

            await base.OnDisconnectedAsync(exception);
        }

        // Admin có thể broadcast thông báo đến toàn thể thành viên
        public async Task BroadcastNotification(string title, string message)
        {
            await Clients.All.SendAsync("ReceiveNotification", new
            {
                Title = title,
                Message = message,
                CreatedAt = DateTime.UtcNow
            });
        }
    }
}
