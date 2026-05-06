using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QL_nhaTro_KTX.Backend.Data;
using QL_nhaTro_KTX.Backend.Models;

namespace QL_nhaTro_KTX.Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "Admin,Staff")]
    public class UtilitiesController : ControllerBase
    {
        private readonly AppDbContext _context;

        public UtilitiesController(AppDbContext context)
        {
            _context = context;
        }

        public class ReadingDto
        {
            public int RoomId { get; set; }
            public string RoomNumber { get; set; }
            public int OldIndex { get; set; }
            public int? NewIndex { get; set; }
        }

        [HttpGet("readings")]
        public async Task<IActionResult> GetReadings([FromQuery] string type, [FromQuery] int month, [FromQuery] int year)
        {
            var rooms = await _context.Rooms.ToListAsync();
            var result = new List<ReadingDto>();

            foreach (var room in rooms)
            {
                int oldIndex = 0;
                int? newIndex = null;

                if (type == "Electric")
                {
                    // Lấy chỉ số mới của tháng trước làm chỉ số cũ tháng này
                    var prevMonth = month == 1 ? 12 : month - 1;
                    var prevYear = month == 1 ? year - 1 : year;
                    
                    var lastReading = await _context.ElectricUsages
                        .Where(u => u.RoomId == room.Id && u.BillingMonth == prevMonth && u.BillingYear == prevYear)
                        .FirstOrDefaultAsync();
                    
                    oldIndex = lastReading?.NewIndex ?? 0;

                    // Kiểm tra xem tháng này đã chốt chưa
                    var currentReading = await _context.ElectricUsages
                        .Where(u => u.RoomId == room.Id && u.BillingMonth == month && u.BillingYear == year)
                        .FirstOrDefaultAsync();
                    
                    newIndex = currentReading?.NewIndex;
                }
                else
                {
                    var prevMonth = month == 1 ? 12 : month - 1;
                    var prevYear = month == 1 ? year - 1 : year;
                    
                    var lastReading = await _context.WaterUsages
                        .Where(u => u.RoomId == room.Id && u.BillingMonth == prevMonth && u.BillingYear == prevYear)
                        .FirstOrDefaultAsync();
                    
                    oldIndex = lastReading?.NewIndex ?? 0;

                    var currentReading = await _context.WaterUsages
                        .Where(u => u.RoomId == room.Id && u.BillingMonth == month && u.BillingYear == year)
                        .FirstOrDefaultAsync();
                    
                    newIndex = currentReading?.NewIndex;
                }

                result.Add(new ReadingDto
                {
                    RoomId = room.Id,
                    RoomNumber = room.RoomNumber,
                    OldIndex = oldIndex,
                    NewIndex = newIndex
                });
            }

            return Ok(result);
        }

        public class SaveBatchDto
        {
            public string Type { get; set; }
            public int Month { get; set; }
            public int Year { get; set; }
            public List<ReadingDto> Readings { get; set; }
        }

        [HttpPost("save-batch")]
        public async Task<IActionResult> SaveBatch([FromBody] SaveBatchDto dto)
        {
            foreach (var r in dto.Readings)
            {
                if (r.NewIndex == null) continue;

                if (dto.Type == "Electric")
                {
                    var usage = await _context.ElectricUsages
                        .FirstOrDefaultAsync(u => u.RoomId == r.RoomId && u.BillingMonth == dto.Month && u.BillingYear == dto.Year);
                    
                    if (usage == null)
                    {
                        usage = new ElectricUsage
                        {
                            RoomId = r.RoomId,
                            BillingMonth = dto.Month,
                            BillingYear = dto.Year,
                            OldIndex = r.OldIndex,
                            NewIndex = r.NewIndex.Value
                        };
                        _context.ElectricUsages.Add(usage);
                    }
                    else
                    {
                        usage.NewIndex = r.NewIndex.Value;
                    }
                }
                else
                {
                    var usage = await _context.WaterUsages
                        .FirstOrDefaultAsync(u => u.RoomId == r.RoomId && u.BillingMonth == dto.Month && u.BillingYear == dto.Year);
                    
                    if (usage == null)
                    {
                        usage = new WaterUsage
                        {
                            RoomId = r.RoomId,
                            BillingMonth = dto.Month,
                            BillingYear = dto.Year,
                            OldIndex = r.OldIndex,
                            NewIndex = r.NewIndex.Value
                        };
                        _context.WaterUsages.Add(usage);
                    }
                    else
                    {
                        usage.NewIndex = r.NewIndex.Value;
                    }
                }
            }

            await _context.SaveChangesAsync();
            return Ok(new { message = "Đã lưu chỉ số thành công!" });
        }
    }
}
