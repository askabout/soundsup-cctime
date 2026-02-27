namespace CCTime.Domain.Entities;

public class TimeSlot
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Type { get; set; } = "work";
    public int OrderIndex { get; set; }
}
