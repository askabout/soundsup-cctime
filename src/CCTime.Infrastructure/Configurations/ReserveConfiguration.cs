using CCTime.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CCTime.Infrastructure.Configurations;

public class ReserveConfiguration : IEntityTypeConfiguration<Reserve>
{
    public void Configure(EntityTypeBuilder<Reserve> builder)
    {
        builder.ToTable("reserves");

        builder.HasKey(e => e.Id);
        builder.Property(e => e.Id).HasColumnName("id");
        builder.Property(e => e.ClientId).HasColumnName("client_id").HasDefaultValue(CCTime.Domain.Constants.EmptyReferenceId);
        builder.Property(e => e.SpecialistId).HasColumnName("specialist_id").HasDefaultValue(CCTime.Domain.Constants.EmptyReferenceId);
        builder.Property(e => e.RoomId).HasColumnName("room_id");
        builder.Property(e => e.Date).HasColumnName("date");
        builder.Property(e => e.TimeSlotId).HasColumnName("time_slot_id");
        builder.Property(e => e.ClientConfirmed).HasColumnName("client_confirmed").HasDefaultValue(false);
        builder.Property(e => e.SpecialistConfirmed).HasColumnName("specialist_confirmed").HasDefaultValue(false);

        builder.HasIndex(e => new { e.Date, e.TimeSlotId, e.RoomId }).IsUnique();

        builder.HasOne(e => e.Client).WithMany().HasForeignKey(e => e.ClientId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(e => e.Specialist).WithMany().HasForeignKey(e => e.SpecialistId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(e => e.Room).WithMany().HasForeignKey(e => e.RoomId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(e => e.TimeSlot).WithMany().HasForeignKey(e => e.TimeSlotId).OnDelete(DeleteBehavior.Restrict);
    }
}
