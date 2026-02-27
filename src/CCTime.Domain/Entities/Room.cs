namespace CCTime.Domain.Entities;

public class Room
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public int OrderIndex { get; set; }
}
