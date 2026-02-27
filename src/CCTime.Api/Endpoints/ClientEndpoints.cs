using CCTime.Api.Models;
using CCTime.Domain.Entities;
using CCTime.Infrastructure.Data;
using FluentValidation;
using Microsoft.EntityFrameworkCore;

namespace CCTime.Api.Endpoints;

public static class ClientEndpoints
{
    public static void MapClientEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapPost("/api/clients", async (AppDbContext db) =>
        {
            var clients = await db.Clients
                .OrderBy(c => c.OrderIndex)
                .Select(c => new ClientItem(c.Id, c.Name, c.OrderIndex, c.IsArchived))
                .ToListAsync();

            return Results.Ok(new GetClientsResult(clients));
        });

        app.MapPost("/api/clients/save", async (
            SaveClientCommand command,
            IValidator<SaveClientCommand> validator,
            AppDbContext db) =>
        {
            var validation = await validator.ValidateAsync(command);
            if (!validation.IsValid)
            {
                var errors = validation.Errors
                    .Select(e => new ErrorDto("VALIDATION", e.ErrorMessage))
                    .ToList();
                return Results.Ok(new SaveClientResult(command.Id, errors));
            }

            var isEdit = command.Id.HasValue;

            if (isEdit)
            {
                var client = await db.Clients.FindAsync(command.Id.Value);
                if (client == null)
                    return Results.Ok(new SaveClientResult(command.Id, new List<ErrorDto>
                    {
                        new("NOT_FOUND", "Клиент не найден")
                    }));

                client.Name = command.Name;
                client.OrderIndex = command.OrderIndex;
                client.IsArchived = command.IsArchived;

                await db.SaveChangesAsync();
                return Results.Ok(new SaveClientResult(client.Id, new List<ErrorDto>()));
            }
            else
            {
                var client = new Client
                {
                    Id = Guid.NewGuid(),
                    Name = command.Name,
                    OrderIndex = command.OrderIndex,
                    IsArchived = command.IsArchived
                };

                db.Clients.Add(client);
                await db.SaveChangesAsync();
                return Results.Ok(new SaveClientResult(client.Id, new List<ErrorDto>()));
            }
        });
    }
}
