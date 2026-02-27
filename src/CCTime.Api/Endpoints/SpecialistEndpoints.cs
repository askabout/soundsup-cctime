using CCTime.Api.Models;
using CCTime.Domain.Entities;
using CCTime.Infrastructure.Data;
using FluentValidation;
using Microsoft.EntityFrameworkCore;

namespace CCTime.Api.Endpoints;

public static class SpecialistEndpoints
{
    public static void MapSpecialistEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapPost("/api/specialists", async (AppDbContext db) =>
        {
            var specialists = await db.Specialists
                .OrderBy(s => s.OrderIndex)
                .Select(s => new SpecialistItem(s.Id, s.Name, s.OrderIndex, s.IsArchived))
                .ToListAsync();

            return Results.Ok(new GetSpecialistsResult(specialists));
        });

        app.MapPost("/api/specialists/save", async (
            SaveSpecialistCommand command,
            IValidator<SaveSpecialistCommand> validator,
            AppDbContext db) =>
        {
            var validation = await validator.ValidateAsync(command);
            if (!validation.IsValid)
            {
                var errors = validation.Errors
                    .Select(e => new ErrorDto("VALIDATION", e.ErrorMessage))
                    .ToList();
                return Results.Ok(new SaveSpecialistResult(command.Id, errors));
            }

            var isEdit = command.Id.HasValue;

            if (isEdit)
            {
                var specialist = await db.Specialists.FindAsync(command.Id.Value);
                if (specialist == null)
                    return Results.Ok(new SaveSpecialistResult(command.Id, new List<ErrorDto>
                    {
                        new("NOT_FOUND", "Специалист не найден")
                    }));

                specialist.Name = command.Name;
                specialist.OrderIndex = command.OrderIndex;
                specialist.IsArchived = command.IsArchived;

                await db.SaveChangesAsync();
                return Results.Ok(new SaveSpecialistResult(specialist.Id, new List<ErrorDto>()));
            }
            else
            {
                var specialist = new Specialist
                {
                    Id = Guid.NewGuid(),
                    Name = command.Name,
                    OrderIndex = command.OrderIndex,
                    IsArchived = command.IsArchived
                };

                db.Specialists.Add(specialist);
                await db.SaveChangesAsync();
                return Results.Ok(new SaveSpecialistResult(specialist.Id, new List<ErrorDto>()));
            }
        });
    }
}
