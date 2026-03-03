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
            var emptyId = CCTime.Domain.Constants.EmptyReferenceId;

            await using var transaction = await db.Database.BeginTransactionAsync();
            try
            {
                // 1. Pre-load all reserves we may need (current + future weeks)
                var maxRepeats = Math.Max(command.SpecialistRepeats, command.ClientRepeats);
                var futureDates = Enumerable.Range(0, maxRepeats)
                    .Select(w => date.AddDays(w * 7))
                    .ToList();

                var existingReserves = await db.Reserves
                    .Where(r => futureDates.Contains(r.Date)
                                && r.TimeSlotId == command.TimeSlotId
                                && r.RoomId == command.RoomId)
                    .ToDictionaryAsync(r => r.Date);

                // Helper: get or create reserve for a given date
                Reserve GetOrCreate(DateOnly d)
                {
                    if (existingReserves.TryGetValue(d, out var r))
                        return r;

                    r = new Reserve
                    {
                        Id = Guid.NewGuid(),
                        Date = d,
                        TimeSlotId = command.TimeSlotId,
                        RoomId = command.RoomId,
                        SpecialistId = emptyId,
                        ClientId = emptyId,
                        SpecialistConfirmed = false,
                        ClientConfirmed = false
                    };
                    db.Reserves.Add(r);
                    existingReserves[d] = r;
                    return r;
                }

                // 2. Main reserve (week 0)
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
                    mainReserve = GetOrCreate(date);
                    mainReserve.ClientId = command.ClientId;
                    mainReserve.SpecialistId = command.SpecialistId;
                    mainReserve.ClientConfirmed = command.ClientConfirmed;
                    mainReserve.SpecialistConfirmed = command.SpecialistConfirmed;
                }

                // 3. Replicate specialist to future weeks
                if (command.SpecialistRepeats > 1)
                {
                    for (int w = 1; w < command.SpecialistRepeats; w++)
                    {
                        var futureDate = date.AddDays(w * 7);
                        var reserve = GetOrCreate(futureDate);

                        if (!command.ForceOverwrite && reserve.SpecialistId != command.SpecialistId && reserve.SpecialistId != emptyId)
                        {
                            var conflictSpec = await db.Specialists.FindAsync(reserve.SpecialistId);
                            await transaction.RollbackAsync();
                            return Results.Ok(new SaveReserveResult(
                                command.Id,
                                new List<ErrorDto>
                                {
                                    new("CONFLICT_SPECIALIST",
                                        $"Конфликт специалиста на {futureDate:yyyy-MM-dd}: уже назначен \"{conflictSpec?.Name ?? "неизвестный"}\"")
                                }
                            ));
                        }

                        reserve.SpecialistId = command.SpecialistId;
                        reserve.SpecialistConfirmed = false;
                    }
                }

                // 4. Replicate client to future weeks
                if (command.ClientRepeats > 1)
                {
                    for (int w = 1; w < command.ClientRepeats; w++)
                    {
                        var futureDate = date.AddDays(w * 7);
                        var reserve = GetOrCreate(futureDate);

                        if (!command.ForceOverwrite && reserve.ClientId != command.ClientId && reserve.ClientId != emptyId)
                        {
                            var conflictClient = await db.Clients.FindAsync(reserve.ClientId);
                            await transaction.RollbackAsync();
                            return Results.Ok(new SaveReserveResult(
                                command.Id,
                                new List<ErrorDto>
                                {
                                    new("CONFLICT_CLIENT",
                                        $"Конфликт клиента на {futureDate:yyyy-MM-dd}: уже назначен \"{conflictClient?.Name ?? "неизвестный"}\"")
                                }
                            ));
                        }

                        reserve.ClientId = command.ClientId;
                        reserve.ClientConfirmed = false;
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
