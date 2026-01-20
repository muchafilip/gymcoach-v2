using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using GymCoach.Api.Data;
using GymCoach.Api.Models;

namespace GymCoach.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class MuscleGroupsController : ControllerBase
{
    private readonly GymCoachDbContext _context;

    public MuscleGroupsController(GymCoachDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<MuscleGroup>>> GetAll()
    {
        return await _context.MuscleGroups.ToListAsync();
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<MuscleGroup>> Get(int id)
    {
        var muscleGroup = await _context.MuscleGroups.FindAsync(id);
        if (muscleGroup == null) return NotFound();
        return muscleGroup;
    }

    [Authorize]
    [HttpPost]
    public async Task<ActionResult<MuscleGroup>> Create(MuscleGroup muscleGroup)
    {
        _context.MuscleGroups.Add(muscleGroup);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(Get), new { id = muscleGroup.Id }, muscleGroup);
    }

    [Authorize]
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, MuscleGroup muscleGroup)
    {
        if (id != muscleGroup.Id) return BadRequest();

        _context.Entry(muscleGroup).State = EntityState.Modified;
        await _context.SaveChangesAsync();
        return NoContent();
    }

    [Authorize]
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var muscleGroup = await _context.MuscleGroups.FindAsync(id);
        if (muscleGroup == null) return NotFound();

        _context.MuscleGroups.Remove(muscleGroup);
        await _context.SaveChangesAsync();
        return NoContent();
    }
}
