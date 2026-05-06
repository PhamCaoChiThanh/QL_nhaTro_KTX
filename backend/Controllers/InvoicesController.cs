using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QL_nhaTro_KTX.Backend.Data;
using QL_nhaTro_KTX.Backend.Models;
using QL_nhaTro_KTX.Backend.Services;
using System.Globalization;

namespace QL_nhaTro_KTX.Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class InvoicesController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly ITelegramBotService _telegramService;
        private readonly IEmailService _emailService;

        public InvoicesController(AppDbContext context, ITelegramBotService telegramService, IEmailService emailService)
        {
            _context = context;
            _telegramService = telegramService;
            _emailService = emailService;
        }

        [HttpGet]
        [Authorize(Roles = "Admin,Staff,Accountant")]
        public async Task<IActionResult> GetInvoices()
        {
            var invoices = await _context.Invoices
                .Include(i => i.Contract)
                    .ThenInclude(c => c.Tenant)
                .Include(i => i.Contract)
                    .ThenInclude(c => c.Room)
                .OrderByDescending(i => i.BillingYear)
                .ThenByDescending(i => i.BillingMonth)
                .Select(i => new {
                    id = i.Id,
                    roomNumber = i.Contract.Room.RoomNumber,
                    tenantName = i.Contract.Tenant.FullName,
                    month = i.BillingMonth,
                    year = i.BillingYear,
                    total = i.TotalAmount,
                    status = i.Status.ToString(),
                    createdAt = i.CreatedAt
                })
                .ToListAsync();

            return Ok(invoices);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetInvoice(int id)
        {
            var invoice = await _context.Invoices
                .Include(i => i.Contract)
                    .ThenInclude(c => c.Tenant)
                .Include(i => i.Contract)
                    .ThenInclude(c => c.Room)
                .FirstOrDefaultAsync(i => i.Id == id);

            if (invoice == null) return NotFound();

            return Ok(invoice);
        }

        [HttpPost("generate-monthly")]
        [Authorize(Roles = "Admin,Staff,Accountant")]
        public async Task<IActionResult> GenerateMonthlyInvoices([FromQuery] int month, [FromQuery] int year)
        {
            var activeContracts = await _context.Contracts
                .Include(c => c.Room)
                .Include(c => c.Tenant)
                .Where(c => c.Status == ContractStatus.Active)
                .ToListAsync();

            int count = 0;
            foreach (var contract in activeContracts)
            {
                // Kiểm tra xem đã có hóa đơn cho tháng này chưa
                var exists = await _context.Invoices.AnyAsync(i => i.ContractId == contract.Id && i.BillingMonth == month && i.BillingYear == year);
                if (exists) continue;

                // Lấy chỉ số điện nước (giả định lấy bản ghi mới nhất trong tháng đó)
                var eUsage = await _context.ElectricUsages.FirstOrDefaultAsync(u => u.RoomId == contract.RoomId && u.BillingMonth == month && u.BillingYear == year);
                var wUsage = await _context.WaterUsages.FirstOrDefaultAsync(u => u.RoomId == contract.RoomId && u.BillingMonth == month && u.BillingYear == year);

                decimal electricFee = (eUsage?.UsageAmount ?? 0) * contract.Room.ElectricityPrice;
                decimal waterFee = (wUsage?.UsageAmount ?? 0) * contract.Room.WaterPrice;
                decimal roomFee = contract.Room.BasePrice;
                decimal garbageFee = contract.Room.GarbageFee;

                var invoice = new Invoice
                {
                    ContractId = contract.Id,
                    BillingMonth = month,
                    BillingYear = year,
                    ElectricityUsage = eUsage?.UsageAmount ?? 0,
                    WaterUsage = wUsage?.UsageAmount ?? 0,
                    RoomFee = roomFee,
                    ElectricFee = electricFee,
                    WaterFee = waterFee,
                    TotalAmount = roomFee + electricFee + waterFee + garbageFee,
                    Status = InvoiceStatus.Unpaid,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                _context.Invoices.Add(invoice);
                count++;
            }

            await _context.SaveChangesAsync();
            return Ok(new { message = $"Đã tạo thành công {count} hóa đơn cho tháng {month}/{year}." });
        }

        [HttpPost("{id}/send")]
        [Authorize(Roles = "Admin,Staff,Accountant")]
        public async Task<IActionResult> SendInvoiceNotification(int id)
        {
            var invoice = await _context.Invoices
                .Include(i => i.Contract)
                    .ThenInclude(c => c.Tenant)
                .Include(i => i.Contract)
                    .ThenInclude(c => c.Room)
                .FirstOrDefaultAsync(i => i.Id == id);

            if (invoice == null) return NotFound("Hóa đơn không tồn tại.");

            var tenant = invoice.Contract.Tenant;
            var room = invoice.Contract.Room;

            string formattedTotal = invoice.TotalAmount.ToString("N0", new CultureInfo("vi-VN"));
            string msg = $"🔔 *THÔNG BÁO TIỀN PHÒNG - THÁNG {invoice.BillingMonth}/{invoice.BillingYear}*\n\n" +
                         $"🏠 Phòng: *{room.RoomNumber}*\n" +
                         $"👤 Khách thuê: *{tenant.FullName}*\n" +
                         $"----------------------------\n" +
                         $"💰 Tiền phòng: {invoice.RoomFee:N0}đ\n" +
                         $"⚡ Tiền điện: {invoice.ElectricFee:N0}đ\n" +
                         $"💧 Tiền nước: {invoice.WaterFee:N0}đ\n" +
                         $"♻️ Phí rác: {room.GarbageFee:N0}đ\n" +
                         $"----------------------------\n" +
                         $"🚀 *TỔNG CỘNG: {formattedTotal}đ*\n\n" +
                         $"📌 Hạn thanh toán: mùng 05 hàng tháng.\n" +
                         $"Vui lòng truy cập Tenant Portal để thanh toán qua VNPay/MoMo.";

            // 1. Gửi Telegram
            if (!string.IsNullOrEmpty(tenant.TelegramChatId))
            {
                try {
                    await _telegramService.SendMessageAsync(long.Parse(tenant.TelegramChatId), msg);
                } catch (Exception ex) {
                    return BadRequest($"Lỗi gửi Telegram: {ex.Message}");
                }
            }

            // 2. Gửi Email (nếu có)
            if (!string.IsNullOrEmpty(tenant.Email))
            {
                string emailSubject = $"[Nhà Trọ Thông Minh] Thông báo tiền phòng tháng {invoice.BillingMonth}/{invoice.BillingYear}";
                await _emailService.SendEmailAsync(tenant.Email, emailSubject, msg.Replace("*", "")); // Bỏ ký tự markdown cho email đơn giản
            }

            return Ok(new { message = "Đã gửi thông báo hóa đơn thành công!" });
        }
        [HttpPost("{id}/pay-simulation")]
        public async Task<IActionResult> PaySimulation(int id)
        {
            var invoice = await _context.Invoices.FindAsync(id);
            if (invoice == null) return NotFound();

            // Giả lập trả về URL thanh toán VNPay
            string fakeUrl = $"https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_Amount={invoice.TotalAmount * 100}&vnp_TxnRef={invoice.Id}";
            
            return Ok(new { 
                paymentUrl = fakeUrl,
                message = "Hệ thống đang chuyển hướng đến cổng thanh toán VNPay (Giả lập)..." 
            });
        }

        [HttpPost("webhook/vnpay")]
        [AllowAnonymous] // Webhook thường được gọi từ server-to-server không kèm token người dùng
        public async Task<IActionResult> VnPayWebhook([FromBody] dynamic data)
        {
            // Trong thực tế, 'data' sẽ chứa vnp_TxnRef, vnp_ResponseCode, vnp_SecureHash...
            // Ở đây ta làm fake, lấy invoiceId từ body
            int invoiceId = data.invoiceId;
            var invoice = await _context.Invoices.Include(i => i.Payments).FirstOrDefaultAsync(i => i.Id == invoiceId);
            
            if (invoice == null) return NotFound();
            if (invoice.Status == InvoiceStatus.Paid) return Ok(new { message = "Đã xử lý trước đó." });

            invoice.Status = InvoiceStatus.Paid;
            invoice.PaidAmount = invoice.TotalAmount;
            invoice.UpdatedAt = DateTime.UtcNow;

            // Thêm bản ghi thanh toán
            var payment = new Payment
            {
                InvoiceId = invoice.Id,
                Amount = invoice.TotalAmount,
                PaymentMethod = PaymentMethod.Transfer,
                PaymentDate = DateTime.UtcNow
            };
            _context.Payments.Add(payment);

            await _context.SaveChangesAsync();
            return Ok(new { message = "Thanh toán thành công!", status = "Paid" });
        }
    }
}
