namespace CCTime.Api.Models;

public record GetReservesForDateQuery(string Date);

public record SaveReserveCommand(
    Guid? Id,
    string Date,
    Guid TimeSlotId,
    Guid RoomId,
    Guid ClientId,
    bool ClientConfirmed,
    int ClientRepeats,
    Guid SpecialistId,
    bool SpecialistConfirmed,
    int SpecialistRepeats
);
