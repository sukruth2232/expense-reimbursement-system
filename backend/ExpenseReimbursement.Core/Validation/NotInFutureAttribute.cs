using System.ComponentModel.DataAnnotations;

namespace ExpenseReimbursement.Core.Validation;

/// <summary>
/// Validation attribute for DTOs: the expense date may be today or earlier, never in the future.
/// Used as [NotInFuture] on ExpenseRequest.ExpenseDate. The same rule exists in Angular
/// (not-future-date.validator.ts) so the user sees the error before sending.
/// </summary>
[AttributeUsage(AttributeTargets.Property)]
public class NotInFutureAttribute : ValidationAttribute
{
    public NotInFutureAttribute() : base("Expense date cannot be in the future.") { }

    public override bool IsValid(object? value) => value switch
    {
        null => true, // [Required] handles missing values
        DateOnly date => date <= DateOnly.FromDateTime(DateTime.Today),
        _ => false
    };
}
