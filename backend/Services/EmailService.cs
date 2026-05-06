using System;
using System.IO;
using System.Net;
using System.Net.Mail;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;

namespace QL_nhaTro_KTX.Backend.Services
{
    public interface IEmailService
    {
        Task SendEmailAsync(string toEmail, string subject, string body);
    }

    public class EmailService : IEmailService
    {
        private readonly ILogger<EmailService> _logger;
        private string _smtpServer;
        private int _smtpPort;
        private string _smtpUser;
        private string _smtpPass;

        public EmailService(ILogger<EmailService> logger)
        {
            _logger = logger;
            LoadEnv();
        }

        private void LoadEnv()
        {
            try
            {
                // Tìm file .env trong thư mục Services hoặc thư mục gốc
                string envPath = Path.Combine(Directory.GetCurrentDirectory(), "Services", ".env");
                if (!File.Exists(envPath))
                {
                    envPath = Path.Combine(Directory.GetCurrentDirectory(), ".env");
                }

                if (File.Exists(envPath))
                {
                    foreach (var line in File.ReadAllLines(envPath))
                    {
                        if (string.IsNullOrWhiteSpace(line) || line.StartsWith("#")) continue;
                        var parts = line.Split('=', 2);
                        if (parts.Length == 2)
                        {
                            Environment.SetEnvironmentVariable(parts[0].Trim(), parts[1].Trim());
                        }
                    }
                }
                
                _smtpServer = Environment.GetEnvironmentVariable("SMTP_SERVER") ?? "smtp.gmail.com";
                int.TryParse(Environment.GetEnvironmentVariable("SMTP_PORT") ?? "587", out _smtpPort);
                _smtpUser = Environment.GetEnvironmentVariable("SMTP_USER") ?? string.Empty;
                _smtpPass = Environment.GetEnvironmentVariable("SMTP_PASS") ?? string.Empty;
            }
            catch (Exception ex)
            {
                _logger.LogError($"Lỗi khi đọc file .env: {ex.Message}");
            }
        }

        public async Task SendEmailAsync(string toEmail, string subject, string body)
        {
            _logger.LogInformation($"CHUẨN BỊ GỬI EMAIL TỚI: {toEmail} qua {_smtpServer}:{_smtpPort}");

            if (string.IsNullOrEmpty(_smtpUser) || string.IsNullOrEmpty(_smtpPass))
            {
                _logger.LogWarning("Chưa cấu hình SMTP_USER và SMTP_PASS trong file .env. Bỏ qua gửi email thực tế.");
                return;
            }

            try
            {
                using var client = new SmtpClient(_smtpServer, _smtpPort)
                {
                    Credentials = new NetworkCredential(_smtpUser, _smtpPass),
                    EnableSsl = true
                };

                using var mailMessage = new MailMessage
                {
                    From = new MailAddress(_smtpUser, "SmartDorm Admin"),
                    Subject = subject,
                    Body = body,
                    IsBodyHtml = true
                };
                
                // Nếu khách hàng nhập email giả, ta có thể ghi đè sang EMAIL_TO trong .env để nhận email test
                string debugEmail = Environment.GetEnvironmentVariable("EMAIL_TO") ?? string.Empty;
                if (!string.IsNullOrEmpty(debugEmail))
                {
                    mailMessage.To.Add(debugEmail);
                    _logger.LogInformation($"[DEBUG] Chuyển hướng email sang {debugEmail} thay vì {toEmail} (Cấu hình EMAIL_TO trong .env)");
                }
                else
                {
                    mailMessage.To.Add(toEmail);
                }

                await client.SendMailAsync(mailMessage);
                _logger.LogInformation("✅ GỬI EMAIL THÀNH CÔNG!");
            }
            catch (Exception ex)
            {
                _logger.LogError($"❌ Lỗi khi gửi email: {ex.Message}");
            }
        }
    }
}
