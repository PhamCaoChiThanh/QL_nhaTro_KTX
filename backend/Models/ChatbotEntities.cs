using System;
using System.ComponentModel.DataAnnotations;

namespace QL_nhaTro_KTX.Backend.Models
{
    public class ChatbotKnowledge
    {
        [Key]
        public int Id { get; set; }
        
        [Required]
        public string Keyword { get; set; } // Ví dụ: "wifi", "nuôi thú", "để xe"
        
        [Required]
        public string Answer { get; set; }
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    public class UnansweredQuestion
    {
        [Key]
        public int Id { get; set; }
        
        [Required]
        public string Question { get; set; }
        
        public int? AskedByTenantId { get; set; }
        
        public bool IsResolved { get; set; } = false; // Đã được Admin dạy cho Bot chưa
        
        public DateTime AskedAt { get; set; } = DateTime.UtcNow;
    }
}
