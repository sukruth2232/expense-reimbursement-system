namespace ExpenseReimbursement.Core.Entities;

/// <summary>Lookup table: Travel, Food, Accommodation, Transportation, Office Supplies, Other.</summary>
public class ExpenseCategory
{
    public int CategoryId { get; set; }
    public string CategoryName { get; set; } = string.Empty;
}
