using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QL_nhaTro_KTX.Backend.Data;
using QL_nhaTro_KTX.Backend.Models;
using System.Security.Claims;

namespace QL_nhaTro_KTX.Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class VisitorsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public VisitorsController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Visitor>>> GetVisitors()
        {
            var userRole = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.Role)?.Value;
            var userTenantIdStr = User.Claims.FirstOrDefault(c => c.Type == "TenantId")?.Value;

            if (userRole == "TenantUser" && int.TryParse(userTenantIdStr, out int tenantId))
            {
                return await _context.Visitors.Where(v => v.TenantId == tenantId).OrderByDescending(v => v.VisitTime).ToListAsync();
            }

            return await _context.Visitors.Include(v => v.Tenant).OrderByDescending(v => v.VisitTime).ToListAsync();
        }

        [HttpPost]
        public async Task<ActionResult<Visitor>> PostVisitor(Visitor visitor)
        {
            var userRole = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.Role)?.Value;
            var userTenantIdStr = User.Claims.FirstOrDefault(c => c.Type == "TenantId")?.Value;

            if (userRole == "TenantUser")
            {
                if (int.TryParse(userTenantIdStr, out int tenantId))
                {
                    visitor.TenantId = tenantId;
                }
                else
                {
                    return BadRequest(new { message = "Không tìm thấy thông tin TenantId trong token." });
                }
            }

            if (visitor.TenantId <= 0)
            {
                return BadRequest(new { message = "Dữ liệu không hợp lệ: Thiếu thông tin người thuê." });
            }

            visitor.VisitTime = visitor.VisitTime == default ? DateTime.UtcNow : visitor.VisitTime;
            visitor.CreatedAt = DateTime.UtcNow;

            _context.Visitors.Add(visitor);
            await _context.SaveChangesAsync();
            return Ok(visitor);
        }
        
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteVisitor(int id)
        {
            var visitor = await _context.Visitors.FindAsync(id);
            if (visitor == null) return NotFound();
            _context.Visitors.Remove(visitor);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}
