using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QL_nhaTro_KTX.Backend.Data;
using QL_nhaTro_KTX.Backend.Models;
using Microsoft.AspNetCore.SignalR;

namespace QL_nhaTro_KTX.Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class MaintenancesController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly Microsoft.AspNetCore.SignalR.IHubContext<Hubs.NotificationHub> _hubContext;

        public MaintenancesController(AppDbContext context, Microsoft.AspNetCore.SignalR.IHubContext<Hubs.NotificationHub> hubContext)
        {
            _context = context;
            _hubContext = hubContext;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Maintenance>>> GetMaintenances()
        {
            var userRole = User.Claims.FirstOrDefault(c => c.Type == System.Security.Claims.ClaimTypes.Role)?.Value;
            var userTenantIdStr = User.Claims.FirstOrDefault(c => c.Type == "TenantId")?.Value;

            if (userRole == "TenantUser")
            {
                // Người thuê chỉ xem được yêu cầu bảo trì của chính phòng mình
                if (int.TryParse(userTenantIdStr, out int tenantId))
                {
                    return await _context.Maintenances.Where(m => m.ReportedById == tenantId).ToListAsync();
                }
                return Forbid();
            }

            // Admin, Staff và Technician xem toàn bộ danh sách
            return await _context.Maintenances.ToListAsync();
        }

        [HttpPost]
        public async Task<ActionResult<Maintenance>> PostMaintenance(Maintenance maintenance)
        {
            var userRole = User.Claims.FirstOrDefault(c => c.Type == System.Security.Claims.ClaimTypes.Role)?.Value;
            var userTenantIdStr = User.Claims.FirstOrDefault(c => c.Type == "TenantId")?.Value;

            if (userRole == "TenantUser")
            {
                // Gán ép buộc người gửi yêu cầu (ReportedById) là người đang đăng nhập
                // Ngăn chặn việc truyền ID của người khác vào.
                if (int.TryParse(userTenantIdStr, out int tenantId))
                {
                    maintenance.ReportedById = tenantId;
                }
            }

            _context.Maintenances.Add(maintenance);
            await _context.SaveChangesAsync();

            // Phát tín hiệu real-time tới Group Admin và Staff
            await _hubContext.Clients.Groups(new[] { "Admin", "Staff" }).SendAsync("ReceiveNotification", new
            {
                Title = "Yêu cầu bảo trì mới",
                Message = $"Phòng {maintenance.RoomId} báo sự cố: {maintenance.Description}",
                CreatedAt = DateTime.UtcNow
            });

            // Trả về kết quả sau khi tạo
            return StatusCode(201, maintenance);
        }

        [HttpPut("{id}/status")]
        [Authorize(Roles = "Admin,Staff")] // Chỉ Staff/Admin mới được quyền đổi trạng thái xử lý
        public async Task<IActionResult> UpdateStatus(int id, [FromBody] MaintenanceStatus newStatus)
        {
            var maintenance = await _context.Maintenances.FindAsync(id);
            if (maintenance == null) return NotFound();

            maintenance.Status = newStatus;
            maintenance.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            // Lấy UserId của Tenant liên quan để gửi thông báo cá nhân
            var tenantUser = await _context.Users.FirstOrDefaultAsync(u => u.TenantId == maintenance.ReportedById);
            if (tenantUser != null)
            {
                await _hubContext.Clients.Group($"User_{tenantUser.Id}").SendAsync("ReceiveNotification", new
                {
                    Title = "Cập nhật yêu cầu bảo trì",
                    Message = $"Yêu cầu của bạn đã chuyển sang trạng thái: {newStatus}",
                    CreatedAt = DateTime.UtcNow
                });
            }

            return NoContent();
        }
    }
}
