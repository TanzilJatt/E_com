# Purchase Page - Smart Duplicate Handling

## Overview

The Purchase page now includes intelligent duplicate handling when adding existing items to the cart. This prevents accidental duplicate entries while allowing flexible cost management.

## How It Works

### Decision Flow

```
┌─────────────────────────────┐
│  Add Existing Item to Cart  │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│ Item already in cart?       │
└──────┬────────────┬─────────┘
       │            │
      NO           YES
       │            │
       ▼            ▼
   ┌───────┐  ┌──────────────────┐
   │ ADD   │  │ Same unit cost?  │
   │ NEW   │  └────┬──────┬──────┘
   └───────┘       │      │
                  YES    NO
                   │      │
                   ▼      ▼
              ┌─────────┐ ┌──────────────┐
              │ UPDATE  │ │ ADD WITH     │
              │ QTY     │ │ SUFFIX       │
              └─────────┘ │ (name_1, ..) │
                          └──────────────┘
```

## Scenario 1: Same Item, Same Unit Cost

**Action**: Quantity is **added** to existing cart entry

### Example

**Current Cart:**
```
┌──────────┬─────────┬──────────┬───────────┬────────────┐
│ Name     │ SKU     │ Quantity │ Unit Cost │ Total Cost │
├──────────┼─────────┼──────────┼───────────┼────────────┤
│ Laptop   │ SKU-001 │ 10       │ 40000     │ 400000     │
└──────────┴─────────┴──────────┴───────────┴────────────┘
```

**Add to Cart:**
- Item: Laptop (SKU-001)
- Quantity: 5
- Unit Cost: 40000

**Result:**
```
┌──────────┬─────────┬──────────┬───────────┬────────────┐
│ Name     │ SKU     │ Quantity │ Unit Cost │ Total Cost │
├──────────┼─────────┼──────────┼───────────┼────────────┤
│ Laptop   │ SKU-001 │ 15       │ 40000     │ 600000     │ ✅ UPDATED
└──────────┴─────────┴──────────┴───────────┴────────────┘
```

**Message**: "Quantity updated! Added 5 more units to existing item."

### Use Cases
- ✅ Buying same item from same supplier at same rate
- ✅ Split orders arriving separately
- ✅ Replenishing stock at consistent price
- ✅ Multiple purchases in same transaction

## Scenario 2: Same Item, Different Unit Cost

**Action**: New cart entry created with suffix (_1, _2, _3, etc.)

### Example 1: First Duplicate

**Current Cart:**
```
┌──────────┬─────────┬──────────┬───────────┬────────────┐
│ Name     │ SKU     │ Quantity │ Unit Cost │ Total Cost │
├──────────┼─────────┼──────────┼───────────┼────────────┤
│ Laptop   │ SKU-001 │ 10       │ 40000     │ 400000     │
└──────────┴─────────┴──────────┴───────────┴────────────┘
```

**Add to Cart:**
- Item: Laptop (SKU-001)
- Quantity: 8
- Unit Cost: 42000 (different!)

**Result:**
```
┌──────────┬───────────┬──────────┬───────────┬────────────┐
│ Name     │ SKU       │ Quantity │ Unit Cost │ Total Cost │
├──────────┼───────────┼──────────┼───────────┼────────────┤
│ Laptop   │ SKU-001   │ 10       │ 40000     │ 400000     │ ← Original
│ Laptop_1 │ SKU-001_1 │ 8        │ 42000     │ 336000     │ ✅ NEW
└──────────┴───────────┴──────────┴───────────┴────────────┘
```

**Message**: "Item added as 'Laptop_1' due to different cost."

### Example 2: Multiple Duplicates

**Current Cart:**
```
┌──────────┬───────────┬──────────┬───────────┬────────────┐
│ Name     │ SKU       │ Quantity │ Unit Cost │ Total Cost │
├──────────┼───────────┼──────────┼───────────┼────────────┤
│ Laptop   │ SKU-001   │ 10       │ 40000     │ 400000     │
│ Laptop_1 │ SKU-001_1 │ 8        │ 42000     │ 336000     │
└──────────┴───────────┴──────────┴───────────┴────────────┘
```

**Add to Cart:**
- Item: Laptop (SKU-001)
- Quantity: 5
- Unit Cost: 45000 (different again!)

**Result:**
```
┌──────────┬───────────┬──────────┬───────────┬────────────┐
│ Name     │ SKU       │ Quantity │ Unit Cost │ Total Cost │
├──────────┼───────────┼──────────┼───────────┼────────────┤
│ Laptop   │ SKU-001   │ 10       │ 40000     │ 400000     │ ← Original
│ Laptop_1 │ SKU-001_1 │ 8        │ 42000     │ 336000     │ ← First variant
│ Laptop_2 │ SKU-001_2 │ 5        │ 45000     │ 225000     │ ✅ NEW
└──────────┴───────────┴──────────┴───────────┴────────────┘
```

**Message**: "Item added as 'Laptop_2' due to different cost."

### Use Cases
- ✅ Price increases from supplier
- ✅ Different suppliers with different rates
- ✅ Bulk vs. individual pricing
- ✅ Special deals or discounts
- ✅ Quality tiers (standard, premium)

## Mixed Scenario: Adding Multiple Items

### Example

**Starting Cart (Empty)**

**Add 1:**
- Item: Mouse (SKU-002)
- Quantity: 20
- Unit Cost: 450

**Cart After Add 1:**
```
┌──────────┬─────────┬──────────┬───────────┬────────────┐
│ Name     │ SKU     │ Quantity │ Unit Cost │ Total Cost │
├──────────┼─────────┼──────────┼───────────┼────────────┤
│ Mouse    │ SKU-002 │ 20       │ 450       │ 9000       │
└──────────┴─────────┴──────────┴───────────┴────────────┘
```

**Add 2:**
- Item: Mouse (SKU-002)
- Quantity: 10
- Unit Cost: 450 (same cost)

**Cart After Add 2:**
```
┌──────────┬─────────┬──────────┬───────────┬────────────┐
│ Name     │ SKU     │ Quantity │ Unit Cost │ Total Cost │
├──────────┼─────────┼──────────┼───────────┼────────────┤
│ Mouse    │ SKU-002 │ 30       │ 450       │ 13500      │ ✅ UPDATED
└──────────┴─────────┴──────────┴───────────┴────────────┘
```

**Add 3:**
- Item: Mouse (SKU-002)
- Quantity: 15
- Unit Cost: 500 (different cost)

**Cart After Add 3:**
```
┌──────────┬───────────┬──────────┬───────────┬────────────┐
│ Name     │ SKU       │ Quantity │ Unit Cost │ Total Cost │
├──────────┼───────────┼──────────┼───────────┼────────────┤
│ Mouse    │ SKU-002   │ 30       │ 450       │ 13500      │ ← Original
│ Mouse_1  │ SKU-002_1 │ 15       │ 500       │ 7500       │ ✅ NEW
└──────────┴───────────┴──────────┴───────────┴────────────┘
```

**Add 4:**
- Item: Keyboard (SKU-003)
- Quantity: 10
- Unit Cost: 1100

**Final Cart:**
```
┌──────────┬───────────┬──────────┬───────────┬────────────┐
│ Name     │ SKU       │ Quantity │ Unit Cost │ Total Cost │
├──────────┼───────────┼──────────┼───────────┼────────────┤
│ Mouse    │ SKU-002   │ 30       │ 450       │ 13500      │
│ Mouse_1  │ SKU-002_1 │ 15       │ 500       │ 7500       │
│ Keyboard │ SKU-003   │ 10       │ 1100      │ 11000      │ ✅ NEW
└──────────┴───────────┴──────────┴───────────┴────────────┘
```

## Benefits

### 1. **Prevents Accidental Duplicates**
- No need to manually check cart before adding
- System automatically merges or creates variants
- Reduces user errors

### 2. **Flexible Cost Management**
- Track same item at different prices
- Useful for price fluctuations
- Maintains cost history per transaction

### 3. **Easy Cart Management**
- Same items with same cost are consolidated
- Different costs are separated clearly
- Clear naming convention for variants

### 4. **Business Value**
- Track supplier price variations
- Monitor cost trends
- Accurate cost accounting
- Better inventory valuation

## Technical Details

### Comparison Logic

Items are considered the same if:
- `itemId` matches (same item from inventory)
- `unitCost` matches exactly (same price)

If both match → Update quantity
If only `itemId` matches → Create variant with suffix

### Suffix Generation

- Starts at _1, increments to _2, _3, etc.
- Maximum 99 variants (safety limit)
- SKU also gets suffix (SKU-001 → SKU-001_1)
- Name length validation (max 30 characters including suffix)

### Success Messages

1. **Quantity Updated**: "Quantity updated! Added X more units to existing item."
2. **Variant Created**: "Item added as 'name_1' due to different cost."
3. **Normal Add**: No special message (regular add to cart)

### Error Handling

1. **Too Many Variants**: "Too many variants of 'ItemName' in cart" (limit: 99)
2. **Name Too Long**: "Generated name 'ItemName_X' exceeds 30 characters"

## UI Indicators

### Info Box (Always Visible)
```
┌────────────────────────────────────────────────────────┐
│ 🔄 Smart Duplicate Handling:                          │
│                                                        │
│ • Same item + same cost: Quantity added to existing   │
│ • Same item + different cost: New entry as "name_1"   │
└────────────────────────────────────────────────────────┘
```

### Success Message (After Add)
```
┌────────────────────────────────────────────────────────┐
│ ✅ Quantity updated! Added 5 more units to existing    │
│    item.                                               │
└────────────────────────────────────────────────────────┘
```

OR

```
┌────────────────────────────────────────────────────────┐
│ ✅ Item added as "Laptop_1" due to different cost.     │
└────────────────────────────────────────────────────────┘
```

## When Items Go to Inventory

When you submit the purchase:
- Items with suffixes (_1, _2) keep their modified names in the cart
- When added to inventory, the system's duplicate handling applies again
- If an item "Laptop_1" is added to inventory:
  - And "Laptop" exists with same price → quantity updated
  - And "Laptop" exists with different price → "Laptop_1" kept as is, or new suffix added

This creates a seamless flow from purchase to inventory management.

## Comparison with Excel Import

| Feature | Purchase Cart | Excel Import |
|---------|---------------|--------------|
| Duplicate Check | Same itemId + unitCost | Same name + price |
| Update Action | Add to quantity | Add to quantity |
| Variant Creation | name_1, name_2... | name_1, name_2... |
| Scope | Within cart session | Existing inventory |
| Persistence | Temporary (cart) | Permanent (database) |

## Best Practices

### When to Add Same Cost
✅ Receiving delivery from same supplier
✅ Split shipments at same rate
✅ Consolidated purchase at fixed price
✅ Regular restocking orders

### When to Use Different Cost
✅ Supplier price change during purchase
✅ Comparing quotes from multiple suppliers
✅ Special pricing or bulk discounts
✅ Different quality/specification levels

### Managing Variants
1. Review cart before submission
2. Rename variants manually if needed (before submitting)
3. Consider if different costs warrant separate purchase records
4. Use notes field to explain cost differences

## Examples by Scenario

### Scenario: Restocking from Regular Supplier
```
Action 1: Add Laptop @ 40000, Qty 10
Action 2: Add Laptop @ 40000, Qty 5
Result: Single entry with Qty 15 ✅
Benefit: Clean cart, single line item
```

### Scenario: Price Negotiation
```
Action 1: Add Laptop @ 45000, Qty 10 (initial quote)
Action 2: Add Laptop @ 42000, Qty 10 (negotiated price)
Result: Two entries (Laptop, Laptop_1) ✅
Benefit: Compare both options, choose best
```

### Scenario: Multi-Supplier Purchase
```
Action 1: Add Mouse @ 450, Qty 20 (Supplier A)
Action 2: Add Mouse @ 500, Qty 15 (Supplier B)
Result: Two entries (Mouse, Mouse_1) ✅
Benefit: Track supplier-specific costs
```

## Summary

The smart duplicate handling in the purchase cart ensures:
- ✅ No accidental duplicates
- ✅ Automatic quantity consolidation
- ✅ Clear cost tracking for variants
- ✅ Seamless user experience
- ✅ Flexible purchase management

This feature works seamlessly with the existing purchase workflow and requires no additional configuration.
