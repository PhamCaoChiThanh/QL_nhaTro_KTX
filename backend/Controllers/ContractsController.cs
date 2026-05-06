using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QL_nhaTro_KTX.Backend.Data;
using QL_nhaTro_KTX.Backend.Models;

namespace QL_nhaTro_KTX.Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ContractsController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly QL_nhaTro_KTX.Backend.Services.IEmailService _emailService;
        private readonly QL_nhaTro_KTX.Backend.Services.ITelegramBotService _telegramService;

        public ContractsController(
            AppDbContext context, 
            QL_nhaTro_KTX.Backend.Services.IEmailService emailService,
            QL_nhaTro_KTX.Backend.Services.ITelegramBotService telegramService) 
        { 
            _context = context; 
            _emailService = emailService;
            _telegramService = telegramService;
        }

        [HttpGet]
        public async Task<IActionResult> GetContracts()
        {
            var contracts = await _context.Contracts
                .Include(c => c.Tenant)
                .Include(c => c.Room)
                .Include(c => c.Deposit)
                .Select(c => new {
                    id = c.Id,
                    contractNumber = "HD" + c.Id.ToString("D3"),
                    tenant = c.Tenant.FullName,
                    tenantEmail = c.Tenant.Email,
                    room = c.Room.RoomNumber,
                    start = c.StartDate.ToString("yyyy-MM-dd"),
                    end = c.EndDate.ToString("yyyy-MM-dd"),
                    deposit = c.Deposit != null ? c.Deposit.CurrentBalance : 0,
                    status = c.Status.ToString(),
                    scannedContractUrl = c.ScannedContractUrl,
                    isCancelRequested = c.IsCancelRequested,
                    cancelReason = c.CancelReason,
                    violationReason = c.ViolationReason
                })
                .ToListAsync();
            return Ok(contracts);
        }

        [HttpPost("{id}/sign")]
        public async Task<IActionResult> SignContract(int id)
        {
            var contract = await _context.Contracts
                .Include(c => c.Tenant)
                .Include(c => c.Room)
                .FirstOrDefaultAsync(c => c.Id == id);

            if (contract == null) return NotFound("Hợp đồng không tồn tại.");

            // Tạo URL tải về nội bộ (thay vì storage bên thứ 3)
            string signedPdfUrl = $"/api/Contracts/{contract.Id}/download";
            contract.ScannedContractUrl = signedPdfUrl;
            contract.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            // Gửi Email thông báo cho khách hàng
            if (!string.IsNullOrEmpty(contract.Tenant.Email))
            {
                // Note: Trong Email cần URL tuyệt đối
                string absoluteUrl = $"{Request.Scheme}://{Request.Host}{signedPdfUrl}";
                string subject = $"[QL Nhà Trọ] Xác nhận ký thành công Hợp đồng HD{contract.Id:D3}";
                string body = $@"
<div style=""font-family: 'Segoe UI', Arial, sans-serif; background-color: #f3f4f6; padding: 40px 20px; color: #1f2937;"">
  <div style=""max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1);"">
    
    <!-- Header -->
    <div style=""background: linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%); padding: 40px 30px; text-align: center;"">
      <h1 style=""color: #ffffff; font-size: 24px; margin: 0; font-weight: 800; letter-spacing: -0.5px;"">Nhà Trọ Thông Minh - Ký Hợp Đồng Thành Công</h1>
    </div>

    <!-- Body -->
    <div style=""padding: 40px 30px;"">
      <p style=""font-size: 16px; font-weight: 600; margin-top: 0; color: #111827;"">Kính gửi {contract.Tenant.FullName},</p>
      
      <p style=""font-size: 15px; line-height: 1.6; color: #4b5563;"">Hợp đồng thuê phòng <span style=""color: #4f46e5; font-weight: bold;"">{contract.Room.RoomNumber}</span> của bạn đã được hệ thống phê duyệt và ký điện tử thành công.</p>
      
      <!-- Details Box -->
      <div style=""background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px; margin: 25px 0;"">
        <table style=""width: 100%; font-size: 14px; border-collapse: collapse;"">
          <tr>
            <td style=""color: #64748b; padding-bottom: 8px;"">Mã hợp đồng:</td>
            <td style=""color: #0f172a; font-weight: bold; padding-bottom: 8px; text-align: right;"">HD{contract.Id:D3}</td>
          </tr>
          <tr>
            <td style=""color: #64748b; padding-bottom: 8px;"">Thời hạn thuê:</td>
            <td style=""color: #0f172a; font-weight: 600; padding-bottom: 8px; text-align: right;"">{contract.StartDate:dd/MM/yyyy} - {contract.EndDate:dd/MM/yyyy}</td>
          </tr>
          <tr>
            <td style=""color: #64748b;"">Trạng thái:</td>
            <td style=""text-align: right;""><span style=""background-color: #dcfce7; color: #166534; padding: 4px 10px; border-radius: 6px; font-weight: bold; font-size: 12px;"">Đã kích hoạt</span></td>
          </tr>
        </table>
      </div>

      <!-- Button -->
      <div style=""text-align: center; margin: 30px 0;"">
        <a href=""{absoluteUrl}"" style=""display: inline-block; background: linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%); color: #ffffff; text-decoration: none; padding: 14px 30px; border-radius: 12px; font-weight: bold; font-size: 15px; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.25);"">
          Xem & Tải Hợp Đồng (PDF)
        </a>
      </div>

      <p style=""font-size: 13px; line-height: 1.5; color: #9ca3af; text-align: center; margin-bottom: 0;"">
        Nếu nút tải không hoạt động, vui lòng copy đường link này dán vào trình duyệt: <br>
        <a href=""{absoluteUrl}"" style=""color: #3b82f6; text-decoration: none;"">{absoluteUrl}</a>
      </p>
    </div>

    <!-- Footer -->
    <div style=""background-color: #f9fafb; padding: 25px 30px; border-top: 1px solid #f3f4f6; text-align: center; font-size: 13px; color: #6b7280;"">
      <p style=""margin: 0;"">Trân trọng,</p>
      <p style=""margin: 5px 0 0 0; font-weight: bold; color: #4f46e5;"">Chủ Nhà Trọ Thông Minh</p>
    </div>

  </div>
</div>
";
                await _emailService.SendEmailAsync(contract.Tenant.Email, subject, body);
            }

            return Ok(new { message = "Ký hợp đồng thành công và đã gửi email.", url = signedPdfUrl });
        }

        [HttpGet("{id}/download")]
        [Microsoft.AspNetCore.Authorization.AllowAnonymous] // Cho phép tải nhanh qua link email
        public async Task<IActionResult> GetContractPdf(int id)
        {
            var contract = await _context.Contracts
                .Include(c => c.Tenant)
                .Include(c => c.Room)
                .FirstOrDefaultAsync(c => c.Id == id);

            if (contract == null) return NotFound("Hợp đồng không tồn tại.");

            // Giả lập nội dung PDF (trong thực tế sẽ dùng thư viện iTextSharp hoặc DinkToPdf)
            string content = $@"
                HỢP ĐỒNG THUÊ NHÀ TRỌ THÔNG MINH
                Mã số: HD{contract.Id:D3}
                -------------------------------------------------
                BÊN CHO THUÊ: PHẠM CAO CHÍ THÀNH
                BÊN THUÊ: {contract.Tenant.FullName}
                CCCD: {contract.Tenant.Cccd}
                -------------------------------------------------
                PHÒNG THUÊ: {contract.Room.RoomNumber}
                THỜI HẠN: Từ {contract.StartDate:dd/MM/yyyy} đến {contract.EndDate:dd/MM/yyyy}
                -------------------------------------------------
                Hợp đồng đã được ký kết điện tử vào lúc {contract.UpdatedAt:dd/MM/yyyy HH:mm:ss}
            ";

            byte[] byteArray = System.Text.Encoding.UTF8.GetBytes(content);
            return File(byteArray, "application/pdf", $"HopDong_HD{contract.Id:D3}.pdf");
        }

        public class CancelRequestDto
        {
            public string Reason { get; set; } = "";
        }

        [HttpPost("{id}/request-cancel")]
        [Microsoft.AspNetCore.Authorization.Authorize]
        public async Task<IActionResult> RequestCancel(int id, [FromBody] CancelRequestDto dto)
        {
            var userRole = User.Claims.FirstOrDefault(c => c.Type == System.Security.Claims.ClaimTypes.Role)?.Value;
            var userTenantId = User.Claims.FirstOrDefault(c => c.Type == "TenantId")?.Value;

            var contract = await _context.Contracts
                .Include(c => c.Tenant)
                .Include(c => c.Room)
                .FirstOrDefaultAsync(c => c.Id == id);

            if (contract == null) return NotFound("Hợp đồng không tồn tại.");

            if (userRole == "TenantUser" && userTenantId != contract.TenantId.ToString())
            {
                return Forbid();
            }

            contract.IsCancelRequested = true;
            contract.CancelReason = dto.Reason;
            contract.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            // Gửi thông báo Telegram cho Admin
            string notifyMsg = $"⚠️ *YÊU CẦU HỦY HỢP ĐỒNG*\n\n" +
                               $"👤 Khách trọ: *{contract.Tenant?.FullName}*\n" +
                               $"🏠 Phòng: *{contract.Room?.RoomNumber}*\n" +
                               $"📝 Lý do: _{dto.Reason}_";
            await _telegramService.SendAdminNotificationAsync(notifyMsg);

            return Ok(new { message = "Gửi yêu cầu hủy hợp đồng thành công. Vui lòng chờ Admin duyệt." });
        }

        [HttpPost("{id}/approve-cancel")]
        [Microsoft.AspNetCore.Authorization.Authorize(Roles = "Admin,Staff")]
        public async Task<IActionResult> ApproveCancel(int id)
        {
            var contract = await _context.Contracts
                .Include(c => c.Room)
                .FirstOrDefaultAsync(c => c.Id == id);

            if (contract == null) return NotFound("Hợp đồng không tồn tại.");

            contract.Status = ContractStatus.Terminated;
            contract.IsCancelRequested = false;
            contract.UpdatedAt = DateTime.UtcNow;

            if (contract.Room != null)
            {
                contract.Room.Status = RoomStatus.Available;
            }

            await _context.SaveChangesAsync();
            return Ok(new { message = "Hợp đồng đã được chấm dứt theo yêu cầu của khách thuê." });
        }

        public class TerminateDto
        {
            public string ViolationReason { get; set; } = "";
        }

        [HttpPost("{id}/terminate")]
        [Microsoft.AspNetCore.Authorization.Authorize(Roles = "Admin,Staff")]
        public async Task<IActionResult> TerminateContract(int id, [FromBody] TerminateDto dto)
        {
            var contract = await _context.Contracts
                .Include(c => c.Room)
                .FirstOrDefaultAsync(c => c.Id == id);

            if (contract == null) return NotFound("Hợp đồng không tồn tại.");

            if (string.IsNullOrWhiteSpace(dto.ViolationReason))
            {
                return BadRequest("Admin phải chọn hoặc nhập lý do vi phạm để chấm dứt hợp đồng.");
            }

            contract.Status = ContractStatus.Terminated;
            contract.ViolationReason = dto.ViolationReason;
            contract.IsCancelRequested = false;
            contract.UpdatedAt = DateTime.UtcNow;

            if (contract.Room != null)
            {
                contract.Room.Status = RoomStatus.Available;
            }

            await _context.SaveChangesAsync();
            return Ok(new { message = "Đã đơn phương chấm dứt hợp đồng do khách vi phạm." });
        }

        public class CreateContractDto
        {
            public int TenantId { get; set; }
            public int RoomId { get; set; }
            public DateTime StartDate { get; set; }
            public DateTime EndDate { get; set; }
            public decimal DepositAmount { get; set; }
        }

        [HttpPost]
        public async Task<IActionResult> CreateContract([FromBody] CreateContractDto dto)
        {
            var tenant = await _context.Tenants.FindAsync(dto.TenantId);
            if (tenant == null) return NotFound("Không tìm thấy khách trọ.");

            var room = await _context.Rooms.FindAsync(dto.RoomId);
            if (room == null) return NotFound("Không tìm thấy phòng.");

            if (room.Status == RoomStatus.Rented)
            {
                return BadRequest("Phòng đã có người thuê.");
            }

            var contract = new Contract
            {
                TenantId = dto.TenantId,
                RoomId = dto.RoomId,
                StartDate = dto.StartDate,
                EndDate = dto.EndDate,
                Status = ContractStatus.Active,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.Contracts.Add(contract);
            await _context.SaveChangesAsync();

            var deposit = new Deposit
            {
                ContractId = contract.Id,
                TotalAmount = dto.DepositAmount,
                CurrentBalance = dto.DepositAmount,
                Status = DepositStatus.Active,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            _context.Deposits.Add(deposit);

            room.Status = RoomStatus.Rented;
            room.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetContracts), new { id = contract.Id }, contract);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteContract(int id)
        {
            var contract = await _context.Contracts
                .Include(c => c.Room)
                .Include(c => c.Deposit)
                .FirstOrDefaultAsync(c => c.Id == id);
                
            if (contract == null) return NotFound();

            if (contract.Room != null)
            {
                contract.Room.Status = RoomStatus.Available;
            }

            if (contract.Deposit != null)
            {
                _context.Deposits.Remove(contract.Deposit);
            }

            _context.Contracts.Remove(contract);
            await _context.SaveChangesAsync();

            return NoContent();
        }
    }
}
