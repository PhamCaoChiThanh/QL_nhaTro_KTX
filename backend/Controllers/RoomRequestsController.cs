using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QL_nhaTro_KTX.Backend.Data;
using QL_nhaTro_KTX.Backend.Models;

namespace QL_nhaTro_KTX.Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class RoomRequestsController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly QL_nhaTro_KTX.Backend.Services.ITelegramBotService _telegramService;

        public RoomRequestsController(
            AppDbContext context, 
            QL_nhaTro_KTX.Backend.Services.ITelegramBotService telegramService) 
        { 
            _context = context; 
            _telegramService = telegramService;
        }

        // Tenant gửi yêu cầu thuê phòng
        [HttpPost]
        public async Task<IActionResult> CreateRequest([FromBody] CreateRoomRequestDto dto)
        {
            var tenantIdStr = User.Claims.FirstOrDefault(c => c.Type == "TenantId")?.Value;
            if (string.IsNullOrEmpty(tenantIdStr) || !int.TryParse(tenantIdStr, out int tenantId))
                return Unauthorized(new { message = "Bạn không phải là người thuê." });

            var room = await _context.Rooms.FindAsync(dto.RoomId);
            if (room == null || room.Status != RoomStatus.Available)
                return BadRequest(new { message = "Phòng này không còn trống." });

            var tenant = await _context.Tenants.FindAsync(tenantId);

            var existingPending = await _context.RoomRequests
                .AnyAsync(r => r.TenantId == tenantId && r.Status == RoomRequestStatus.Pending);
            if (existingPending)
                return BadRequest(new { message = "Bạn đang có một yêu cầu đang chờ xử lý." });

            var request = new RoomRequest
            {
                TenantId = tenantId,
                RoomId = dto.RoomId,
                Note = dto.Note,
                MoveInDate = dto.MoveInDate
            };
            _context.RoomRequests.Add(request);
            await _context.SaveChangesAsync();

            // Gửi thông báo Telegram cho Admin
            string moveInStr = request.MoveInDate.HasValue ? request.MoveInDate.Value.ToString("dd/MM/yyyy") : "N/A";
            string notifyMsg = $"🔑 *YÊU CẦU THUÊ PHÒNG MỚI*\n\n" +
                               $"👤 Khách trọ: *{tenant?.FullName}*\n" +
                               $"🏠 Phòng đăng ký: *{room?.RoomNumber}*\n" +
                               $"📅 Ngày dự kiến vào ở: _{moveInStr}_\n" +
                               $"📝 Ghi chú: _{dto.Note}_";
            await _telegramService.SendAdminNotificationAsync(notifyMsg);

            return Ok(new { message = "Đã gửi yêu cầu thành công!", id = request.Id });
        }

        // Tenant xem yêu cầu của chính mình
        [HttpGet("my")]
        public async Task<IActionResult> GetMyRequests()
        {
            var tenantIdStr = User.Claims.FirstOrDefault(c => c.Type == "TenantId")?.Value;
            if (string.IsNullOrEmpty(tenantIdStr) || !int.TryParse(tenantIdStr, out int tenantId))
                return Unauthorized();

            var requests = await _context.RoomRequests
                .Include(r => r.Room)
                .Where(r => r.TenantId == tenantId)
                .OrderByDescending(r => r.CreatedAt)
                .Select(r => new {
                    r.Id, r.Status, r.Note, r.AdminNote, r.CreatedAt, r.MoveInDate,
                    Room = new { r.Room.RoomNumber, r.Room.BasePrice }
                })
                .ToListAsync();
            return Ok(requests);
        }

        // Admin lấy tất cả yêu cầu
        [HttpGet]
        [Authorize(Roles = "Admin,Staff")]
        public async Task<IActionResult> GetAllRequests()
        {
            var requests = await _context.RoomRequests
                .Include(r => r.Tenant)
                .Include(r => r.Room)
                .OrderByDescending(r => r.CreatedAt)
                .Select(r => new {
                    r.Id, r.Status, r.Note, r.AdminNote, r.CreatedAt, r.MoveInDate,
                    Tenant = new { r.Tenant.FullName, r.Tenant.Phone },
                    Room = new { r.Room.RoomNumber, r.Room.BasePrice }
                })
                .ToListAsync();
            return Ok(requests);
        }

        // Admin xét duyệt → tự động KHOÁ PHÒNG (chuyển trạng thái sang Rented) + Tạo Hợp đồng & Cọc
        [HttpPut("{id}/approve")]
        [Authorize(Roles = "Admin,Staff")]
        public async Task<IActionResult> Approve(int id, [FromBody] ApproveRequestDto dto)
        {
            var request = await _context.RoomRequests
                .Include(r => r.Room)
                .FirstOrDefaultAsync(r => r.Id == id);
            if (request == null) return NotFound();

            request.Status = RoomRequestStatus.Approved;
            request.AdminNote = dto.AdminNote;
            request.UpdatedAt = DateTime.UtcNow;

            // 🔒 TỰ ĐỘNG KHOÁ PHÒNG khi duyệt yêu cầu
            if (request.Room != null)
            {
                request.Room.Status = RoomStatus.Rented;
                request.Room.UpdatedAt = DateTime.UtcNow;
            }

            // 📄 TỰ ĐỘNG TẠO HỢP ĐỒNG & CỌC
            var startDate = request.MoveInDate ?? DateTime.UtcNow;
            var contract = new Contract
            {
                TenantId = request.TenantId,
                RoomId = request.RoomId,
                StartDate = startDate,
                EndDate = startDate.AddYears(1), // Mặc định 1 năm
                Status = ContractStatus.Active
            };
            _context.Contracts.Add(contract);
            await _context.SaveChangesAsync(); // Lưu để lấy contract.Id

            var deposit = new Deposit
            {
                ContractId = contract.Id,
                TotalAmount = request.Room?.BasePrice ?? 0, // Mặc định cọc bằng 1 tháng tiền phòng
                CurrentBalance = request.Room?.BasePrice ?? 0,
                Status = DepositStatus.Active
            };
            _context.Deposits.Add(deposit);

            await _context.SaveChangesAsync();
            return Ok(new { message = $"Đã chấp thuận yêu cầu, khoá phòng {request.Room?.RoomNumber} và tạo hợp đồng tự động." });
        }

        // Admin từ chối yêu cầu
        [HttpPut("{id}/reject")]
        [Authorize(Roles = "Admin,Staff")]
        public async Task<IActionResult> Reject(int id, [FromBody] ApproveRequestDto dto)
        {
            var request = await _context.RoomRequests.FindAsync(id);
            if (request == null) return NotFound();

            request.Status = RoomRequestStatus.Rejected;
            request.AdminNote = dto.AdminNote;
            request.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return Ok(new { message = "Đã từ chối yêu cầu." });
        }

        // Tenant xoá yêu cầu
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteRequest(int id)
        {
            var tenantIdStr = User.Claims.FirstOrDefault(c => c.Type == "TenantId")?.Value;
            if (string.IsNullOrEmpty(tenantIdStr) || !int.TryParse(tenantIdStr, out int tenantId))
                return Unauthorized();

            var request = await _context.RoomRequests.FindAsync(id);
            if (request == null) return NotFound();

            if (request.TenantId != tenantId) return Forbid();

            _context.RoomRequests.Remove(request);
            await _context.SaveChangesAsync();
            return NoContent();
        }

        // Tenant sửa yêu cầu (chỉ khi Status == Pending)
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateRequest(int id, [FromBody] CreateRoomRequestDto dto)
        {
            var tenantIdStr = User.Claims.FirstOrDefault(c => c.Type == "TenantId")?.Value;
            if (string.IsNullOrEmpty(tenantIdStr) || !int.TryParse(tenantIdStr, out int tenantId))
                return Unauthorized();

            var request = await _context.RoomRequests.FindAsync(id);
            if (request == null) return NotFound();

            if (request.TenantId != tenantId) return Forbid();

            if (request.Status != RoomRequestStatus.Pending)
                return BadRequest(new { message = "Không thể chỉnh sửa yêu cầu đã được xử lý." });

            request.Note = dto.Note;
            request.MoveInDate = dto.MoveInDate;
            request.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return NoContent();
        }
    }

    public class CreateRoomRequestDto
    {
        public int RoomId { get; set; }
        public string? Note { get; set; }
        public DateTime? MoveInDate { get; set; }
    }

    public class ApproveRequestDto
    {
        public string? AdminNote { get; set; }
    }
}
