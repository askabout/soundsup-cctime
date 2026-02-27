using CCTime.Api.Models;
using FluentValidation;

namespace CCTime.Api.Validators;

public class SaveClientValidator : AbstractValidator<SaveClientCommand>
{
    public SaveClientValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Имя клиента обязательно");

        RuleFor(x => x.OrderIndex)
            .GreaterThanOrEqualTo(0).WithMessage("Порядок отображения должен быть >= 0");
    }
}
