using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.DependencyInjection;
using System;
using System.Net.Http;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

namespace QL_nhaTro_KTX.Backend.Services
{
    public class TelegramPollingService : BackgroundService
    {
        private readonly ILogger<TelegramPollingService> _logger;
        private readonly IServiceProvider _serviceProvider;
        private readonly IHttpClientFactory _httpClientFactory;
        private int _lastUpdateId = 0;

        public TelegramPollingService(
            ILogger<TelegramPollingService> logger,
            IServiceProvider serviceProvider,
            IHttpClientFactory httpClientFactory)
        {
            _logger = logger;
            _serviceProvider = serviceProvider;
            _httpClientFactory = httpClientFactory;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("🚀 [TELEGRAM] Bắt đầu chế độ Long Polling để tự động trả lời...");

            // Xóa Webhook trước để chế độ Polling (getUpdates) hoạt động không bị lỗi 409
            try
            {
                string botToken = Environment.GetEnvironmentVariable("TELEGRAM_BOT_TOKEN") ?? "";
                if (!string.IsNullOrEmpty(botToken))
                {
                    using var httpClient = _httpClientFactory.CreateClient("Telegram");
                    await httpClient.GetAsync($"https://api.telegram.org/bot{botToken}/deleteWebhook", stoppingToken);
                    _logger.LogInformation("✅ [TELEGRAM] Đã xóa Webhook để kích hoạt Polling.");
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning($"⚠️ [TELEGRAM] Lỗi khi xóa Webhook: {ex.Message}");
            }

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    string botToken = Environment.GetEnvironmentVariable("TELEGRAM_BOT_TOKEN") ?? "";
                    if (string.IsNullOrEmpty(botToken))
                    {
                        await Task.Delay(5000, stoppingToken);
                        continue;
                    }

                    using var httpClient = _httpClientFactory.CreateClient("Telegram");
                    string url = $"https://api.telegram.org/bot{botToken}/getUpdates?offset={_lastUpdateId + 1}&timeout=30";

                    var response = await httpClient.GetAsync(url, stoppingToken);
                    if (response.IsSuccessStatusCode)
                    {
                        var content = await response.Content.ReadAsStringAsync();
                        using var doc = JsonDocument.Parse(content);
                        if (doc.RootElement.TryGetProperty("ok", out var okProp) && okProp.GetBoolean())
                        {
                            var result = doc.RootElement.GetProperty("result");
                            foreach (var update in result.EnumerateArray())
                            {
                                int updateId = update.GetProperty("update_id").GetInt32();
                                _lastUpdateId = updateId;

                                // Xử lý update qua Scoped Service
                                using (var scope = _serviceProvider.CreateScope())
                                {
                                    var botService = scope.ServiceProvider.GetRequiredService<ITelegramBotService>();
                                    await botService.HandleUpdateAsync(update);
                                }
                            }
                        }
                    }
                    else
                    {
                        // Thỉnh thoảng nếu bị lỗi (Ví dụ: 409 Webhook), tạm dừng một chút
                        await Task.Delay(5000, stoppingToken);
                    }
                }
                catch (TaskCanceledException) { /* Dừng an toàn */ }
                catch (Exception ex)
                {
                    _logger.LogError($"❌ [TELEGRAM Polling] Lỗi: {ex.Message}");
                    await Task.Delay(5000, stoppingToken);
                }
            }
        }
    }
}
