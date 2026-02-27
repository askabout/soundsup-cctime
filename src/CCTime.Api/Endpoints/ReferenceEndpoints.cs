using CCTime.Api.Models;
using CCTime.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace CCTime.Api.Endpoints;

public static class ReferenceEndpoints
{
    public static void MapReferenceEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapPost("/api/references", async (AppDbContext db) =>
        {
            var specialists = await db.Specialists
                .OrderBy(s => s.OrderIndex)
                .Select(s => new ReferenceItem(s.Id, s.Name, s.OrderIndex))
                .ToListAsync();

            var clients = await db.Clients
                .OrderBy(c => c.OrderIndex)
                .Select(c => new ReferenceItem(c.Id, c.Name, c.OrderIndex))
                .ToListAsync();

            var rooms = await db.Rooms
                .OrderBy(r => r.OrderIndex)
                .Select(r => new ReferenceItem(r.Id, r.Name, r.OrderIndex))
                .ToListAsync();

            var timeSlots = await db.TimeSlots
                .OrderBy(t => t.OrderIndex)
                .Select(t => new TimeSlotItem(t.Id, t.Name, t.Type, t.OrderIndex))
                .ToListAsync();

            return Results.Ok(new GetReferencesResult(specialists, clients, rooms, timeSlots));
        });
    }
}
