using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QL_nhaTro_KTX.Backend.Data;
using QL_nhaTro_KTX.Backend.Models;
using System.Text.Json;

namespace QL_nhaTro_KTX.Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "Admin,Staff")]
    public class HandoverRecordsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public HandoverRecordsController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet("contract/{contractId}")]
        public async Task<ActionResult<IEnumerable<HandoverRecord>>> GetByContract(int contractId)
        {
            return await _context.HandoverRecords
                .Where(h => h.ContractId == contractId)
                .OrderByDescending(h => h.HandoverDate)
                .ToListAsync();
        }

        [HttpPost]
        public async Task<ActionResult<HandoverRecord>> PostHandoverRecord(HandoverRecord record)
        {
            // Kiểm tra hợp đồng tồn tại
            var contract = await _context.Contracts.FindAsync(record.ContractId);
            if (contract == null) return NotFound("Hợp đồng không tồn tại.");

            _context.HandoverRecords.Add(record);
            await _context.SaveChangesAsync();
            return CreatedAtAction("GetByContract", new { contractId = record.ContractId }, record);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteHandoverRecord(int id)
        {
            var record = await _context.HandoverRecords.FindAsync(id);
            if (record == null) return NotFound();
            _context.HandoverRecords.Remove(record);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}
