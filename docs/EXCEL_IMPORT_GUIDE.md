# Excel Import Guide for Inventory Items

This guide explains how to import items in bulk using Excel files.

## Quick Start

1. Click the **"Download Template"** button to get the Excel template
2. Fill in your items data following the template format
3. Click **"Import Excel"** and select your file
4. Wait for the import to complete

## Excel File Format

### Required Columns

Your Excel file should contain the following columns:

| Column Name | Type   | Required | Max Length | Description                    |
|-------------|--------|----------|------------|--------------------------------|
| name        | Text   | Yes      | 30 chars   | Item name                      |
| price       | Number | Yes      | -          | Price (must be positive)       |
| quantity    | Number | Yes      | -          | Quantity (must be positive)    |
| description | Text   | No       | 100 chars  | Item description               |
| vendor      | Text   | No       | 30 chars   | Vendor name                    |

### Column Name Variations

The import system accepts different variations of column names:
- **name**: Can also be "Name", "item_name", or "Item Name"
- **price**: Can also be "Price"
- **quantity**: Can also be "Quantity"
- **description**: Can also be "Description"
- **vendor**: Can also be "Vendor"

### Example Excel Data

```
| name          | price  | quantity | description            | vendor         |
|---------------|--------|----------|------------------------|----------------|
| Laptop        | 45000  | 10       | Dell Inspiron 15       | Tech Supplies  |
| Mouse         | 500    | 50       | Wireless optical mouse | Office Depot   |
| Keyboard      | 1200   | 30       | Mechanical RGB         | Tech Supplies  |
| Monitor       | 15000  | 8        | 24 inch LED display    | Electronics Co |
```

## Validation Rules

The import process validates each row against the following rules:

1. **Name**: 
   - Required field
   - Maximum 30 characters
   - Only letters, numbers, and spaces

2. **Price**: 
   - Required field
   - Must be a positive number (>= 0)

3. **Quantity**: 
   - Required field
   - Must be a positive number (>= 0)

4. **Description**: 
   - Optional field
   - Maximum 100 characters

5. **Vendor**: 
   - Optional field
   - Maximum 30 characters
   - Only letters, numbers, and spaces

## Import Process

### Step-by-Step

1. **Prepare Your Excel File**
   - Download the template or use your own Excel file
   - Ensure column names match the required format
   - Fill in your data following the validation rules

2. **Import the File**
   - Click the "Import Excel" button
   - Select your Excel file (.xlsx or .xls)
   - The system will start processing

3. **Monitor Progress**
   - A progress bar shows the import status
   - Current/Total items being processed
   - Any errors are displayed in real-time

4. **Review Results**
   - Success message shows number of items imported/updated
   - Any errors are logged with specific row numbers
   - Failed rows are skipped, successful ones are imported/updated

### Duplicate Handling

The import system intelligently handles duplicate item names:

#### Same Name + Same Price
- **Action**: Quantity is **added** to the existing item
- **Example**: 
  - Existing: "Laptop" with price 45000, quantity 10
  - Import: "Laptop" with price 45000, quantity 5
  - Result: "Laptop" with price 45000, quantity 15 (updated)

#### Same Name + Different Price
- **Action**: New item is created with a numeric suffix
- **Example**:
  - Existing: "Laptop" with price 45000
  - Import: "Laptop" with price 50000
  - Result: New item created as "Laptop_1" with price 50000
  - Import again: "Laptop" with price 55000
  - Result: New item created as "Laptop_2" with price 55000

#### Benefits
- **Prevents accidental overwrites** of items with different prices
- **Allows easy stock updates** for same items
- **Maintains price history** by creating variants
- **Automatic conflict resolution** without manual intervention

### Error Handling

If errors occur during import:
- The import continues for valid rows
- Invalid rows are skipped
- Errors are displayed with row numbers
- Check the browser console for detailed error logs

### Common Errors

1. **"Item name is required"**
   - The name column is empty
   - Solution: Provide a name for the item

2. **"Price must be positive"**
   - Price is negative
   - Solution: Use positive numbers only

3. **"Name must be 30 characters or less"**
   - Item name exceeds character limit
   - Solution: Shorten the name

4. **"Failed to add item"**
   - Database error or permission issue
   - Solution: Check Firebase connection and authentication

## Tips for Successful Import

1. **Use the Template**: Always start with the provided template to ensure correct format

2. **Test with Small Batch**: Import a few items first to verify the format

3. **Check Data Quality**: Review your data for:
   - No empty required fields
   - Positive numbers for price and quantity
   - Character limits are respected

4. **Avoid Special Characters**: Stick to letters, numbers, and spaces for name and vendor

5. **Backup Before Large Imports**: Consider exporting current items before large imports

## Auto-Generated Fields

The following fields are automatically generated and should NOT be included in your Excel:

- **SKU**: Automatically generated as SKU-0001, SKU-0002, etc.
- **Created Date**: Set to current date/time
- **Created By**: Set to current logged-in user
- **Updated Date**: Set to current date/time
- **Updated By**: Set to current logged-in user

## Limitations

- Maximum file size: Depends on browser memory (typically ~10MB)
- Recommended batch size: Up to 1000 items per import
- File formats: .xlsx and .xls only
- Single sheet: Only the first sheet is processed

## Troubleshooting

### Import button is disabled
- Check if you're logged in
- Ensure no other import is in progress

### File not uploading
- Verify file format is .xlsx or .xls
- Check file is not corrupted
- Try with a smaller file

### Items not appearing after import
- Refresh the page
- Check if you're viewing the correct date range filter
- Verify search filters are cleared

## Support

For issues or questions:
1. Check this guide first
2. Review error messages carefully
3. Test with the provided template
4. Check browser console for detailed logs
