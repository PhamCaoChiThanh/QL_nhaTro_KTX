using System;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using QL_nhaTro_KTX.Backend.Data;
using QL_nhaTro_KTX.Backend.Models;

namespace QL_nhaTro_KTX.Backend.Services
{
    public interface ITelegramBotService
    {
        Task HandleUpdateAsync(JsonElement update);
        Task SendMessageAsync(long chatId, string text);
        Task SendAdminNotificationAsync(string text);
    }

    public class TelegramBotService : ITelegramBotService
    {
        private readonly ILogger<TelegramBotService> _logger;
        private readonly IConfiguration _configuration;
        private readonly AppDbContext _context;
        private readonly HttpClient _httpClient;
        private readonly string _botToken;
        private readonly string? _geminiKey;

        // Context cứng mặc định (giống AIChatbotController)
        private const string HardcodedContext = @"
- Nội quy: Tự do giờ giấc (24/7) ra vào dùng FaceID. Không nuôi thú cưng, không hút thuốc trong phòng, để xe đúng vạch quy định dưới hầm. Giữ gìn vệ sinh chung.
- Wifi: Mật khẩu là ktx_smart_2026. Đường truyền cáp quang tốc độ cao 150Mbps rất ổn định.
- Hóa đơn: Chốt số điện nước ngày 01, hạn thanh toán từ ngày 01 đến ngày 05 hàng tháng qua ví VNPay, MoMo trực tiếp trên trang Tenant Portal.
- Báo hỏng/Sự cố: Khách thuê báo trực tiếp qua chức năng 'Gửi yêu cầu sửa chữa' tại Tenant Portal hoặc nhắn tin khẩn cấp cho Quản lý. Hư hỏng hao mòn tự nhiên được hỗ trợ sửa chữa hoàn toàn miễn phí.
- Giá phòng: Dao động từ 3,000,000 VNĐ đến 4,500,000 VNĐ tùy diện tích và số lượng người ở (2-4 người). Cam kết KHÔNG TĂNG GIÁ trong suốt thời hạn hợp đồng.
- Cọc: Tiền cọc là 01 tháng tiền phòng. Điều kiện lấy lại 100% tiền cọc là đi hết hợp đồng và báo trước 30 ngày.
- Giá điện nước: Điện 3.500đ/kwh, Nước 15.000đ/m3. Mỗi phòng có đồng hồ điện nước riêng biệt.
- Phụ phí: Miễn phí gửi xe (tối đa 2 xe/phòng), miễn phí Wifi. Phí rác vệ sinh là 50.000đ/phòng/tháng. Không có phí dịch vụ hay thang máy nào khác.
- Tiện ích: Phòng có sẵn máy lạnh, tủ lạnh mini, giường tầng cao cấp, bàn học và nhà vệ sinh riêng biệt khép kín. Có khu nấu ăn có máy hút mùi và khu phơi đồ đón nắng thông thoáng.
- An ninh: Camera giám sát 24/7 hầm xe và hành lang. Cửa khóa FaceID thông minh bảo mật cao.
- Hợp đồng & Tạm trú: Hợp đồng tối thiểu 6 tháng hoặc 1 năm. Nếu muốn dọn đi sớm phải báo trước 30 ngày. Ban Quản Lý cam kết hỗ trợ đăng ký tạm trú đầy đủ cho khách thuê.
- Liên hệ hỗ trợ: Phạm Cao Chí Thành. Hotline/Zalo: 0704.569.016.
- Giao thông: Vị trí nhà trọ nằm kế bên khu vực Thủ Đức, giao thông cực kỳ thuận lợi di chuyển sang các trường đại học hoặc các tuyến đường lớn mà không lo kẹt xe.
- Ngập nước: Khu vực cao ráo, cam kết KHÔNG ngập nước kể cả khi triều cường hay mưa bão lớn.
- Giặt ủi: Có khu vực giặt sấy chung tại sân thượng (sân thượng) với máy giặt hiện đại, phí sử dụng 20k/lượt giặt.
- Nấu ăn: Được phép nấu ăn trong phòng bằng bếp từ hoặc bếp hồng ngoại (nghiêm cấm dùng bếp gas để phòng chống cháy nổ).
- Nội thất: Khách có thể tự trang bị thêm đồ dùng cá nhân, nhưng không được khoan đục tường khi chưa có sự đồng ý của quản lý.
- Yên tĩnh: Sau 23h đêm vui lòng giữ yên tĩnh, không làm ồn ảnh hưởng đến các phòng xung quanh.
- PCCC: Hệ thống báo cháy và bình chữa cháy được trang bị đầy đủ tại mỗi hành lang tầng.
- Nhận hàng/Shipper: Shipper giao hàng vui lòng để tại 'Kệ nhận hàng' ở sảnh tầng trệt. Nhà trọ không chịu trách nhiệm nếu mất đồ nếu không để đúng nơi quy định.
- Tìm bạn ở ghép: Nếu bạn có nhu cầu tìm bạn ở ghép, hãy báo với quản lý để được hỗ trợ đăng tin trên Group nội bộ của khu nhà.
- Tiện ích xung quanh: Cách chợ Linh Trung 300m, trạm xe buýt số 8 và 19 ngay đầu đường, có phòng Gym và VinMart cách 5 phút đi bộ.
- Vệ sinh máy lạnh: Máy lạnh được vệ sinh định kỳ 6 tháng/lần bởi chủ trọ. Nếu khách muốn vệ sinh thêm thì tự chịu phí.
- Phương thức thanh toán: Chấp nhận chuyển khoản ngân hàng, quét mã VietQR hoặc thanh toán trực tiếp qua ứng dụng Tenant Portal.
";

        public TelegramBotService(
            ILogger<TelegramBotService> logger,
            IConfiguration configuration,
            AppDbContext context,
            IHttpClientFactory httpClientFactory)
        {
            _logger = logger;
            _configuration = configuration;
            _context = context;
            _httpClient = httpClientFactory.CreateClient("Telegram");

            // Đọc từ .env hoặc appsettings
            LoadEnvFile();
            _botToken = Environment.GetEnvironmentVariable("TELEGRAM_BOT_TOKEN")
                        ?? _configuration["Telegram:BotToken"]
                        ?? "";
            _geminiKey = Environment.GetEnvironmentVariable("GEMINI_API_KEY")
                        ?? _configuration["Gemini:ApiKey"];
        }

        private void LoadEnvFile()
        {
            try
            {
                string envPath = Path.Combine(Directory.GetCurrentDirectory(), "Services", ".env");
                if (!File.Exists(envPath))
                    envPath = Path.Combine(Directory.GetCurrentDirectory(), ".env");

                if (File.Exists(envPath))
                {
                    foreach (var line in File.ReadAllLines(envPath))
                    {
                        if (string.IsNullOrWhiteSpace(line) || line.StartsWith("#")) continue;
                        var parts = line.Split('=', 2);
                        if (parts.Length == 2)
                            Environment.SetEnvironmentVariable(parts[0].Trim(), parts[1].Trim());
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError($"Lỗi đọc .env: {ex.Message}");
            }
        }

        public async Task HandleUpdateAsync(JsonElement update)
        {
            try
            {
                // Chỉ xử lý tin nhắn văn bản
                if (!update.TryGetProperty("message", out var message)) return;
                if (!message.TryGetProperty("text", out var textProp)) return;

                string userText = textProp.GetString() ?? "";
                long chatId = message.GetProperty("chat").GetProperty("id").GetInt64();
                string firstName = "";
                if (message.GetProperty("chat").TryGetProperty("first_name", out var firstNameProp))
                    firstName = firstNameProp.GetString() ?? "";

                _logger.LogInformation($"📩 [TELEGRAM] Tin nhắn từ {firstName} (chatId={chatId}): {userText}");

                // Xử lý lệnh đặc biệt
                if (userText.StartsWith("/start"))
                {
                    await SendMessageAsync(chatId, "👋 Chào mừng bạn đến với *Hệ thống Nhà Trọ Thông Minh*!\n\n" +
                                                   "🤖 Mình là trợ lý AI, sẵn sàng giải đáp mọi thắc mắc của bạn về tiền phòng, nội quy và dịch vụ.\n\n" +
                                                   "📱 *Dành cho khách đang thuê:* Vui lòng gõ **Số điện thoại** của bạn để liên kết nhận thông báo hóa đơn tự động qua Telegram.");
                    
                    await SendMessageAsync(chatId, "💡 *Các câu hỏi thường gặp:*\n\n❓ Wifi mật khẩu là gì?\n❓ Hóa đơn đóng ngày bao nhiêu?\n❓ Nội quy phòng trọ?\n❓ Giờ giấc ra vào?\n\nHãy gõ thẳng câu hỏi, mình sẽ trả lời ngay!");
                    return;
                }

                if (userText.StartsWith("/help"))
                {
                    await SendMessageAsync(chatId, "💡 *Các câu hỏi thường gặp:*\n\n❓ Wifi mật khẩu là gì?\n❓ Hóa đơn đóng ngày bao nhiêu?\n❓ Nội quy phòng trọ?\n❓ Giờ giấc ra vào?\n\nHãy gõ thẳng câu hỏi, mình sẽ trả lời ngay!");
                    return;
                }

                // Logic liên kết tài khoản khách thuê (nếu người dùng nhập số điện thoại)
                if (userText.Length == 10 && userText.All(char.IsDigit))
                {
                    var tenant = await _context.Tenants.FirstOrDefaultAsync(t => t.Phone == userText);
                    if (tenant != null)
                    {
                        tenant.TelegramChatId = chatId.ToString();
                        tenant.UpdatedAt = DateTime.UtcNow;
                        await _context.SaveChangesAsync();
                        await SendMessageAsync(chatId, $"✅ Xác nhận thành công! Chào bạn *{tenant.FullName}*, tài khoản của bạn đã được liên kết để nhận thông báo hóa đơn tự động.");
                        return;
                    }
                }

                // Gửi typing indicator
                await SendTypingAsync(chatId);

                // Lấy context từ DB (RAG)
                string aiResponse = await GetAIResponseAsync(userText, chatId);

                await SendMessageAsync(chatId, aiResponse);
            }
            catch (Exception ex)
            {
                _logger.LogError($"❌ [TELEGRAM] Lỗi xử lý update: {ex.Message}");
            }
        }

        private async Task<string> GetAIResponseAsync(string userMessage, long chatId)
        {
            // 1. Lấy kiến thức từ DB (RAG)
            var knowledges = await _context.ChatbotKnowledges.ToListAsync();
            string dbContext = string.Join("\n", knowledges.Select(k => $"- {k.Keyword}: {k.Answer}"));

            // 1.1 Lấy tình trạng phòng trống realtime
            var availableRooms = await _context.Rooms
                .Where(r => r.Status == RoomStatus.Available)
                .Select(r => r.RoomNumber)
                .ToListAsync();

            string roomContext = availableRooms.Any()
                ? $"\n- Tình trạng phòng trống: Hiện tại khu nhà trọ đang CÒN PHÒNG TRỐNG ({availableRooms.Count} phòng). Các phòng đang trống bao gồm: {string.Join(", ", availableRooms)}."
                : "\n- Tình trạng phòng trống: Toàn bộ phòng tại khu nhà trọ tạm thời đã kín (HẾT PHÒNG).";

            string fullContext = HardcodedContext + dbContext + roomContext;

            // 2. Gọi Gemini nếu có API key
            if (!string.IsNullOrEmpty(_geminiKey))
            {
                try
                {
                    string systemPrompt = $@"Bạn là quản lý AI của khu Nhà Trọ Thông Minh - đang chat qua Telegram.
HÃY TRẢ LỜI CHỈ DỰA VÀO CÁC THÔNG TIN (CONTEXT) DƯỚI ĐÂY:
{fullContext}
Quy tắc:
1. Trả lời ngắn gọn, thân thiện, xưng 'mình' gọi 'bạn'.
2. Dùng emoji phù hợp cho sinh động (tối đa 2-3 emoji/câu trả lời).
3. Nếu câu hỏi KHÔNG có trong Context, trả lời: 'Xin lỗi bạn, câu hỏi này nằm ngoài phạm vi mình được học. Mình sẽ ghi nhận để báo lại Ban Quản Lý nhé!' và không tự bịa thông tin.

Câu hỏi của khách thuê: {userMessage}";

                    var requestBody = new
                    {
                        contents = new[] { new { parts = new[] { new { text = systemPrompt } } } }
                    };
                    var jsonContent = new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json");
                    var response = await _httpClient.PostAsync($"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={_geminiKey}", jsonContent);

                    if (response.IsSuccessStatusCode)
                    {
                        var responseString = await response.Content.ReadAsStringAsync();
                        using var doc = JsonDocument.Parse(responseString);
                        var aiText = doc.RootElement.GetProperty("candidates")[0].GetProperty("content").GetProperty("parts")[0].GetProperty("text").GetString() ?? "";

                        // Lưu câu hỏi ngoài context vào DB để Admin dạy lại Bot
                        if (aiText.Contains("nằm ngoài phạm vi"))
                        {
                            _context.UnansweredQuestions.Add(new UnansweredQuestion { Question = userMessage });
                            await _context.SaveChangesAsync();
                        }

                        return aiText;
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning($"Gemini lỗi, fallback về keyword: {ex.Message}");
                }
            }

            // 3. Fallback: Keyword matching từ DB
            string msgLower = userMessage.ToLower();
            var matched = knowledges.FirstOrDefault(k => msgLower.Contains(k.Keyword.ToLower()));
            if (matched != null) return matched.Answer;

            // 4. Fallback cứng cuối cùng
            if (msgLower.Contains("hi") || msgLower.Contains("hello") || msgLower.Contains("chào") || msgLower.Contains("hey")) 
                return "👋 Chào bạn! Mình là trợ lý AI của Nhà Trọ Thông Minh. Bạn cần mình hỗ trợ thông tin gì về phòng trọ, giá cả hay nội quy không?";

            if (msgLower.Contains("cọc") || msgLower.Contains("đặt cọc")) return "💰 Tiền cọc: Quy định đặt cọc là 01 tháng tiền phòng. Bạn sẽ được hoàn lại 100% tiền cọc khi kết thúc hợp đồng thuê và thông báo trả phòng trước ít nhất 30 ngày.";
            if (msgLower.Contains("wifi") || msgLower.Contains("mạng")) return "📶 Mật khẩu Wifi: *ktx_smart_2026*. Nếu chậm hãy báo qua Tenant Portal nhé!";
            if (msgLower.Contains("hóa đơn") || msgLower.Contains("đóng tiền") || msgLower.Contains("thanh toán")) return "💳 Hóa đơn được chốt vào ngày 01 hàng tháng, hạn đóng từ mùng 01 đến mùng 05 qua VNPay/MoMo trên Tenant Portal.";
            if (msgLower.Contains("nội quy") || msgLower.Contains("quy định")) return "📋 Nội quy: Tự do giờ giấc (FaceID), không nuôi thú cưng, để xe đúng vạch, đóng tiền trước ngày 05.";
            if (msgLower.Contains("giá phòng") || msgLower.Contains("bao nhiêu tiền")) return "💰 Giá phòng: Dao động từ 3,000,000 VNĐ đến 4,500,000 VNĐ tùy diện tích và số lượng người ở (2-4 người).";
            if (msgLower.Contains("phòng trống") || msgLower.Contains("còn phòng"))
            {
                return availableRooms.Any()
                    ? $"🏠 Hiện tại khu nhà trọ đang CÒN TRỐNG {availableRooms.Count} phòng. Danh sách các phòng trống: {string.Join(", ", availableRooms)}. Khách có thể tạo tài khoản và gửi yêu cầu đăng ký thuê trực tiếp trên Tenant Portal!"
                    : "🏠 Toàn bộ phòng tại khu nhà trọ hiện tại đã kín (HẾT PHÒNG). Hẹn bạn dịp khác nhé!";
            }
            if (msgLower.Contains("giờ giấc") || msgLower.Contains("mấy giờ")) return "⏰ Giờ giấc: Tự do 24/7 (ra vào bằng hệ thống nhận diện khuôn mặt FaceID). Bạn hoàn toàn chủ động!";
            if (msgLower.Contains("chủ") || msgLower.Contains("quản lý") || msgLower.Contains("liên hệ")) return "📞 Thông tin liên hệ: Phạm Cao Chí Thành. Hotline/Zalo: 0704.569.016. Hãy liên hệ khi cần hỗ trợ nhé!";
            if (msgLower.Contains("xe") || msgLower.Contains("đăng ký xe")) return "🛵 Chỗ để xe: Bạn để xe dưới tầng hầm KTX và nhớ đỗ đúng vạch sơn phân chia nhé! Hãy báo với quản lý biển số xe khi nhận phòng.";
            if (msgLower.Contains("vệ sinh") || msgLower.Contains("rác")) return "🧹 Vệ sinh: Rác sinh hoạt vui lòng gom gọn gàng và mang xuống khu vực tập kết rác ở tầng hầm trước 21h hàng ngày.";
            if (msgLower.Contains("thú cưng") || msgLower.Contains("chó") || msgLower.Contains("mèo")) return "🚫 Quy định: Khu KTX nghiêm cấm hoàn toàn việc nuôi thú cưng (chó, mèo, chim...) để đảm bảo vệ sinh và không gian yên tĩnh.";
            if (msgLower.Contains("hút thuốc")) return "🚭 Nghiêm cấm: Không được phép hút thuốc lá/thuốc lá điện tử trong phòng và các khu vực sinh hoạt chung của KTX.";
            if (msgLower.Contains("địa chỉ") || msgLower.Contains("ở đâu")) return "📍 Địa chỉ nhà trọ: 123 Đường Số 1, Phường Linh Trung, TP. Thủ Đức. (Khu vực an ninh, yên tĩnh).";
            if (msgLower.Contains("khách") || msgLower.Contains("bạn bè")) return "👥 Khách đến chơi: Bạn bè/người thân đến chơi phải về trước 22h đêm. Trường hợp ở lại qua đêm bắt buộc phải khai báo tạm trú với Chủ trọ.";
            if (msgLower.Contains("coi phòng") || msgLower.Contains("xem phòng") || msgLower.Contains("hẹn")) return "📅 Đặt lịch xem phòng: Bạn có thể nhắn khung giờ mong muốn ngay tại đây hoặc liên hệ Hotline/Zalo Chủ trọ (0704.569.016) để chốt lịch nhanh nhất nhé. Giờ mở cửa xem phòng: 8h00 - 21h00 hàng ngày.";
            if (msgLower.Contains("giặt") || msgLower.Contains("máy giặt")) return "🧺 Giặt ủi: Có máy giặt/sấy tại tầng thượng. Phí là 20.000đ/lượt giặt. Bạn có thể lên đó giặt bất cứ lúc nào nhé!";
            if (msgLower.Contains("nấu ăn") || msgLower.Contains("bếp")) return "🍳 Nấu ăn: Bạn được nấu ăn bằng bếp từ/hồng ngoại trong phòng. Lưu ý KHÔNG dùng bếp gas để đảm bảo an toàn PCCC.";
            if (msgLower.Contains("đồ") || msgLower.Contains("nội thất") || msgLower.Contains("khoan")) return "🛋️ Nội thất: Bạn có thể mang thêm đồ cá nhân vào phòng. Tuy nhiên vui lòng KHÔNG khoan đục tường nhé!";
            if (msgLower.Contains("ồn") || msgLower.Contains("yên tĩnh") || msgLower.Contains("karaoke")) return "🤫 Yên tĩnh: Sau 23h đêm, vui lòng không làm ồn để mọi người cùng nghỉ ngơi bạn nhé.";
            if (msgLower.Contains("cháy") || msgLower.Contains("bình chữa cháy") || msgLower.Contains("pccc")) return "🔥 PCCC: Mỗi tầng đều có trang bị bình chữa cháy và hệ thống báo cháy tự động. Bạn yên tâm nhé!";
            if (msgLower.Contains("shipper") || msgLower.Contains("nhận hàng") || msgLower.Contains("đồ")) return "📦 Nhận hàng: Bạn dặn Shipper để đồ tại kệ nhận hàng ở sảnh tầng trệt nhé. Nhớ ghi rõ số phòng để tránh nhầm lẫn!";
            if (msgLower.Contains("ở ghép") || msgLower.Contains("tìm bạn")) return "🤝 Ở ghép: Chủ trọ sẽ hỗ trợ bạn đăng tin tìm bạn ở ghép trên nhóm Zalo nội bộ của khu nhà nhé.";
            if (msgLower.Contains("chợ") || msgLower.Contains("gym") || msgLower.Contains("siêu thị") || msgLower.Contains("xung quanh")) return "🏢 Tiện ích: Gần khu nhà có chợ Linh Trung, VinMart, phòng Gym và trạm xe buýt. Rất thuận tiện cho việc ăn uống và đi lại!";
            if (msgLower.Contains("máy lạnh") || msgLower.Contains("vệ sinh")) return "❄️ Máy lạnh: Chủ trọ sẽ vệ sinh máy lạnh miễn phí 6 tháng/lần. Nếu máy có vấn đề gì bạn cứ báo qua Portal nhé!";
            if (msgLower.Contains("chuyển khoản") || msgLower.Contains("thanh toán") || msgLower.Contains("ngân hàng")) return "💳 Thanh toán: Bạn có thể quét mã QR, chuyển khoản hoặc đóng qua MoMo/VNPay trên Tenant Portal nhé.";

            // Lưu câu hỏi không biết
            _context.UnansweredQuestions.Add(new UnansweredQuestion { Question = userMessage });
            await _context.SaveChangesAsync();
            return "Xin lỗi, mình chưa được học câu hỏi này. Mình đã ghi nhận và sẽ báo lại Ban Quản Lý để bổ sung thêm kiến thức! 🙏";
        }

        public async Task SendMessageAsync(long chatId, string text)
        {
            if (string.IsNullOrEmpty(_botToken)) return;
            try
            {
                var payload = new { chat_id = chatId, text, parse_mode = "Markdown" };
                var content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
                await _httpClient.PostAsync($"https://api.telegram.org/bot{_botToken}/sendMessage", content);
                _logger.LogInformation($"✅ [TELEGRAM] Đã gửi trả lời tới chatId={chatId}");
            }
            catch (Exception ex)
            {
                _logger.LogError($"❌ [TELEGRAM] Lỗi gửi message: {ex.Message}");
            }
        }

        public async Task SendAdminNotificationAsync(string text)
        {
            string chatIdStr = Environment.GetEnvironmentVariable("TELEGRAM_CHAT_ID") ?? "";
            if (long.TryParse(chatIdStr, out long adminChatId) && adminChatId != 0)
            {
                await SendMessageAsync(adminChatId, text);
            }
        }

        private async Task SendTypingAsync(long chatId)
        {
            if (string.IsNullOrEmpty(_botToken)) return;
            try
            {
                var payload = new { chat_id = chatId, action = "typing" };
                var content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
                await _httpClient.PostAsync($"https://api.telegram.org/bot{_botToken}/sendChatAction", content);
            }
            catch { }
        }
    }
}
