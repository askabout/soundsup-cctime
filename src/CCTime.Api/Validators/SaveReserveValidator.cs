using CCTime.Api.Models;
using FluentValidation;

namespace CCTime.Api.Validators;

public class SaveReserveValidator : AbstractValidator<SaveReserveCommand>
{
    public SaveReserveValidator()
    {
        RuleFor(x => x.Date)
            .NotEmpty().WithMessage("Дата обязательна")
            .Must(d => DateOnly.TryParse(d, out _)).WithMessage("Неверный формат даты");

        RuleFor(x => x.TimeSlotId)
            .NotEqual(Guid.Empty).WithMessage("Тайм-слот обязателен");

        RuleFor(x => x.RoomId)
            .NotEqual(Guid.Empty).WithMessage("Кабинет обязателен");

        RuleFor(x => x.ClientRepeats)
            .GreaterThanOrEqualTo(1).WithMessage("Количество повторов клиента должно быть >= 1");

        RuleFor(x => x.SpecialistRepeats)
            .GreaterThanOrEqualTo(1).WithMessage("Количество повторов специалиста должно быть >= 1");
    }
}
