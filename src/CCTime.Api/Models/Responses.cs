namespace CCTime.Api.Models;

public record ReferenceItem(Guid Id, string Name, int OrderIndex);
public record TimeSlotItem(Guid Id, string Name, string Type, int OrderIndex);

public record GetReferencesResult(
    List<ReferenceItem> Specialists,
    List<ReferenceItem> Clients,
    List<ReferenceItem> Rooms,
    List<TimeSlotItem> TimeSlots
);

public record ReserveDto(
    Guid Id,
    string Date,
    Guid TimeSlotId,
    Guid RoomId,
    Guid ClientId,
    bool ClientConfirmed,
    Guid SpecialistId,
    bool SpecialistConfirmed
);

public record GetReservesForDateResult(List<ReserveDto> Reserves);

public record ErrorDto(string Code, string Message);

public record SaveReserveResult(Guid? Id, List<ErrorDto> Errors);

public record SpecialistItem(Guid Id, string Name, int OrderIndex, bool IsArchived);
public record GetSpecialistsResult(List<SpecialistItem> Specialists);
public record SaveSpecialistResult(Guid? Id, List<ErrorDto> Errors);

public record ClientItem(Guid Id, string Name, int OrderIndex, bool IsArchived);
public record GetClientsResult(List<ClientItem> Clients);
public record SaveClientResult(Guid? Id, List<ErrorDto> Errors);
