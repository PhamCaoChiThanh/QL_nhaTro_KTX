using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QL_nhaTro_KTX.Backend.Data;
using QL_nhaTro_KTX.Backend.Models;

namespace QL_nhaTro_KTX.Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize] // Yêu cầu JWT token để truy cập các API bên dưới
    public class TenantsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public TenantsController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        [Authorize(Roles = "Admin,Staff")] // Chỉ Admin và Staff được lấy list danh sách người thuê
        public async Task<IActionResult> GetTenants()
        {
            var tenants = await _context.Tenants
                .Include(t => t.Contracts)
                    .ThenInclude(c => c.Room)
                .Select(t => new {
                    id = t.Id,
                    fullName = t.FullName,
                    cccd = t.Cccd,
                    phone = t.Phone,
                    email = t.Email,
                    avatarUrl = t.AvatarUrl,
                    cccdFrontImageUrl = t.CccdFrontImageUrl,
                    cccdBackImageUrl = t.CccdBackImageUrl,
                    roomNumber = t.Contracts.FirstOrDefault(c => c.Status == ContractStatus.Active) != null 
                        ? t.Contracts.FirstOrDefault(c => c.Status == ContractStatus.Active)!.Room!.RoomNumber 
                        : "Chưa phân phòng",
                    createdAt = t.CreatedAt
                })
                .ToListAsync();

            return Ok(tenants);
        }

        [HttpGet("me")]
        public async Task<IActionResult> GetMyProfile()
        {
            var userTenantIdStr = User.Claims.FirstOrDefault(c => c.Type == "TenantId")?.Value;
            if (string.IsNullOrEmpty(userTenantIdStr) || !int.TryParse(userTenantIdStr, out int tenantId))
                return Unauthorized(new { message = "Bạn không phải là người thuê." });

            var tenant = await _context.Tenants
                .Include(t => t.Contracts)
                    .ThenInclude(c => c.Room)
                .Include(t => t.Contracts)
                    .ThenInclude(c => c.Invoices)
                .FirstOrDefaultAsync(t => t.Id == tenantId);

            if (tenant == null) return NotFound();

            var activeContract = tenant.Contracts.FirstOrDefault(c => c.Status == ContractStatus.Active);
            
            return Ok(new {
                Id = tenant.Id,
                FullName = tenant.FullName,
                Cccd = tenant.Cccd,
                Phone = tenant.Phone,
                Email = tenant.Email,
                RoomNumber = activeContract?.Room?.RoomNumber,
                HasContract = activeContract != null,
                LatestInvoice = activeContract?.Invoices?.OrderByDescending(i => i.BillingYear).ThenByDescending(i => i.BillingMonth).FirstOrDefault(),
                ContractStartDate = activeContract?.StartDate,
                ContractEndDate = activeContract?.EndDate,
                ContractId = activeContract?.Id,
                IsCancelRequested = activeContract?.IsCancelRequested ?? false,
                CancelReason = activeContract?.CancelReason,
                ViolationReason = activeContract?.ViolationReason,
                ScannedContractUrl = activeContract?.ScannedContractUrl
            });
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<Tenant>> GetTenant(int id)
        {
            var userRole = User.Claims.FirstOrDefault(c => c.Type == System.Security.Claims.ClaimTypes.Role)?.Value;
            var userTenantId = User.Claims.FirstOrDefault(c => c.Type == "TenantId")?.Value;

            // RBAC Logic: Người thuê CHỈ ĐƯỢC XEM thông tin của chính họ.
            if (userRole == "TenantUser" && userTenantId != id.ToString())
            {
                return Forbid();
            }

            var tenant = await _context.Tenants.FindAsync(id);
            if (tenant == null) return NotFound();

            return tenant;
        }

        public class CreateTenantDto
        {
            public string? fullName { get; set; }
            public string? cccd { get; set; }
            public string? phone { get; set; }
            public string? email { get; set; }
        }

        [HttpPost]
        [Authorize(Roles = "Admin,Staff")]
        public async Task<ActionResult<Tenant>> PostTenant(CreateTenantDto dto)
        {
            if (string.IsNullOrEmpty(dto.cccd) || dto.cccd.Length != 12 || !dto.cccd.All(char.IsDigit))
            {
                return BadRequest("Số CCCD phải bao gồm đúng 12 chữ số.");
            }

            if (string.IsNullOrEmpty(dto.phone) || dto.phone.Length != 10 || !dto.phone.All(char.IsDigit))
            {
                return BadRequest("Số điện thoại phải bao gồm đúng 10 chữ số.");
            }

            if (!string.IsNullOrEmpty(dto.email) && !System.Text.RegularExpressions.Regex.IsMatch(dto.email, @"^[^@\s]+@[^@\s]+\.[^@\s]+$"))
            {
                return BadRequest("Email không đúng định dạng.");
            }

            if (await _context.Tenants.AnyAsync(t => t.Cccd == dto.cccd))
            {
                return BadRequest("CCCD đã tồn tại trong hệ thống.");
            }

            var tenant = new Tenant
            {
                FullName = dto.fullName ?? "",
                Cccd = dto.cccd ?? "",
                Phone = dto.phone ?? "",
                Email = dto.email,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.Tenants.Add(tenant);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetTenant), new { id = tenant.Id }, tenant);
        }

        public class UpdateTenantDto
        {
            public int? id { get; set; }
            public string? fullName { get; set; }
            public string? cccd { get; set; }
            public string? phone { get; set; }
            public string? email { get; set; }
        }

        [HttpPut("{id}")]
        [Authorize]
        public async Task<IActionResult> PutTenant(int id, UpdateTenantDto dto)
        {
            var userRole = User.Claims.FirstOrDefault(c => c.Type == System.Security.Claims.ClaimTypes.Role)?.Value;
            var userTenantId = User.Claims.FirstOrDefault(c => c.Type == "TenantId")?.Value;

            if (userRole == "TenantUser" && userTenantId != id.ToString())
            {
                return Forbid();
            }

            if (dto.id != null && id != dto.id) return BadRequest("ID không trùng khớp.");

            if (!string.IsNullOrEmpty(dto.cccd) && (dto.cccd.Length != 12 || !dto.cccd.All(char.IsDigit)))
            {
                return BadRequest("Số CCCD phải bao gồm đúng 12 chữ số.");
            }

            if (!string.IsNullOrEmpty(dto.phone) && (dto.phone.Length != 10 || !dto.phone.All(char.IsDigit)))
            {
                return BadRequest("Số điện thoại phải bao gồm đúng 10 chữ số.");
            }

            if (!string.IsNullOrEmpty(dto.email) && !System.Text.RegularExpressions.Regex.IsMatch(dto.email, @"^[^@\s]+@[^@\s]+\.[^@\s]+$"))
            {
                return BadRequest("Email không đúng định dạng.");
            }

            var tenant = await _context.Tenants.FindAsync(id);
            if (tenant == null) return NotFound("Không tìm thấy khách trọ.");

            if (await _context.Tenants.AnyAsync(t => t.Cccd == dto.cccd && t.Id != id))
            {
                return BadRequest("CCCD này đã được sử dụng bởi người khác.");
            }

            if (!string.IsNullOrEmpty(dto.fullName)) tenant.FullName = dto.fullName;
            if (!string.IsNullOrEmpty(dto.cccd)) tenant.Cccd = dto.cccd;
            if (!string.IsNullOrEmpty(dto.phone)) tenant.Phone = dto.phone;
            if (dto.email != null) tenant.Email = dto.email;
            tenant.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return NoContent();
        }
        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin,Staff")]
        public async Task<IActionResult> DeleteTenant(int id)
        {
            var tenant = await _context.Tenants
                .Include(t => t.Contracts)
                    .ThenInclude(c => c.Deposit)
                .Include(t => t.Contracts)
                    .ThenInclude(c => c.Invoices)
                .Include(t => t.MaintenanceRequests)
                .FirstOrDefaultAsync(t => t.Id == id);
                
            if (tenant == null) return NotFound();

            // Nếu muốn xóa sạch hồ sơ, ta xóa hết dữ liệu liên quan
            if (tenant.Contracts != null && tenant.Contracts.Any())
            {
                foreach (var contract in tenant.Contracts)
                {
                    var room = await _context.Rooms.FindAsync(contract.RoomId);
                    if (room != null && contract.Status == ContractStatus.Active)
                    {
                        room.Status = RoomStatus.Available;
                    }

                    if (contract.Deposit != null)
                    {
                        _context.Deposits.Remove(contract.Deposit);
                    }
                    if (contract.Invoices != null && contract.Invoices.Any())
                    {
                        _context.Invoices.RemoveRange(contract.Invoices);
                    }
                    _context.Contracts.Remove(contract);
                }
            }

            if (tenant.MaintenanceRequests != null && tenant.MaintenanceRequests.Any())
            {
                _context.Maintenances.RemoveRange(tenant.MaintenanceRequests);
            }

            // Xóa tài khoản đăng nhập (nếu có)
            var appUser = await _context.Users.FirstOrDefaultAsync(u => u.TenantId == id);
            if (appUser != null)
            {
                _context.Users.Remove(appUser);
            }

            _context.Tenants.Remove(tenant);
            await _context.SaveChangesAsync();

            return NoContent();
        }
    }
}
