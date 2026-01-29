# Excel Import - Duplicate Handling Guide

## Overview

The Excel import system intelligently handles duplicate item names to prevent data loss and allow flexible inventory management.

## How It Works

### Decision Flow

```
┌─────────────────────────────┐
│  Import Item from Excel     │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│ Does item name exist?       │
└──────┬───────────┬──────────┘
       │           │
      NO          YES
       │           │
       ▼           ▼
   ┌───────┐  ┌──────────────────┐
   │ ADD   │  │ Same price too?  │
   │ NEW   │  └────┬──────┬──────┘
   │ ITEM  │       │      │
   └───────┘      YES    NO
                   │      │
                   ▼      ▼
              ┌─────────┐ ┌──────────────┐
              │ UPDATE  │ │ ADD NEW ITEM │
              │ QTY     │ │ WITH SUFFIX  │
              └─────────┘ └──────────────┘
```

## Scenario 1: Same Name + Same Price

**Action**: Quantity is **added** to existing item

### Example

**Before Import:**
```
┌─────────┬──────────┬─────────┬──────────┐
│ SKU     │ Name     │ Price   │ Quantity │
├─────────┼──────────┼─────────┼──────────┤
│ SKU-001 │ Laptop   │ 45000   │ 10       │
└─────────┴──────────┴─────────┴──────────┘
```

**Excel File to Import:**
```
┌──────────┬─────────┬──────────┐
│ name     │ price   │ quantity │
├──────────┼─────────┼──────────┤
│ Laptop   │ 45000   │ 5        │
└──────────┴─────────┴──────────┘
```

**After Import:**
```
┌─────────┬──────────┬─────────┬──────────┐
│ SKU     │ Name     │ Price   │ Quantity │
├─────────┼──────────┼─────────┼──────────┤
│ SKU-001 │ Laptop   │ 45000   │ 15       │ ← Updated!
└─────────┴──────────┴─────────┴──────────┘
```

**Result**: Quantity increased from 10 to 15 (10 + 5)

### Use Case
- **Restocking**: Import supplier delivery to add to existing inventory
- **Multi-location imports**: Combine inventory from different locations
- **Incremental updates**: Add stock without manual calculation

## Scenario 2: Same Name + Different Price

**Action**: New item created with numeric suffix (_1, _2, _3, etc.)

### Example 1: First Duplicate

**Before Import:**
```
┌─────────┬──────────┬─────────┬──────────┐
│ SKU     │ Name     │ Price   │ Quantity │
├─────────┼──────────┼─────────┼──────────┤
│ SKU-001 │ Laptop   │ 45000   │ 10       │
└─────────┴──────────┴─────────┴──────────┘
```

**Excel File to Import:**
```
┌──────────┬─────────┬──────────┐
│ name     │ price   │ quantity │
├──────────┼─────────┼──────────┤
│ Laptop   │ 50000   │ 8        │
└──────────┴─────────┴──────────┘
```

**After Import:**
```
┌─────────┬──────────┬─────────┬──────────┐
│ SKU     │ Name     │ Price   │ Quantity │
├─────────┼──────────┼─────────┼──────────┤
│ SKU-001 │ Laptop   │ 45000   │ 10       │ ← Original
│ SKU-002 │ Laptop_1 │ 50000   │ 8        │ ← New!
└─────────┴──────────┴─────────┴──────────┘
```

### Example 2: Multiple Duplicates

**Before Import:**
```
┌─────────┬──────────┬─────────┬──────────┐
│ SKU     │ Name     │ Price   │ Quantity │
├─────────┼──────────┼─────────┼──────────┤
│ SKU-001 │ Laptop   │ 45000   │ 10       │
│ SKU-002 │ Laptop_1 │ 50000   │ 8        │
└─────────┴──────────┴─────────┴──────────┘
```

**Excel File to Import:**
```
┌──────────┬─────────┬──────────┐
│ name     │ price   │ quantity │
├──────────┼─────────┼──────────┤
│ Laptop   │ 55000   │ 5        │
└──────────┴─────────┴──────────┘
```

**After Import:**
```
┌─────────┬──────────┬─────────┬──────────┐
│ SKU     │ Name     │ Price   │ Quantity │
├─────────┼──────────┼─────────┼──────────┤
│ SKU-001 │ Laptop   │ 45000   │ 10       │ ← Original
│ SKU-002 │ Laptop_1 │ 50000   │ 8        │ ← First variant
│ SKU-003 │ Laptop_2 │ 55000   │ 5        │ ← New variant!
└─────────┴──────────┴─────────┴──────────┘
```

### Use Case
- **Different specifications**: Same product with different configs (different RAM, storage)
- **Price changes over time**: Keep history of items purchased at different prices
- **Multiple suppliers**: Same product from different vendors at different prices
- **Quality tiers**: Standard, premium, deluxe versions

## Scenario 3: Mixed Import

**Before Import:**
```
┌─────────┬──────────┬─────────┬──────────┐
│ SKU     │ Name     │ Price   │ Quantity │
├─────────┼──────────┼─────────┼──────────┤
│ SKU-001 │ Mouse    │ 500     │ 20       │
│ SKU-002 │ Keyboard │ 1200    │ 15       │
└─────────┴──────────┴─────────┴──────────┘
```

**Excel File to Import:**
```
┌──────────┬─────────┬──────────┐
│ name     │ price   │ quantity │
├──────────┼─────────┼──────────┤
│ Mouse    │ 500     │ 10       │ ← Same name, same price
│ Mouse    │ 800     │ 5        │ ← Same name, diff price
│ Keyboard │ 1200    │ 5        │ ← Same name, same price
│ Monitor  │ 15000   │ 8        │ ← New item
└──────────┴─────────┴──────────┘
```

**After Import:**
```
┌─────────┬──────────┬─────────┬──────────┬────────────────────┐
│ SKU     │ Name     │ Price   │ Quantity │ Action             │
├─────────┼──────────┼─────────┼──────────┼────────────────────┤
│ SKU-001 │ Mouse    │ 500     │ 30       │ QTY Updated (+10)  │
│ SKU-002 │ Keyboard │ 1200    │ 20       │ QTY Updated (+5)   │
│ SKU-003 │ Mouse_1  │ 800     │ 5        │ Added (new price)  │
│ SKU-004 │ Monitor  │ 15000   │ 8        │ Added (new item)   │
└─────────┴──────────┴─────────┴──────────┴────────────────────┘
```

## Benefits

### 1. **Prevents Data Loss**
- No accidental overwrites of items with different prices
- Price history is preserved
- All imported data is retained

### 2. **Flexible Stock Management**
- Easy stock replenishment (same name + same price)
- Handles price variations (same name + different price)
- Supports incremental imports

### 3. **Automatic Conflict Resolution**
- No manual intervention required
- Clear naming convention for variants
- Predictable behavior

### 4. **Business Use Cases**
- Track same product at different price points
- Manage product variants (size, color, specs)
- Historical pricing for cost analysis
- Multi-supplier inventory

## Naming Convention

### Suffix Pattern
```
Original:  Laptop
First:     Laptop_1
Second:    Laptop_2
Third:     Laptop_3
...
Max:       Laptop_99
```

### Safety Limits
- Maximum suffix: 99 (prevents infinite loops)
- Maximum name length: 30 characters (including suffix)
- If suffix exceeds limits, import fails with clear error message

## Best Practices

### When to Use Same Name + Same Price
✅ Restocking existing inventory
✅ Adding stock from multiple sources
✅ Incremental inventory updates
✅ Regular supplier deliveries

### When to Use Same Name + Different Price
✅ Different product variants (size, color, model)
✅ Price changes over time
✅ Different suppliers with different costs
✅ Quality tiers (standard, premium)

### Managing Variants
1. **Option A**: Use different names
   - "Laptop 8GB"
   - "Laptop 16GB"

2. **Option B**: Use same name, different prices
   - "Laptop" @ 45000 → stays as "Laptop"
   - "Laptop" @ 50000 → becomes "Laptop_1"

3. **Option C**: Use description field
   - Name: "Laptop"
   - Description: "8GB RAM, 256GB SSD"

## Examples by Industry

### Electronics Store
```
Import 1: "iPhone" @ 80000, Qty 10
Import 2: "iPhone" @ 80000, Qty 5   → Result: Qty becomes 15
Import 3: "iPhone" @ 85000, Qty 8   → Result: New item "iPhone_1"
```

### Office Supplies
```
Import 1: "Paper A4" @ 500, Qty 100
Import 2: "Paper A4" @ 500, Qty 50  → Result: Qty becomes 150
Import 3: "Paper A4" @ 600, Qty 75  → Result: New item "Paper A4_1"
```

### Restaurant Inventory
```
Import 1: "Olive Oil" @ 800, Qty 20
Import 2: "Olive Oil" @ 800, Qty 10  → Result: Qty becomes 30
Import 3: "Olive Oil" @ 1000, Qty 15 → Result: New item "Olive Oil_1" (premium brand)
```

## Troubleshooting

### Problem: Too many variants created
**Cause**: Importing same item with slightly different prices
**Solution**: 
- Standardize prices in Excel before import
- Round prices to avoid minor variations
- Use manual entry for items with price variations

### Problem: Items not updating quantity
**Cause**: Prices don't match exactly
**Solution**:
- Check for decimal differences (45000.00 vs 45000)
- Ensure price format is consistent in Excel
- Review existing item prices before import

### Problem: Name exceeds 30 characters with suffix
**Cause**: Base name is too long
**Solution**:
- Shorten the base name before import
- Use abbreviations
- Move details to description field

## Summary

| Condition | Action | Example |
|-----------|--------|---------|
| New item | Add new | "Mouse" → Added as "Mouse" |
| Existing name + Same price | Update quantity (add) | "Mouse" @ 500 (Qty 10) + Import (Qty 5) = 15 |
| Existing name + Diff price | Add with suffix | "Mouse" @ 500 exists → Import @ 800 = "Mouse_1" |
| Multiple same imports | Increment suffix | "Mouse_1" exists → "Mouse_2", then "Mouse_3"... |

The duplicate handling system ensures your data is preserved while providing flexible import options for various business scenarios.
