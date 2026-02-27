using CCTime.Api.Models;
using CCTime.Domain.Entities;
using CCTime.Infrastructure.Data;
using FluentValidation;
using Microsoft.EntityFrameworkCore;

namespace CCTime.Api.Endpoints;

public static class ReserveEndpoints
{
    public static void MapReserveEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapPost("/api/reserves/for-date", async (GetReservesForDateQuery query, AppDbContext db) =>
        {
            if (!DateOnly.TryParse(query.Date, out var date))
                return Results.BadRequest(new { error = "Неверный формат даты" });

            var reserves = await db.Reserves
                .Where(r => r.Date == date)
                .Select(r => new ReserveDto(
                    r.Id,
                    r.Date.ToString("yyyy-MM-dd"),
                    r.TimeSlotId,
                    r.RoomId,
                    r.ClientId,
                    r.ClientConfirmed,
                    r.SpecialistId,
                    r.SpecialistConfirmed
                ))
                .ToListAsync();

            return Results.Ok(new GetReservesForDateResult(reserves));
        });

        app.MapPost("/api/reserves/save", async (
            SaveReserveCommand command,
            IValidator<SaveReserveCommand> validator,
            AppDbContext db) =>
        {
            var validation = await validator.ValidateAsync(command);
            if (!validation.IsValid)
            {
                var errors = validation.Errors
                    .Select(e => new ErrorDto("VALIDATION", e.ErrorMessage))
                    .ToList();
                return Results.Ok(new SaveReserveResult(command.Id, errors));
            }

            var date = DateOnly.Parse(command.Date);
            var isEdit = command.Id.HasValue;

            await using var transaction = await db.Database.BeginTransactionAsync();
            try
            {
                // 1. Create or update main reserve
                Reserve mainReserve;
                if (isEdit)
                {
                    mainReserve = await db.Reserves.FirstOrDefaultAsync(r => r.Id == command.Id!.Value)
                        ?? throw new InvalidOperationException("Резерв не найден");

                    mainReserve.ClientId = command.ClientId;
                    mainReserve.SpecialistId = command.SpecialistId;
                    mainReserve.ClientConfirmed = command.ClientConfirmed;
                    mainReserve.SpecialistConfirmed = command.SpecialistConfirmed;
                }
                else
                {
                    // Check unique constraint before insert
                    var existing = await db.Reserves.FirstOrDefaultAsync(r =>
                        r.Date == date && r.TimeSlotId == command.TimeSlotId && r.RoomId == command.RoomId);

                    if (existing != null)
                    {
                        // Update existing instead of inserting duplicate
                        existing.ClientId = command.ClientId;
                        existing.SpecialistId = command.SpecialistId;
                        existing.ClientConfirmed = command.ClientConfirmed;
                        existing.SpecialistConfirmed = command.SpecialistConfirmed;
                        mainReserve = existing;
                    }
                    else
                    {
                        mainReserve = new Reserve
                        {
                            Id = Guid.NewGuid(),
                            Date = date,
                            TimeSlotId = command.TimeSlotId,
                            RoomId = command.RoomId,
                            ClientId = command.ClientId,
                            SpecialistId = command.SpecialistId,
                            ClientConfirmed = command.ClientConfirmed,
                            SpecialistConfirmed = command.SpecialistConfirmed
                        };
                        db.Reserves.Add(mainReserve);
                    }
                }

                // 2. Replicate specialist to future weeks
                if (command.SpecialistRepeats > 1 && command.SpecialistId != Guid.Empty)
                {
                    for (int w = 1; w < command.SpecialistRepeats; w++)
                    {
                        var futureDate = date.AddDays(w * 7);
                        var futureReserve = await db.Reserves.FirstOrDefaultAsync(r =>
                            r.Date == futureDate && r.TimeSlotId == command.TimeSlotId && r.RoomId == command.RoomId);

                        if (futureReserve != null)
                        {
                            // Conflict check: different specialist already assigned
                            if (futureReserve.SpecialistId != command.SpecialistId && futureReserve.SpecialistId != Guid.Empty)
                            {
                                var conflictSpec = await db.Specialists.FindAsync(futureReserve.SpecialistId);
                                var conflictName = conflictSpec?.Name ?? "неизвестный";
                                await transaction.RollbackAsync();
                                return Results.Ok(new SaveReserveResult(
                                    command.Id,
                                    new List<ErrorDto>
                                    {
                                        new("CONFLICT_SPECIALIST",
                                            $"Конфликт специалиста на {futureDate:yyyy-MM-dd}: уже назначен \"{conflictName}\"")
                                    }
                                ));
                            }

                            futureReserve.SpecialistId = command.SpecialistId;
                            futureReserve.SpecialistConfirmed = false;
                        }
                        else
                        {
                            db.Reserves.Add(new Reserve
                            {
                                Id = Guid.NewGuid(),
                                Date = futureDate,
                                TimeSlotId = command.TimeSlotId,
                                RoomId = command.RoomId,
                                SpecialistId = command.SpecialistId,
                                ClientId = Guid.Empty,
                                SpecialistConfirmed = false,
                                ClientConfirmed = false
                            });
                        }
                    }
                }

                // 3. Replicate client to future weeks
                if (command.ClientRepeats > 1 && command.ClientId != Guid.Empty)
                {
                    for (int w = 1; w < command.ClientRepeats; w++)
                    {
                        var futureDate = date.AddDays(w * 7);
                        var futureReserve = await db.Reserves.FirstOrDefaultAsync(r =>
                            r.Date == futureDate && r.TimeSlotId == command.TimeSlotId && r.RoomId == command.RoomId);

                        if (futureReserve != null)
                        {
                            // Conflict check: different client already assigned
                            if (futureReserve.ClientId != command.ClientId && futureReserve.ClientId != Guid.Empty)
                            {
                                var conflictClient = await db.Clients.FindAsync(futureReserve.ClientId);
                                var conflictName = conflictClient?.Name ?? "неизвестный";
                                await transaction.RollbackAsync();
                                return Results.Ok(new SaveReserveResult(
                                    command.Id,
                                    new List<ErrorDto>
                                    {
                                        new("CONFLICT_CLIENT",
                                            $"Конфликт клиента на {futureDate:yyyy-MM-dd}: уже назначен \"{conflictName}\"")
                                    }
                                ));
                            }

                            futureReserve.ClientId = command.ClientId;
                            futureReserve.ClientConfirmed = false;
                        }
                        else
                        {
                            db.Reserves.Add(new Reserve
                            {
                                Id = Guid.NewGuid(),
                                Date = futureDate,
                                TimeSlotId = command.TimeSlotId,
                                RoomId = command.RoomId,
                                SpecialistId = Guid.Empty,
                                ClientId = command.ClientId,
                                SpecialistConfirmed = false,
                                ClientConfirmed = false
                            });
                        }
                    }
                }

                await db.SaveChangesAsync();
                await transaction.CommitAsync();

                return Results.Ok(new SaveReserveResult(mainReserve.Id, new List<ErrorDto>()));
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return Results.Ok(new SaveReserveResult(
                    command.Id,
                    new List<ErrorDto> { new("SERVER_ERROR", ex.Message) }
                ));
            }
        });
    }
}
