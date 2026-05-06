using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QL_nhaTro_KTX.Backend.Data;
using QL_nhaTro_KTX.Backend.Models;
using QL_nhaTro_KTX.Backend.Services;

namespace QL_nhaTro_KTX.Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class AnnouncementsController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly ITelegramBotService _telegramService;

        public AnnouncementsController(AppDbContext context, ITelegramBotService telegramService)
        {
            _context = context;
            _telegramService = telegramService;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Announcement>>> GetAnnouncements()
        {
            return await _context.Announcements.OrderByDescending(a => a.CreatedAt).ToListAsync();
        }

        [HttpPost]
        [Authorize(Roles = "Admin,Staff")]
        public async Task<ActionResult<Announcement>> PostAnnouncement(Announcement announcement)
        {
            _context.Announcements.Add(announcement);
            await _context.SaveChangesAsync();

            // Gửi Telegram cho tất cả khách thuê nếu được yêu cầu (giả định tự động gửi khi tạo)
            var tenants = await _context.Tenants.Where(t => !string.IsNullOrEmpty(t.TelegramChatId)).ToListAsync();
            string msg = $"📢 *THÔNG BÁO MỚI*\n\n*{announcement.Title}*\n\n{announcement.Content}";
            
            foreach (var tenant in tenants)
            {
                if (long.TryParse(tenant.TelegramChatId, out long chatId))
                {
                    try {
                        await _telegramService.SendMessageAsync(chatId, msg);
                    } catch { /* Ignore error for individual send */ }
                }
            }

            return CreatedAtAction("GetAnnouncements", new { id = announcement.Id }, announcement);
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin,Staff")]
        public async Task<IActionResult> DeleteAnnouncement(int id)
        {
            var announcement = await _context.Announcements.FindAsync(id);
            if (announcement == null) return NotFound();
            _context.Announcements.Remove(announcement);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}
