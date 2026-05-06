using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QL_nhaTro_KTX.Backend.Data;
using QL_nhaTro_KTX.Backend.Models;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace QL_nhaTro_KTX.Backend.Controllers
{
    public class RoomUpdateDto
    {
        public decimal BasePrice { get; set; }
        public RoomStatus Status { get; set; }
        public decimal GarbageFee { get; set; }
        public decimal ElectricityPrice { get; set; }
        public decimal WaterPrice { get; set; }
    }

    [Route("api/[controller]")]
    [ApiController]
    public class RoomsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public RoomsController(AppDbContext context)
        {
            _context = context;
        }

        // GET: api/Rooms
        [HttpGet]
        public async Task<ActionResult<IEnumerable<object>>> GetRooms()
        {
            var rooms = await _context.Rooms
                .Include(r => r.Contracts)
                    .ThenInclude(c => c.Tenant)
                .ToListAsync();

            return rooms.Select(r => new {
                r.Id,
                r.RoomNumber,
                r.Capacity,
                r.Status,
                r.BasePrice,
                r.GarbageFee,
                r.ElectricityPrice,
                r.WaterPrice,
                r.CreatedAt,
                r.UpdatedAt,
                Tenant = r.Contracts
                    .Where(c => c.Status == ContractStatus.Active)
                    .Select(c => new {
                        c.Tenant.Id,
                        c.Tenant.FullName,
                        c.Tenant.Phone,
                        c.Tenant.Email,
                        c.Tenant.Cccd
                    })
                    .FirstOrDefault()
            }).ToList();
        }

        // GET: api/Rooms/5
        [HttpGet("{id}")]
        public async Task<ActionResult<Room>> GetRoom(int id)
        {
            var room = await _context.Rooms.FindAsync(id);

            if (room == null)
            {
                return NotFound();
            }

            return room;
        }

        // PUT: api/Rooms/5
        [HttpPut("{id}")]
        public async Task<IActionResult> PutRoom(int id, RoomUpdateDto roomUpdate)
        {
            var room = await _context.Rooms.FindAsync(id);
            if (room == null) return NotFound();

            room.BasePrice = roomUpdate.BasePrice;
            room.Status = roomUpdate.Status;
            room.GarbageFee = roomUpdate.GarbageFee;
            room.ElectricityPrice = roomUpdate.ElectricityPrice;
            room.WaterPrice = roomUpdate.WaterPrice;
            room.UpdatedAt = System.DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return NoContent();
        }

        // POST: api/Rooms
        [HttpPost]
        public async Task<ActionResult<Room>> PostRoom(Room room)
        {
            _context.Rooms.Add(room);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetRoom), new { id = room.Id }, room);
        }

        // DELETE: api/Rooms/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteRoom(int id)
        {
            var room = await _context.Rooms
                .Include(r => r.Contracts)
                .FirstOrDefaultAsync(r => r.Id == id);
                
            if (room == null)
            {
                return NotFound();
            }

            if (room.Status == RoomStatus.Rented || room.Contracts.Any(c => c.Status == ContractStatus.Active))
            {
                return BadRequest("Không thể xóa phòng đang có người thuê.");
            }

            _context.Rooms.Remove(room);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        private bool RoomExists(int id)
        {
            return _context.Rooms.Any(e => e.Id == id);
        }
    }
}
