using ExpenseReimbursement.Core.DTOs.Expenses;
using ExpenseReimbursement.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ExpenseReimbursement.API.Controllers;

[ApiController]
[Route("api/categories")]
[Authorize]
public class CategoriesController(ICategoryService categories) : ControllerBase
{
    /// <summary>All expense categories, for the form dropdown.</summary>
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<CategoryDto>>> GetAll(CancellationToken ct) =>
        Ok(await categories.GetAllAsync(ct));
}
