using ExpenseReimbursement.API.Extensions;
using ExpenseReimbursement.Core.DTOs.Dashboard;
using ExpenseReimbursement.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ExpenseReimbursement.API.Controllers;

[ApiController]
[Route("api/dashboard")]
public class DashboardController(IDashboardService dashboard) : ControllerBase
{
    /// <summary>Counts and totals for the employee's own claims.</summary>
    [HttpGet("employee")]
    [Authorize(Roles = "Employee")]
    public async Task<ActionResult<EmployeeDashboardDto>> Employee(CancellationToken ct) =>
        Ok(await dashboard.GetEmployeeDashboardAsync(User.GetUserId(), ct));

    /// <summary>Team size, pending queue and this month's decisions for the manager.</summary>
    [HttpGet("manager")]
    [Authorize(Roles = "Manager")]
    public async Task<ActionResult<ManagerDashboardDto>> Manager(CancellationToken ct) =>
        Ok(await dashboard.GetManagerDashboardAsync(User.GetUserId(), ct));
}
