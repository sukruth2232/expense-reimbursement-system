namespace ExpenseReimbursement.Core.Exceptions;

// Services throw these instead of returning error codes.
// GlobalExceptionHandler (API project) turns each one into an HTTP status:
//   NotFoundException      -> 404
//   ForbiddenException     -> 403
//   BusinessRuleException  -> 409

/// <summary>
/// The record does not exist OR the caller is not allowed to see it.
/// We deliberately use 404 for "not yours" so IDs reveal nothing.
/// </summary>
public class NotFoundException(string message) : Exception(message);

/// <summary>The caller is authenticated but not allowed to do this.</summary>
public class ForbiddenException(string message) : Exception(message);

/// <summary>A workflow rule was broken, e.g. editing an Approved claim.</summary>
public class BusinessRuleException(string message) : Exception(message);
