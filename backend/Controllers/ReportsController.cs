using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QL_nhaTro_KTX.Backend.Data;
using QL_nhaTro_KTX.Backend.Models;

namespace QL_nhaTro_KTX.Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "Admin,Accountant")]
    public class ReportsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public ReportsController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet("revenue")]
        public async Task<IActionResult> GetRevenueReport()
        {
            var payments = await _context.Payments
                .GroupBy(p => new { p.PaymentDate.Year, p.PaymentDate.Month })
                .Select(g => new {
                    Year = g.Key.Year,
                    Month = g.Key.Month,
                    Total = g.Sum(p => p.Amount)
                })
                .OrderBy(g => g.Year).ThenBy(g => g.Month)
                .ToListAsync();

            return Ok(payments);
        }

        [HttpGet("utility-leakage")]
        public async Task<IActionResult> GetUtilityLeakageReport()
        {
            var buildingReadings = await _context.BuildingMeterReadings.ToListAsync();
            var results = new List<object>();

            foreach (var br in buildingReadings)
            {
                // Tổng điện nước thu được từ các phòng trong tháng đó
                var roomReadings = await _context.Invoices
                    .Where(i => i.BillingMonth == br.Month && i.BillingYear == br.Year)
                    .Select(i => new { i.ElectricityUsage, i.WaterUsage })
                    .ToListAsync();

                int totalRoomElec = roomReadings.Sum(r => r.ElectricityUsage);
                int totalRoomWater = roomReadings.Sum(r => r.WaterUsage);

                results.Add(new {
                    Month = br.Month,
                    Year = br.Year,
                    BuildingElec = br.ElectricityTotal,
                    RoomSumElec = totalRoomElec,
                    ElecLeak = br.ElectricityTotal - totalRoomElec,
                    BuildingWater = br.WaterTotal,
                    RoomSumWater = totalRoomWater,
                    WaterLeak = br.WaterTotal - totalRoomWater
                });
            }

            return Ok(results);
        }

        [HttpPost("building-meter")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> PostBuildingMeter(BuildingMeterReading reading)
        {
            _context.BuildingMeterReadings.Add(reading);
            await _context.SaveChangesAsync();
            return Ok(reading);
        }
    }
}
