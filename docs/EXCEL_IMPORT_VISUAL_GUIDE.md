# Excel Import - Visual Flow Guide

## Complete Import Process

```
┌─────────────────────────────────────────────────────────────────┐
│                     USER ACTIONS                                 │
└─────────────────────────────────────────────────────────────────┘

    1. Click "Download Template"
           │
           ▼
    ┌──────────────────┐
    │  template.xlsx   │ ← Excel file with sample data
    └──────────────────┘
           │
           ▼
    2. Fill in data
           │
           ▼
    ┌──────────────────┐
    │  my_items.xlsx   │ ← Your inventory data
    └──────────────────┘
           │
           ▼
    3. Click "Import Excel"
           │
           ▼

┌─────────────────────────────────────────────────────────────────┐
│                  SYSTEM PROCESSING                               │
└─────────────────────────────────────────────────────────────────┘

    ┌────────────────────────────┐
    │ 1. Read Excel File         │
    └────────────┬───────────────┘
                 │
                 ▼
    ┌────────────────────────────┐
    │ 2. Fetch Current Items     │
    │    from Database           │
    └────────────┬───────────────┘
                 │
                 ▼
    ┌────────────────────────────┐
    │ 3. For Each Row:           │
    │    ┌───────────────────┐   │
    │    │ Validate Data     │   │
    │    └────────┬──────────┘   │
    │             │               │
    │             ▼               │
    │    ┌───────────────────┐   │
    │    │ Check Duplicate   │   │
    │    └────────┬──────────┘   │
    │             │               │
    │       ┌─────┴─────┐         │
    │       │           │         │
    │      NO          YES        │
    │       │           │         │
    │       ▼           ▼         │
    │    ┌─────┐  ┌──────────┐   │
    │    │ ADD │  │ Same     │   │
    │    │ NEW │  │ Price?   │   │
    │    └─────┘  └─────┬────┘   │
    │                   │         │
    │             ┌─────┴─────┐   │
    │            YES          NO   │
    │             │           │    │
    │             ▼           ▼    │
    │      ┌──────────┐ ┌────────┐│
    │      │ UPDATE   │ │ ADD    ││
    │      │ QUANTITY │ │ SUFFIX ││
    │      └──────────┘ └────────┘│
    └────────────────────────────┘
                 │
                 ▼
    ┌────────────────────────────┐
    │ 4. Show Results            │
    │    - Added: X items        │
    │    - Updated: Y items      │
    │    - Failed: Z items       │
    └────────────────────────────┘
```

## Decision Tree for Each Row

```
                    START
                      │
                      ▼
            ┌──────────────────┐
            │ Is name valid?   │
            └────────┬─────────┘
                     │
              ┌──────┴──────┐
             NO             YES
              │               │
              ▼               ▼
         ┌────────┐   ┌────────────────┐
         │ ERROR  │   │ Is price valid?│
         └────────┘   └────────┬───────┘
                               │
                        ┌──────┴──────┐
                       NO             YES
                        │               │
                        ▼               ▼
                   ┌────────┐   ┌─────────────────┐
                   │ ERROR  │   │ Is quantity OK? │
                   └────────┘   └────────┬────────┘
                                         │
                                  ┌──────┴──────┐
                                 NO             YES
                                  │               │
                                  ▼               ▼
                             ┌────────┐   ┌──────────────┐
                             │ ERROR  │   │ Name exists? │
                             └────────┘   └──────┬───────┘
                                                  │
                                           ┌──────┴──────┐
                                          NO             YES
                                           │               │
                                           ▼               ▼
                                    ┌───────────┐  ┌────────────┐
                                    │ ADD NEW   │  │ Same price?│
                                    │ ITEM      │  └──────┬─────┘
                                    └───────────┘         │
                                                   ┌──────┴──────┐
                                                  YES            NO
                                                   │              │
                                                   ▼              ▼
                                            ┌────────────┐ ┌─────────────┐
                                            │ UPDATE QTY │ │ ADD WITH    │
                                            │ (Add qty)  │ │ SUFFIX      │
                                            └────────────┘ │ (name_1)    │
                                                           └─────────────┘
```

## Duplicate Handling Scenarios

### Scenario A: Update Quantity

```
BEFORE IMPORT:
┌─────────┬──────────┬─────────┬──────────┐
│ SKU     │ Name     │ Price   │ Quantity │
├─────────┼──────────┼─────────┼──────────┤
│ SKU-001 │ Laptop   │ 45000   │ 10       │
└─────────┴──────────┴─────────┴──────────┘

EXCEL TO IMPORT:
┌──────────┬─────────┬──────────┐
│ name     │ price   │ quantity │
├──────────┼─────────┼──────────┤
│ Laptop   │ 45000   │ 5        │
└──────────┴─────────┴──────────┘

SYSTEM CHECKS:
✓ Name exists: YES
✓ Price matches: YES (45000 = 45000)
→ ACTION: Update quantity (10 + 5 = 15)

AFTER IMPORT:
┌─────────┬──────────┬─────────┬──────────┐
│ SKU     │ Name     │ Price   │ Quantity │
├─────────┼──────────┼─────────┼──────────┤
│ SKU-001 │ Laptop   │ 45000   │ 15       │ ✅ UPDATED
└─────────┴──────────┴─────────┴──────────┘

RESULT: "1 quantities updated"
```

### Scenario B: Add Variant

```
BEFORE IMPORT:
┌─────────┬──────────┬─────────┬──────────┐
│ SKU     │ Name     │ Price   │ Quantity │
├─────────┼──────────┼─────────┼──────────┤
│ SKU-001 │ Laptop   │ 45000   │ 10       │
└─────────┴──────────┴─────────┴──────────┘

EXCEL TO IMPORT:
┌──────────┬─────────┬──────────┐
│ name     │ price   │ quantity │
├──────────┼─────────┼──────────┤
│ Laptop   │ 50000   │ 8        │
└──────────┴─────────┴──────────┘

SYSTEM CHECKS:
✓ Name exists: YES
✗ Price matches: NO (45000 ≠ 50000)
→ ACTION: Create new item with suffix

SUFFIX GENERATION:
1. Try "Laptop_1" → Available ✓
2. Use "Laptop_1"

AFTER IMPORT:
┌─────────┬──────────┬─────────┬──────────┐
│ SKU     │ Name     │ Price   │ Quantity │
├─────────┼──────────┼─────────┼──────────┤
│ SKU-001 │ Laptop   │ 45000   │ 10       │
│ SKU-002 │ Laptop_1 │ 50000   │ 8        │ ✅ NEW
└─────────┴──────────┴─────────┴──────────┘

RESULT: "1 new items added"
```

### Scenario C: Multiple Variants

```
BEFORE IMPORT:
┌─────────┬──────────┬─────────┬──────────┐
│ SKU     │ Name     │ Price   │ Quantity │
├─────────┼──────────┼─────────┼──────────┤
│ SKU-001 │ Laptop   │ 45000   │ 10       │
│ SKU-002 │ Laptop_1 │ 50000   │ 8        │
└─────────┴──────────┴─────────┴──────────┘

EXCEL TO IMPORT:
┌──────────┬─────────┬──────────┐
│ name     │ price   │ quantity │
├──────────┼─────────┼──────────┤
│ Laptop   │ 55000   │ 5        │
└──────────┴─────────┴──────────┘

SYSTEM CHECKS:
✓ Name exists: YES
✗ Price matches: NO (45000 ≠ 55000)
→ ACTION: Create new item with suffix

SUFFIX GENERATION:
1. Try "Laptop_1" → Exists ✗
2. Try "Laptop_2" → Available ✓
3. Use "Laptop_2"

AFTER IMPORT:
┌─────────┬──────────┬─────────┬──────────┐
│ SKU     │ Name     │ Price   │ Quantity │
├─────────┼──────────┼─────────┼──────────┤
│ SKU-001 │ Laptop   │ 45000   │ 10       │
│ SKU-002 │ Laptop_1 │ 50000   │ 8        │
│ SKU-003 │ Laptop_2 │ 55000   │ 5        │ ✅ NEW
└─────────┴──────────┴─────────┴──────────┘

RESULT: "1 new items added"
```

### Scenario D: Mixed Import

```
BEFORE IMPORT:
┌─────────┬──────────┬─────────┬──────────┐
│ SKU     │ Name     │ Price   │ Quantity │
├─────────┼──────────┼─────────┼──────────┤
│ SKU-001 │ Mouse    │ 500     │ 20       │
│ SKU-002 │ Keyboard │ 1200    │ 15       │
└─────────┴──────────┴─────────┴──────────┘

EXCEL TO IMPORT:
┌──────────┬─────────┬──────────┐
│ name     │ price   │ quantity │
├──────────┼─────────┼──────────┤
│ Mouse    │ 500     │ 10       │ ← Match
│ Mouse    │ 800     │ 5        │ ← Variant
│ Keyboard │ 1200    │ 5        │ ← Match
│ Monitor  │ 15000   │ 8        │ ← New
└──────────┴─────────┴──────────┘

PROCESSING:
Row 1: Mouse @ 500
  ✓ Exists with same price → Update quantity

Row 2: Mouse @ 800
  ✓ Exists but different price → Add as "Mouse_1"

Row 3: Keyboard @ 1200
  ✓ Exists with same price → Update quantity

Row 4: Monitor @ 15000
  ✓ New item → Add normally

AFTER IMPORT:
┌─────────┬──────────┬─────────┬──────────┬──────────┐
│ SKU     │ Name     │ Price   │ Quantity │ Status   │
├─────────┼──────────┼─────────┼──────────┼──────────┤
│ SKU-001 │ Mouse    │ 500     │ 30       │ ✅ UPDATED│
│ SKU-002 │ Keyboard │ 1200    │ 20       │ ✅ UPDATED│
│ SKU-003 │ Mouse_1  │ 800     │ 5        │ ✅ ADDED  │
│ SKU-004 │ Monitor  │ 15000   │ 8        │ ✅ ADDED  │
└─────────┴──────────┴─────────┴──────────┴──────────┘

RESULT: "2 new items added, 2 quantities updated"
```

## Progress Tracking

```
┌─────────────────────────────────────────┐
│          Importing Items...             │
├─────────────────────────────────────────┤
│                                         │
│ Progress: 3 / 5                         │
│                                         │
│ ████████████████████░░░░░░░░ 60%       │
│                                         │
│ ✅ Row 2: Laptop - Quantity updated     │
│ ✅ Row 3: Mouse_1 - New item added      │
│ ❌ Row 4: Invalid price                 │
│                                         │
└─────────────────────────────────────────┘
```

## Success Messages

### Case 1: Only Additions
```
┌─────────────────────────────────────────┐
│ ✅ Success!                             │
├─────────────────────────────────────────┤
│ Successfully imported 5 items!          │
│                                         │
│ All items have been added to your      │
│ inventory.                              │
└─────────────────────────────────────────┘
```

### Case 2: Mixed (Additions + Updates)
```
┌─────────────────────────────────────────┐
│ ✅ Success!                             │
├─────────────────────────────────────────┤
│ Successfully processed 10 items!        │
│                                         │
│ 6 new items added,                     │
│ 4 quantities updated.                   │
└─────────────────────────────────────────┘
```

### Case 3: With Errors
```
┌─────────────────────────────────────────┐
│ ⚠️ Import completed with some errors   │
├─────────────────────────────────────────┤
│ 7 added, 3 updated, 2 failed.          │
│                                         │
│ Check error list for details.           │
└─────────────────────────────────────────┘
```

## Error Handling

```
Error Types:
┌──────────────────────────────────────────────┐
│ Row 5: Item name is required                 │
│ Row 8: Price must be positive                │
│ Row 12: Name must be 30 characters or less   │
│ Row 15: Too many items with name "Laptop"    │
│ Row 20: Generated name exceeds 30 characters │
└──────────────────────────────────────────────┘
```

## Summary Flow

```
USER → Download Template → Fill Data → Upload File
                                            │
                                            ▼
                                    System Validates
                                            │
                        ┌───────────────────┼──────────────────┐
                        │                   │                  │
                        ▼                   ▼                  ▼
                  Valid Items      Duplicate + Same     Duplicate + Diff
                                        Price                Price
                        │                   │                  │
                        ▼                   ▼                  ▼
                   Add New            Update Quantity    Add with Suffix
                                            │                  │
                                            └──────┬───────────┘
                                                   │
                                                   ▼
                                           Show Results
                                                   │
                                                   ▼
                                          Refresh Item List
```

## Key Takeaways

1. **Same Name + Same Price** = Quantity Update (Addition)
2. **Same Name + Different Price** = New Variant (_1, _2, ...)
3. **New Name** = Add Normally
4. **Errors** = Skip Row, Continue with Others
5. **Results** = Shows Added/Updated/Failed Counts
