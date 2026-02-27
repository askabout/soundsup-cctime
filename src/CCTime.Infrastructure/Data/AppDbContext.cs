using CCTime.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace CCTime.Infrastructure.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Specialist> Specialists => Set<Specialist>();
    public DbSet<Client> Clients => Set<Client>();
    public DbSet<Room> Rooms => Set<Room>();
    public DbSet<TimeSlot> TimeSlots => Set<TimeSlot>();
    public DbSet<Reserve> Reserves => Set<Reserve>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
        SeedData.Apply(modelBuilder);
    }
}
