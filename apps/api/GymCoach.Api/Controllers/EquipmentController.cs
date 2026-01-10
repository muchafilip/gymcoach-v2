using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using GymCoach.Api.Data;
using GymCoach.Api.Models;
using GymCoach.Api.Extensions;

namespace GymCoach.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class EquipmentController : ControllerBase
{
    private readonly GymCoachDbContext _context;

    public EquipmentController(GymCoachDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// Get all equipment types (public - no auth needed)
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Equipment>>> GetAll()
    {
        return await _context.Equipment.ToListAsync();
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<Equipment>> Get(int id)
    {
        var equipment = await _context.Equipment.FindAsync(id);
        if (equipment == null) return NotFound();
        return equipment;
    }

    [HttpPost]
    [Authorize]
    public async Task<ActionResult<Equipment>> Create(Equipment equipment)
    {
        _context.Equipment.Add(equipment);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(Get), new { id = equipment.Id }, equipment);
    }

    [HttpPut("{id:int}")]
    [Authorize]
    public async Task<IActionResult> Update(int id, Equipment equipment)
    {
        if (id != equipment.Id) return BadRequest();

        _context.Entry(equipment).State = EntityState.Modified;
        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    [Authorize]
    public async Task<IActionResult> Delete(int id)
    {
        var equipment = await _context.Equipment.FindAsync(id);
        if (equipment == null) return NotFound();

        _context.Equipment.Remove(equipment);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    /// <summary>
    /// Get current user's equipment IDs
    /// </summary>
    [HttpGet("me")]
    [Authorize]
    public async Task<ActionResult<List<int>>> GetMyEquipment()
    {
        var userId = this.GetUserId();
        var equipmentIds = await _context.Set<UserEquipment>()
            .Where(ue => ue.UserId == userId)
            .Select(ue => ue.EquipmentId)
            .ToListAsync();

        return equipmentIds;
    }

    /// <summary>
    /// Save current user's equipment selection (replaces all)
    /// </summary>
    [HttpPut("me")]
    [Authorize]
    public async Task<IActionResult> SaveMyEquipment([FromBody] SaveUserEquipmentRequest request)
    {
        var userId = this.GetUserId();

        // Remove existing equipment
        var existing = await _context.Set<UserEquipment>()
            .Where(ue => ue.UserId == userId)
            .ToListAsync();
        _context.RemoveRange(existing);

        // Add new equipment
        foreach (var equipmentId in request.EquipmentIds)
        {
            _context.Add(new UserEquipment
            {
                UserId = userId,
                EquipmentId = equipmentId
            });
        }

        await _context.SaveChangesAsync();
        return NoContent();
    }
}

public class SaveUserEquipmentRequest
{
    public List<int> EquipmentIds { get; set; } = [];
}
