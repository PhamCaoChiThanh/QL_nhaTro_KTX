using Microsoft.AspNetCore.Mvc;
using QL_nhaTro_KTX.Backend.Services;
using System.Text.Json;
using System.Threading.Tasks;

namespace QL_nhaTro_KTX.Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class TelegramWebhookController : ControllerBase
    {
        private readonly ITelegramBotService _telegramService;

        public TelegramWebhookController(ITelegramBotService telegramService)
        {
            _telegramService = telegramService;
        }

        /// <summary>
        /// Đây là Endpoint Webhook mà Telegram sẽ gọi mỗi khi có tin nhắn mới.
        /// URL cần đăng ký với Telegram: https://your-domain.com/api/TelegramWebhook
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> Post([FromBody] JsonElement update)
        {
            await _telegramService.HandleUpdateAsync(update);
            return Ok(); // Phải trả về 200 OK ngay lập tức để Telegram không retry
        }
    }
}
