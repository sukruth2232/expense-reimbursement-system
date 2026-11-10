namespace ExpenseReimbursement.Core.Enums;

// All enums are stored in PostgreSQL as text ("PendingApproval", not 1),
// so the database stays readable in pgAdmin and safe if enum order changes.

/// <summary>The two roles in the MVP. Stored in Users.Role.</summary>
public enum UserRole
{
    Employee,
    Manager
}

/// <summary>
/// Life cycle of a claim:
/// Draft -> PendingApproval -> Approved
///                          -> Rejected -> (edit) -> PendingApproval
/// </summary>
public enum ExpenseStatus
{
    Draft,
    PendingApproval,
    Approved,
    Rejected
}

public enum PaymentMethod
{
    Cash,
    CorporateCard,
    PersonalCard,
    Upi,
    BankTransfer,
    Other
}

/// <summary>What a manager did. One ApprovalHistory row per action.</summary>
public enum ApprovalAction
{
    Approved,
    Rejected
}
