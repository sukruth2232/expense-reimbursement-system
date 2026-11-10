namespace ExpenseReimbursement.Core.DTOs.Common;

/// <summary>Standard shape for every list endpoint: one page of items plus the total count.</summary>
public record PagedResult<T>(IReadOnlyList<T> Items, int Page, int PageSize, int TotalCount);

/// <summary>Query-string paging parameters, e.g. ?page=2&amp;pageSize=10. Values are clamped to safe ranges.</summary>
public class PageQuery
{
    private int _page = 1;
    private int _pageSize = 10;

    public int Page
    {
        get => _page;
        set => _page = value < 1 ? 1 : value;
    }

    public int PageSize
    {
        get => _pageSize;
        set => _pageSize = value is < 1 or > 100 ? 10 : value;
    }

    public int Skip => (Page - 1) * PageSize;
}
