# Excel Import Template Example

## Visual Example of Excel File Format

### ✅ CORRECT FORMAT

Your Excel file should look like this:

```
┌──────────────┬────────┬──────────┬─────────────────────────┬────────────────┐
│ name         │ price  │ quantity │ description             │ vendor         │
├──────────────┼────────┼──────────┼─────────────────────────┼────────────────┤
│ Laptop       │ 45000  │ 10       │ Dell Inspiron 15        │ Tech Supplies  │
│ Mouse        │ 500    │ 50       │ Wireless optical mouse  │ Office Depot   │
│ Keyboard     │ 1200   │ 30       │ Mechanical RGB          │ Tech Supplies  │
│ Monitor      │ 15000  │ 8        │ 24 inch LED display     │ Electronics Co │
│ USB Cable    │ 200    │ 100      │ Type-C charging cable   │ Accessories Ltd│
└──────────────┴────────┴──────────┴─────────────────────────┴────────────────┘
```

### After Import (in Database)

The system will automatically add these fields:

```
┌──────────┬──────────────┬────────┬──────────┬─────────────────────────┬────────────────┬────────────┬────────────────┐
│ SKU      │ name         │ price  │ quantity │ description             │ vendor         │ Created    │ Created By     │
├──────────┼──────────────┼────────┼──────────┼─────────────────────────┼────────────────┼────────────┼────────────────┤
│ SKU-0001 │ Laptop       │ 45000  │ 10       │ Dell Inspiron 15        │ Tech Supplies  │ 2026-01-29 │ john@email.com │
│ SKU-0002 │ Mouse        │ 500    │ 50       │ Wireless optical mouse  │ Office Depot   │ 2026-01-29 │ john@email.com │
│ SKU-0003 │ Keyboard     │ 1200   │ 30       │ Mechanical RGB          │ Tech Supplies  │ 2026-01-29 │ john@email.com │
│ SKU-0004 │ Monitor      │ 15000  │ 8        │ 24 inch LED display     │ Electronics Co │ 2026-01-29 │ john@email.com │
│ SKU-0005 │ USB Cable    │ 200    │ 100      │ Type-C charging cable   │ Accessories Ltd│ 2026-01-29 │ john@email.com │
└──────────┴──────────────┴────────┴──────────┴─────────────────────────┴────────────────┴────────────┴────────────────┘
```

## Column Details

### name (Required)
- **Format**: Text
- **Max Length**: 30 characters
- **Rules**: Only letters, numbers, and spaces
- **Examples**:
  - ✅ "Laptop Dell"
  - ✅ "USB Cable 2M"
  - ✅ "Monitor 24 inch"
  - ❌ "Super-Long-Product-Name-That-Exceeds-Thirty-Characters" (too long)
  - ❌ "Product@123" (special characters not allowed)

### price (Required)
- **Format**: Number
- **Rules**: Must be >= 0
- **Examples**:
  - ✅ 100
  - ✅ 100.50
  - ✅ 0 (free item)
  - ❌ -50 (negative not allowed)
  - ❌ "one hundred" (must be number)

### quantity (Required)
- **Format**: Number (integer)
- **Rules**: Must be >= 0
- **Examples**:
  - ✅ 10
  - ✅ 0 (out of stock)
  - ✅ 1000
  - ❌ -5 (negative not allowed)
  - ❌ "ten" (must be number)

### description (Optional)
- **Format**: Text
- **Max Length**: 100 characters
- **Rules**: Any characters allowed
- **Examples**:
  - ✅ "High-quality wireless mouse with ergonomic design"
  - ✅ "" (can be empty)
  - ❌ "Very long description that exceeds one hundred characters limit will be rejected by the validation system" (too long)

### vendor (Optional)
- **Format**: Text
- **Max Length**: 30 characters
- **Rules**: Only letters, numbers, and spaces
- **Examples**:
  - ✅ "Tech Supplies Co"
  - ✅ "Office Depot"
  - ✅ "" (can be empty)
  - ❌ "Very Long Vendor Name Exceeds Limit" (too long)
  - ❌ "Tech@Supplies" (special characters not allowed)

## ❌ COMMON MISTAKES

### 1. Wrong Column Names
```
❌ WRONG:
┌──────────────┬─────────┬──────┬─────────────┬────────────┐
│ product_name │ cost    │ qty  │ desc        │ supplier   │
└──────────────┴─────────┴──────┴─────────────┴────────────┘

✅ CORRECT:
┌──────────────┬─────────┬──────────┬─────────────┬────────────┐
│ name         │ price   │ quantity │ description │ vendor     │
└──────────────┴─────────┴──────────┴─────────────┴────────────┘
```

### 2. Including SKU Column
```
❌ WRONG (SKU is auto-generated):
┌──────────┬──────────────┬─────────┬──────────┐
│ sku      │ name         │ price   │ quantity │
├──────────┼──────────────┼─────────┼──────────┤
│ SKU-0001 │ Laptop       │ 45000   │ 10       │
└──────────┴──────────────┴─────────┴──────────┘

✅ CORRECT (No SKU column):
┌──────────────┬─────────┬──────────┐
│ name         │ price   │ quantity │
├──────────────┼─────────┼──────────┤
│ Laptop       │ 45000   │ 10       │
└──────────────┴─────────┴──────────┘
```

### 3. Using Negative Numbers
```
❌ WRONG:
┌──────────┬─────────┬──────────┐
│ name     │ price   │ quantity │
├──────────┼─────────┼──────────┤
│ Laptop   │ -45000  │ -10      │
└──────────┴─────────┴──────────┘

✅ CORRECT:
┌──────────┬─────────┬──────────┐
│ name     │ price   │ quantity │
├──────────┼─────────┼──────────┤
│ Laptop   │ 45000   │ 10       │
└──────────┴─────────┴──────────┘
```

### 4. Missing Required Fields
```
❌ WRONG (missing name):
┌──────┬─────────┬──────────┐
│ name │ price   │ quantity │
├──────┼─────────┼──────────┤
│      │ 45000   │ 10       │
└──────┴─────────┴──────────┘

✅ CORRECT:
┌──────────┬─────────┬──────────┐
│ name     │ price   │ quantity │
├──────────┼─────────┼──────────┤
│ Laptop   │ 45000   │ 10       │
└──────────┴─────────┴──────────┘
```

## Sample Data Sets

### Minimal (Required Fields Only)
```
┌──────────┬─────────┬──────────┐
│ name     │ price   │ quantity │
├──────────┼─────────┼──────────┤
│ Laptop   │ 45000   │ 10       │
│ Mouse    │ 500     │ 50       │
└──────────┴─────────┴──────────┘
```

### Full (All Fields)
```
┌──────────┬─────────┬──────────┬─────────────────────────┬───────────────┐
│ name     │ price   │ quantity │ description             │ vendor        │
├──────────┼─────────┼──────────┼─────────────────────────┼───────────────┤
│ Laptop   │ 45000   │ 10       │ Dell Inspiron 15        │ Tech Supplies │
│ Mouse    │ 500     │ 50       │ Wireless optical mouse  │ Office Depot  │
└──────────┴─────────┴──────────┴─────────────────────────┴───────────────┘
```

### Multiple Products from Same Vendor
```
┌──────────────┬─────────┬──────────┬─────────────────────────┬───────────────┐
│ name         │ price   │ quantity │ description             │ vendor        │
├──────────────┼─────────┼──────────┼─────────────────────────┼───────────────┤
│ Laptop       │ 45000   │ 10       │ Dell Inspiron 15        │ Tech Supplies │
│ Keyboard     │ 1200    │ 30       │ Mechanical RGB          │ Tech Supplies │
│ Monitor      │ 15000   │ 8        │ 24 inch LED display     │ Tech Supplies │
│ Mouse Pad    │ 300     │ 40       │ Large gaming mouse pad  │ Tech Supplies │
└──────────────┴─────────┴──────────┴─────────────────────────┴───────────────┘
```

## In Excel Application

When you open Excel, your spreadsheet should look exactly like this:

```
  A            B        C         D                          E
1 name         price    quantity  description                vendor
2 Laptop       45000    10        Dell Inspiron 15           Tech Supplies
3 Mouse        500      50        Wireless optical mouse     Office Depot
4 Keyboard     1200     30        Mechanical RGB             Tech Supplies
```

**Important**: 
- Row 1 must be headers
- Data starts from Row 2
- No empty rows between data
- Column order doesn't have to match exactly (headers are matched by name)

## Testing Your File

Before importing a large file:

1. **Create a test file** with 2-3 items
2. **Import the test file**
3. **Verify items appear** correctly in the system
4. **Check all fields** are imported properly
5. **Then import** your full dataset

## Need the Template?

Click the **"Download Template"** button in the Items page to get a pre-formatted Excel file with:
- Correct column headers
- Sample data
- Proper formatting
- Ready to customize
