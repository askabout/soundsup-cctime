namespace CCTime.Domain;

public static class Constants
{
    /// <summary>
    /// ID записи «свободно» (имя «-») для специалистов и клиентов.
    /// </summary>
    public static readonly Guid EmptyReferenceId = Guid.Parse("00000000-0000-0000-0000-000000000001");
}
