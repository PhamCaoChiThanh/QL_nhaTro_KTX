using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QL_nhaTro_KTX.Backend.Data;
using QL_nhaTro_KTX.Backend.Models;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace QL_nhaTro_KTX.Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize] // Phải đăng nhập mới được xài AI
    public class AIChatbotController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IConfiguration _configuration;

        public AIChatbotController(AppDbContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
        }

        public class ChatRequest { public string Message { get; set; } }

        public class TeachBotRequest
        {
            public int UnansweredQuestionId { get; set; }
            public string Keyword { get; set; }
            public string Answer { get; set; }
        }

        [HttpPost("ask")]
        [AllowAnonymous] // Cho phép Khách vãng lai xài AI Chatbot
        public async Task<IActionResult> AskAI([FromBody] ChatRequest req)
        {
            string aiResponse = "";
            string userMsg = req.Message.ToLower();
            
            // 1. Lấy toàn bộ kiến thức từ DB để làm Context (RAG)
            var knowledges = await _context.ChatbotKnowledges.ToListAsync();
            string dbContextInfo = string.Join("\n", knowledges.Select(k => $"- {k.Keyword}: {k.Answer}"));

            // Kiến thức cứng mặc định
            string hardcodedContext = @"
- Nội quy: Tự do giờ giấc (24/7) dùng FaceID, không nuôi thú cưng, để xe đúng vạch dưới hầm.
- Wifi: Mật khẩu là ktx_smart_2026.
- Hóa đơn: Chốt ngày 01, hạn đóng ngày 05 hàng tháng qua VNPay/MoMo.
";
            string fullContext = hardcodedContext + dbContextInfo;

            // 2. Gọi Gemini AI nếu có cấu hình Key
            string? geminiKey = _configuration["Gemini:ApiKey"];
            if (!string.IsNullOrEmpty(geminiKey))
            {
                try
                {
                    using var httpClient = new System.Net.Http.HttpClient();
                    
                    string systemPrompt = $@"Bạn là quản lý AI của khu KTX SmartDorm. 
HÃY TRẢ LỜI CÂU HỎI CỦA SINH VIÊN CHỈ DỰA VÀO CÁC THÔNG TIN (CONTEXT) DƯỚI ĐÂY:
{fullContext}
Quy tắc:
1. Trả lời ngắn gọn, thân thiện, xưng 'mình' gọi 'bạn', dưới 60 từ.
2. Nếu sinh viên hỏi nội dung KHÔNG CÓ trong Context, BẮT BUỘC trả lời: 'Xin lỗi, câu hỏi này nằm ngoài phạm vi kiến thức của mình. Mình đã ghi nhận lại để báo Cán bộ quản lý bổ sung thêm!' và tuyệt đối không tự bịa ra thông tin.

Câu hỏi của sinh viên: {req.Message}";

                    var requestBody = new
                    {
                        contents = new[] { new { parts = new[] { new { text = systemPrompt } } } }
                    };
                    
                    var jsonContent = new System.Net.Http.StringContent(System.Text.Json.JsonSerializer.Serialize(requestBody), System.Text.Encoding.UTF8, "application/json");
                    var response = await httpClient.PostAsync($"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={geminiKey}", jsonContent);
                    
                    if (response.IsSuccessStatusCode)
                    {
                        var responseString = await response.Content.ReadAsStringAsync();
                        using var doc = System.Text.Json.JsonDocument.Parse(responseString!);
                        aiResponse = doc.RootElement.GetProperty("candidates")[0].GetProperty("content").GetProperty("parts")[0].GetProperty("text").GetString() ?? "";
                        
                        // Kiểm tra nếu bot trả lời câu từ chối (out of context) thì lưu vào db tự học
                        if (aiResponse.Contains("nằm ngoài phạm vi kiến thức") || aiResponse.Contains("chưa được học"))
                        {
                            var tenantIdClaim = User.Claims.FirstOrDefault(c => c.Type == "TenantId")?.Value;
                            int? tenantId = tenantIdClaim != null ? int.Parse(tenantIdClaim) : null;
                            _context.UnansweredQuestions.Add(new UnansweredQuestion { Question = req.Message, AskedByTenantId = tenantId });
                            await _context.SaveChangesAsync();
                        }

                        return Ok(new { Answer = aiResponse });
                    }
                }
                catch (System.Exception) { /* Lỗi mạng thì fallback xuống logic tự cấu hình */ }
            }

            // FALLBACK: Gemini không khả dụng -> dùng local keyword matching
            var matchedKnowledge = knowledges.FirstOrDefault(k =>
                userMsg.Contains(k.Keyword.ToLower()));

            if (matchedKnowledge != null)
            {
                aiResponse = matchedKnowledge.Answer;
            }
            else
            {
                // Fallback cứng (kiến thức nền tảng)
                if (userMsg.Contains("nội quy") || userMsg.Contains("quy định"))
                    aiResponse = "📜 BẢNG NỘI QUY SMART DORM:\n1. Tự do giờ giấc (24/7), ra vào bằng FaceID.\n2. Tuyệt đối không nuôi thú cưng.\n3. Thanh toán hóa đơn trước ngày 05 hàng tháng.\n4. Để xe đúng vạch quy định dưới hầm.";
                else if (userMsg.Contains("wifi") || userMsg.Contains("mạng"))
                    aiResponse = "Mật khẩu Wifi: ktx_smart_2026. Nếu mạng chậm hãy báo sự cố qua Tenant Portal nhé!";
                else if (userMsg.Contains("hóa đơn") || userMsg.Contains("đóng tiền"))
                    aiResponse = "Hóa đơn chốt tự động ngày 01 hàng tháng, hạn đóng ngày 05 qua VNPay/MoMo.";
                else
                {
                    aiResponse = "Xin lỗi, câu hỏi này mình chưa được học. Mình đã ghi chú lại để Ban Quản Lý bổ sung. Cảm ơn bạn!";
                    var tenantIdClaim = User.Claims.FirstOrDefault(c => c.Type == "TenantId")?.Value;
                    int? tenantId = tenantIdClaim != null ? int.Parse(tenantIdClaim) : null;
                    _context.UnansweredQuestions.Add(new UnansweredQuestion { Question = req.Message, AskedByTenantId = tenantId });
                    await _context.SaveChangesAsync();
                }
            }

            await Task.Delay(500);
            return Ok(new { Answer = aiResponse });
        }

        // API DÀNH RIÊNG CHO ADMIN ĐỂ "DẠY" BOT
        [HttpPost("teach")]
        [Authorize(Roles = "Admin,Staff")]
        public async Task<IActionResult> TeachBot([FromBody] TeachBotRequest req)
        {
            // Thêm kiến thức mới vào não Bot
            var newKnowledge = new ChatbotKnowledge
            {
                Keyword = req.Keyword.ToLower(),
                Answer = req.Answer
            };
            _context.ChatbotKnowledges.Add(newKnowledge);

            // Đánh dấu câu hỏi của khách hàng là đã được giải quyết
            var question = await _context.UnansweredQuestions.FindAsync(req.UnansweredQuestionId);
            if (question != null)
            {
                question.IsResolved = true;
            }

            await _context.SaveChangesAsync();
            return Ok(new { Message = "Đã dạy Bot kiến thức mới thành công!" });
        }

        // API Lấy danh sách các câu hỏi Bot bị "bí"
        [HttpGet("unanswered")]
        [Authorize(Roles = "Admin,Staff")]
        public async Task<IActionResult> GetUnansweredQuestions()
        {
            var questions = await _context.UnansweredQuestions
                .Where(q => !q.IsResolved)
                .OrderByDescending(q => q.AskedAt)
                .ToListAsync();
            return Ok(questions);
        }
    }
}
