using CCTime.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace CCTime.Infrastructure.Data;

public static class SeedData
{
    public static void Apply(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Specialist>().HasData(
            new Specialist { Id = Guid.Parse("00000000-0000-0000-0000-000000000001"), Name = "-", OrderIndex = 0 },
            new Specialist { Id = Guid.Parse("a1b2c3d4-0001-0000-0000-000000000001"), Name = "Специалист1", OrderIndex = 1 },
            new Specialist { Id = Guid.Parse("a1b2c3d4-0001-0000-0000-000000000002"), Name = "Специалист2", OrderIndex = 2 }
        );

        modelBuilder.Entity<Client>().HasData(
            new Client { Id = Guid.Parse("00000000-0000-0000-0000-000000000001"), Name = "-", OrderIndex = 0 },
            new Client { Id = Guid.Parse("b2c3d4e5-0002-0000-0000-000000000001"), Name = "Клиент1", OrderIndex = 1 },
            new Client { Id = Guid.Parse("b2c3d4e5-0002-0000-0000-000000000003"), Name = "Клиент2", OrderIndex = 2 }
        );

        modelBuilder.Entity<Room>().HasData(
            new Room { Id = Guid.Parse("c3d4e5f6-0003-0000-0000-000000000001"), Name = "ЛОГО", OrderIndex = 1 },
            new Room { Id = Guid.Parse("c3d4e5f6-0003-0000-0000-000000000002"), Name = "НЕЙРО", OrderIndex = 2 }
        );

        modelBuilder.Entity<TimeSlot>().HasData(
            new TimeSlot { Id = Guid.Parse("d4e5f6a7-0004-0000-0000-000000000001"), Name = "8.30-9.15", Type = "work", OrderIndex = 1 },
            new TimeSlot { Id = Guid.Parse("d4e5f6a7-0004-0000-0000-000000000002"), Name = "9.15-10.00", Type = "work", OrderIndex = 2 },
            new TimeSlot { Id = Guid.Parse("d4e5f6a7-0004-0000-0000-000000000003"), Name = "10.00-10.45", Type = "work", OrderIndex = 3 },
            new TimeSlot { Id = Guid.Parse("d4e5f6a7-0004-0000-0000-000000000004"), Name = "перерыв 15 мин", Type = "break", OrderIndex = 4 },
            new TimeSlot { Id = Guid.Parse("d4e5f6a7-0004-0000-0000-000000000005"), Name = "11.00-11.45", Type = "work", OrderIndex = 5 },
            new TimeSlot { Id = Guid.Parse("d4e5f6a7-0004-0000-0000-000000000006"), Name = "11.45-12.30", Type = "work", OrderIndex = 6 },
            new TimeSlot { Id = Guid.Parse("d4e5f6a7-0004-0000-0000-000000000007"), Name = "12.30-13.15", Type = "work", OrderIndex = 7 },
            new TimeSlot { Id = Guid.Parse("d4e5f6a7-0004-0000-0000-000000000008"), Name = "обед", Type = "break", OrderIndex = 8 },
            new TimeSlot { Id = Guid.Parse("d4e5f6a7-0004-0000-0000-000000000009"), Name = "13.30-14.15", Type = "work", OrderIndex = 9 },
            new TimeSlot { Id = Guid.Parse("d4e5f6a7-0004-0000-0000-000000000010"), Name = "14.15-15.00", Type = "work", OrderIndex = 10 },
            new TimeSlot { Id = Guid.Parse("d4e5f6a7-0004-0000-0000-000000000011"), Name = "15.00-15.45", Type = "work", OrderIndex = 11 },
            new TimeSlot { Id = Guid.Parse("d4e5f6a7-0004-0000-0000-000000000012"), Name = "перерыв 15 мин", Type = "break", OrderIndex = 12 },
            new TimeSlot { Id = Guid.Parse("d4e5f6a7-0004-0000-0000-000000000013"), Name = "16.00-16.45", Type = "work", OrderIndex = 13 },
            new TimeSlot { Id = Guid.Parse("d4e5f6a7-0004-0000-0000-000000000014"), Name = "16.45-17.30", Type = "work", OrderIndex = 14 },
            new TimeSlot { Id = Guid.Parse("d4e5f6a7-0004-0000-0000-000000000015"), Name = "17.30-18.15", Type = "work", OrderIndex = 15 },
            new TimeSlot { Id = Guid.Parse("d4e5f6a7-0004-0000-0000-000000000016"), Name = "перерыв 15 мин", Type = "break", OrderIndex = 16 },
            new TimeSlot { Id = Guid.Parse("d4e5f6a7-0004-0000-0000-000000000017"), Name = "18.30-19.15", Type = "work", OrderIndex = 17 },
            new TimeSlot { Id = Guid.Parse("d4e5f6a7-0004-0000-0000-000000000018"), Name = "19.15-20.00", Type = "work", OrderIndex = 18 }
        );
    }
}
