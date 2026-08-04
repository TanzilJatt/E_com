# Excel Import - Quick Reference

## Excel Column Format

```
| name          | price  | quantity | description            | vendor         |
|---------------|--------|----------|------------------------|----------------|
| Laptop        | 45000  | 10       | Dell Inspiron 15       | Tech Supplies  |
| Mouse         | 500    | 50       | Wireless optical mouse | Office Depot   |
```

## Field Requirements

| Field       | Required | Type   | Max Length | Validation           |
|-------------|----------|--------|------------|----------------------|
| name        | ✅ Yes   | Text   | 30 chars   | Letters, numbers, spaces |
| price       | ✅ Yes   | Number | -          | Positive numbers only |
| quantity    | ✅ Yes   | Number | -          | Positive numbers only |
| description | ❌ No    | Text   | 100 chars  | Any characters       |
| vendor      | ❌ No    | Text   | 30 chars   | Letters, numbers, spaces |

## Quick Steps

1. **Download Template** → Get the sample Excel file
2. **Fill Data** → Add your items following the format
3. **Import File** → Upload and wait for completion
4. **Check Results** → Review success/error messages

## Duplicate Handling

| Scenario | Action |
|----------|--------|
| Same name + Same price | ✅ Quantity **added** to existing item |
| Same name + Different price | ✅ New item created as "name_1", "name_2", etc. |

**Example:**
- Existing: "Laptop" @ RS 45000, Qty 10
- Import: "Laptop" @ RS 45000, Qty 5
- **Result:** "Laptop" @ RS 45000, Qty 15 ✅ (Updated)

**Example 2:**
- Existing: "Laptop" @ RS 45000
- Import: "Laptop" @ RS 50000
- **Result:** New item "Laptop_1" @ RS 50000 ✅ (Added)

## Auto-Generated Fields

❌ **DO NOT include these in Excel:**
- SKU (auto-generated as SKU-0001, SKU-0002, etc.)
- Created Date
- Created By
- Updated Date
- Updated By

## Common Errors

| Error Message | Solution |
|---------------|----------|
| "Item name is required" | Add a name for the item |
| "Price must be positive" | Use positive numbers (>= 0) |
| "Name must be 30 characters or less" | Shorten the item name |
| "Quantity must be positive" | Use positive numbers (>= 0) |

## Tips

- ✅ Use the template for correct format
- ✅ Test with 3-5 items first
- ✅ Review validation rules before importing
- ❌ Don't include special characters in name/vendor
- ❌ Don't exceed character limits
- ❌ Don't use negative numbers

## Need Help?

Click the ℹ️ info button next to the Import Excel button for detailed instructions.
