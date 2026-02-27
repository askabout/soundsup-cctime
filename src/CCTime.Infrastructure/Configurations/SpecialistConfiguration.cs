using CCTime.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CCTime.Infrastructure.Configurations;

public class SpecialistConfiguration : IEntityTypeConfiguration<Specialist>
{
    public void Configure(EntityTypeBuilder<Specialist> builder)
    {
        builder.ToTable("specialists");

        builder.HasKey(e => e.Id);
        builder.Property(e => e.Id).HasColumnName("id");
        builder.Property(e => e.Name).HasColumnName("name").IsRequired();
        builder.Property(e => e.OrderIndex).HasColumnName("order_index").HasDefaultValue(0);
    }
}
