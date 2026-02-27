using CCTime.Api.Models;
using FluentValidation;

namespace CCTime.Api.Validators;

public class SaveSpecialistValidator : AbstractValidator<SaveSpecialistCommand>
{
    public SaveSpecialistValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Имя специалиста обязательно");

        RuleFor(x => x.OrderIndex)
            .GreaterThanOrEqualTo(0).WithMessage("Порядок отображения должен быть >= 0");
    }
}
