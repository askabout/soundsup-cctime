namespace CCTime.Domain.Entities;

public class Reserve
{
    public Guid Id { get; set; }
    public Guid ClientId { get; set; }
    public Guid SpecialistId { get; set; }
    public Guid RoomId { get; set; }
    public DateOnly Date { get; set; }
    public Guid TimeSlotId { get; set; }
    public bool ClientConfirmed { get; set; }
    public bool SpecialistConfirmed { get; set; }

    public Client? Client { get; set; }
    public Specialist? Specialist { get; set; }
    public Room? Room { get; set; }
    public TimeSlot? TimeSlot { get; set; }
}
