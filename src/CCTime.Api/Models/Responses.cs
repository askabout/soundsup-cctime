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
