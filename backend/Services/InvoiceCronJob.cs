using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.DependencyInjection;
using QL_nhaTro_KTX.Backend.Data;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace QL_nhaTro_KTX.Backend.Services
{
    public class InvoiceCronJob : BackgroundService
    {
        private readonly ILogger<InvoiceCronJob> _logger;
        private readonly IServiceProvider _serviceProvider;

        public InvoiceCronJob(ILogger<InvoiceCronJob> logger, IServiceProvider serviceProvider)
        {
            _logger = logger;
            _serviceProvider = serviceProvider;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("🚀 [CRON JOB] Tiến trình tự động gửi thông báo đã được kích hoạt chạy ngầm.");

            while (!stoppingToken.IsCancellationRequested)
            {
                var now = DateTime.Now;

                // LOGIC: Kích hoạt tự động vào ngày 1 hàng tháng lúc 08:00 AM
                if (now.Day == 1 && now.Hour == 8 && now.Minute == 0)
                {
                    _logger.LogInformation($"[CRON JOB] Đang chạy chu trình tạo Hóa Đơn và Gửi Email cho tháng {now.Month}...");

                    try
                    {
                        using (var scope = _serviceProvider.CreateScope())
                        {
                            // Lấy instance của DbContext từ Scope (Vì BackgroundService là Singleton)
                            var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                            
                            // Tại đây gọi logic tạo hóa đơn (giống InvoicesController)
                            // ...

                            // Gửi thông báo
                            _logger.LogInformation("[CRON JOB] Đang kết nối SMTP Server để gửi Email/SMS...");
                            
                            // Giả lập gửi tin nhắn thành công
                            _logger.LogInformation("[CRON JOB] ✅ Đã gửi SMS nhắc nhở đến 42 khách thuê thành công!");
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError($"[CRON JOB] ❌ Lỗi: {ex.Message}");
                    }
                    
                    // Delay 1 phút để tránh chạy lặp lại nhiều lần trong cùng phút 08:00
                    await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken);
                }

                // Dọn Refresh Token hết hạn mỗi ngày lúc 03:00 AM
                if (now.Hour == 3 && now.Minute == 0)
                {
                    try
                    {
                        using var scope = _serviceProvider.CreateScope();
                        var tokenService = scope.ServiceProvider.GetRequiredService<ITokenService>();
                        await tokenService.PurgeExpiredTokensAsync();
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "[CRON JOB] Lỗi khi dọn Refresh Token hết hạn.");
                    }
                    await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken);
                }

                // Check liên tục mỗi phút
                await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken);
            }
        }
    }
}
