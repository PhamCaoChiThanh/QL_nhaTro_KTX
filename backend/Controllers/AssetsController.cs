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
    public class AssetsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public AssetsController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Asset>>> GetAssets([FromQuery] int? roomId)
        {
            var query = _context.Assets.Include(a => a.Room).AsQueryable();
            if (roomId.HasValue)
            {
                query = query.Where(a => a.RoomId == roomId.Value);
            }
            return await query.ToListAsync();
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<Asset>> GetAsset(int id)
        {
            var asset = await _context.Assets.Include(a => a.Room).FirstOrDefaultAsync(a => a.Id == id);
            if (asset == null) return NotFound();
            return asset;
        }

        [HttpPost]
        public async Task<ActionResult<Asset>> PostAsset(Asset asset)
        {
            _context.Assets.Add(asset);
            await _context.SaveChangesAsync();
            return CreatedAtAction("GetAsset", new { id = asset.Id }, asset);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> PutAsset(int id, Asset asset)
        {
            if (id != asset.Id) return BadRequest();
            _context.Entry(asset).State = EntityState.Modified;
            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteAsset(int id)
        {
            var asset = await _context.Assets.FindAsync(id);
            if (asset == null) return NotFound();
            _context.Assets.Remove(asset);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}
