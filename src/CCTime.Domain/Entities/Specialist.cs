namespace CCTime.Domain.Entities;

public class Specialist
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public int OrderIndex { get; set; }
    public bool IsArchived { get; set; }
}
