# Purchase Page - Inventory Price Comparison Enhancement

## Overview

The Purchase page now includes **enhanced duplicate handling** that compares the purchase cost with the item's **inventory selling price**. This ensures that when you purchase an item at a different price than what it's sold for, the system automatically creates a variant.

## Why This Matters

### Business Scenario

You have a Laptop in inventory with:
- **Selling Price**: RS 45,000 (what you sell it for)
- **Current Stock**: 10 units

Now you're purchasing more:
- **Scenario A**: You buy at RS 40,000 (wholesale/bulk discount)
- **Scenario B**: You buy at RS 45,000 (same as selling price)
- **Scenario C**: You buy at RS 48,000 (supplier increased price)

The system needs to handle these differently because:
1. Different purchase costs affect profit margins
2. You need to track cost variations for accounting
3. Price history helps in supplier comparison

## How It Works Now

### Enhanced Logic

```
User selects existing item from inventory
User enters purchase cost
         ↓
System compares with INVENTORY PRICE
         ↓
    Different?
    ↙       ↘
  YES        NO
   ↓          ↓
Add with   Check cart for
suffix     same cost
(_1, _2)      ↓
           Found?
           ↙    ↘
         YES    NO
          ↓      ↓
        Merge  Add new
        Qty    entry
```

### Decision Flow

```
┌─────────────────────────────────────────────┐
│ User adds existing item to purchase cart   │
└───────────────┬─────────────────────────────┘
                │
                ▼
┌───────────────────────────────────────────────┐
│ Compare purchase cost with inventory price   │
└───────────┬───────────────────────────────────┘
            │
        ┌───┴───┐
     SAME    DIFFERENT
        │        │
        ▼        ▼
   ┌────────┐ ┌─────────────────┐
   │Check   │ │ADD WITH SUFFIX  │
   │Cart    │ │(name_1, _2...)  │
   └───┬────┘ └─────────────────┘
       │
   ┌───┴───┐
  Found  Not Found
   │        │
   ▼        ▼
┌──────┐ ┌────────┐
│MERGE │ │ADD NEW │
│ QTY  │ │ ENTRY  │
└──────┘ └────────┘
```

## Examples

### Example 1: Purchase at Same Price as Inventory

**Inventory:**
```
Item: Laptop (SKU-001)
Selling Price: RS 45000
Stock: 10
```

**Purchase Action:**
```
Select: Laptop (SKU-001)
Qty: 5
Purchase Cost: RS 45000 (same as selling price)
```

**Result:**
```
┌──────────┬───────────┬──────┬──────────┬────────────┐
│ Name     │ SKU       │ Qty  │ Cost     │ Total      │
├──────────┼───────────┼──────┼──────────┼────────────┤
│ Laptop   │ SKU-001   │ 5    │ 45000    │ 225000     │
└──────────┴───────────┴──────┴──────────┴────────────┘
```
**Message**: Item added normally (or merged if already in cart)

### Example 2: Purchase at Different Price (Lower)

**Inventory:**
```
Item: Laptop (SKU-001)
Selling Price: RS 45000
Stock: 10
```

**Purchase Action:**
```
Select: Laptop (SKU-001)
Qty: 8
Purchase Cost: RS 40000 (cheaper - wholesale discount)
```

**Result:**
```
┌──────────┬───────────┬──────┬──────────┬────────────┐
│ Name     │ SKU       │ Qty  │ Cost     │ Total      │
├──────────┼───────────┼──────┼──────────┼────────────┤
│ Laptop_1 │ SKU-001_1 │ 8    │ 40000    │ 320000     │ ✅ NEW
└──────────┴───────────┴──────┴──────────┴────────────┘
```
**Message**: "Item added as 'Laptop_1' - Purchase cost (RS 40000) differs from inventory price (RS 45000)."

### Example 3: Purchase at Different Price (Higher)

**Inventory:**
```
Item: Laptop (SKU-001)
Selling Price: RS 45000
Stock: 10
```

**Purchase Action:**
```
Select: Laptop (SKU-001)
Qty: 5
Purchase Cost: RS 48000 (supplier increased price)
```

**Result:**
```
┌──────────┬───────────┬──────┬──────────┬────────────┐
│ Name     │ SKU       │ Qty  │ Cost     │ Total      │
├──────────┼───────────┼──────┼──────────┼────────────┤
│ Laptop_1 │ SKU-001_1 │ 5    │ 48000    │ 240000     │ ✅ NEW
└──────────┴───────────┴──────┴──────────┴────────────┘
```
**Message**: "Item added as 'Laptop_1' - Purchase cost (RS 48000) differs from inventory price (RS 45000)."

### Example 4: Multiple Purchases at Different Costs

**Inventory:**
```
Item: Mouse (SKU-002)
Selling Price: RS 500
Stock: 20
```

**Purchase Sequence:**

**Action 1:** Purchase at RS 450 (bulk discount)
```
Cart:
┌─────────┬───────────┬──────┬──────┬────────┐
│ Mouse_1 │ SKU-002_1 │ 20   │ 450  │ 9000   │
└─────────┴───────────┴──────┬──────┴────────┘
```

**Action 2:** Purchase at RS 500 (same as inventory)
```
Cart:
┌─────────┬───────────┬──────┬──────┬────────┐
│ Mouse_1 │ SKU-002_1 │ 20   │ 450  │ 9000   │
│ Mouse   │ SKU-002   │ 10   │ 500  │ 5000   │ ← New
└─────────┴───────────┴──────┴──────┴────────┘
```

**Action 3:** Purchase at RS 500 again (merge with previous)
```
Cart:
┌─────────┬───────────┬──────┬──────┬────────┐
│ Mouse_1 │ SKU-002_1 │ 20   │ 450  │ 9000   │
│ Mouse   │ SKU-002   │ 15   │ 500  │ 7500   │ ← Merged
└─────────┴───────────┴──────┴──────┴────────┘
```

**Action 4:** Purchase at RS 550 (price increase)
```
Cart:
┌─────────┬───────────┬──────┬──────┬────────┐
│ Mouse_1 │ SKU-002_1 │ 20   │ 450  │ 9000   │
│ Mouse   │ SKU-002   │ 15   │ 500  │ 7500   │
│ Mouse_2 │ SKU-002_2 │ 5    │ 550  │ 2750   │ ← New
└─────────┴───────────┴──────┴──────┴────────┘
```

## Benefits

### 1. **Automatic Cost Tracking**
- No manual checking needed
- System automatically identifies price variations
- Clear naming for different cost points

### 2. **Profit Margin Analysis**
```
Example:
Inventory Price: RS 45000 (selling price)
Purchase Cost 1: RS 40000 → Margin: RS 5000 (11%)
Purchase Cost 2: RS 42000 → Margin: RS 3000 (7%)
Purchase Cost 3: RS 48000 → Loss: -RS 3000 (-6%)
```

### 3. **Supplier Comparison**
```
Item: Laptop
Supplier A: RS 40000 (Mouse_1)
Supplier B: RS 42000 (Mouse_2)
Supplier C: RS 38000 (Mouse_3)
→ Clear comparison in purchase record
```

### 4. **Historical Cost Tracking**
- Every purchase at different cost creates a record
- Easy to see cost trends over time
- Helps in price negotiation

### 5. **Accounting Accuracy**
- Different purchase costs properly separated
- Weighted average cost can be calculated
- Better inventory valuation

## UI Indicators

### Info Box (Always Visible)

```
┌────────────────────────────────────────────────────────┐
│ 🔄 Smart Duplicate Handling:                          │
│                                                        │
│ • Same cost as inventory price:                       │
│   Quantity added to existing entry (if any)           │
│                                                        │
│ • Different cost from inventory price:                │
│   New entry created as "name_1", "name_2", etc.       │
│                                                        │
│ • Note: Purchase cost is compared with item's         │
│   inventory selling price                             │
└────────────────────────────────────────────────────────┘
```

### Success Messages

**Same as Inventory Price:**
```
✅ Item added to cart
```
or
```
✅ Quantity updated! Added 5 more units to existing item.
```

**Different from Inventory Price:**
```
✅ Item added as "Laptop_1" - Purchase cost (RS 40000) 
   differs from inventory price (RS 45000).
```

## Comparison Table

| Situation | Purchase Cost | Inventory Price | Action | Result |
|-----------|---------------|-----------------|--------|--------|
| Normal purchase | RS 40000 | RS 45000 | Different | Laptop_1 created |
| Bulk order | RS 40000 | RS 45000 | Different | Laptop_1 created |
| Same price | RS 45000 | RS 45000 | Same | Merged or added as Laptop |
| Price increase | RS 48000 | RS 45000 | Different | Laptop_1 created |
| Second purchase | RS 40000 | RS 45000 | Different | Laptop_2 created |

## Real-World Scenarios

### Scenario 1: Bulk Purchase Discount

**Context**: You get a 10% discount for buying 50+ units

```
Inventory: Mouse @ RS 500
Purchase 1: 60 units @ RS 450 (10% off)
→ Result: Mouse_1 @ RS 450

Later, regular order:
Purchase 2: 20 units @ RS 500 (regular price)
→ Result: Mouse @ RS 500
```

**Analysis**: You can see which items were bought at discount vs regular price.

### Scenario 2: Supplier Price Change

**Context**: Supplier increased prices mid-year

```
Inventory: Keyboard @ RS 1200
Q1 Purchase: 30 units @ RS 1100
→ Result: Keyboard_1 @ RS 1100

Q2 Purchase: 25 units @ RS 1150 (price increase)
→ Result: Keyboard_2 @ RS 1150

Q3 Purchase: 30 units @ RS 1150 (same as Q2)
→ Result: Keyboard_2 @ RS 1150 (merged with Q2)
```

**Analysis**: Clear record of when prices changed.

### Scenario 3: Multiple Suppliers

**Context**: You buy from different suppliers at different rates

```
Inventory: Cable @ RS 200
Supplier A: 100 units @ RS 150
→ Result: Cable_1 @ RS 150

Supplier B: 75 units @ RS 160
→ Result: Cable_2 @ RS 160

Supplier C: 50 units @ RS 145 (cheapest!)
→ Result: Cable_3 @ RS 145
```

**Analysis**: Easy to identify best supplier.

## Technical Details

### Comparison Logic

```typescript
// Compare purchase cost with inventory selling price
const isDifferentFromInventoryPrice = cost !== item.price

if (isDifferentFromInventoryPrice) {
  // Add suffix regardless of cart status
  itemName = `${item.name}_${suffix}`
} else {
  // Check cart for merging opportunity
  if (existsInCartWithSameCost) {
    // Merge quantities
  } else {
    // Add normally
  }
}
```

### Suffix Generation

- Starts at _1, increments to _2, _3, etc.
- Maximum 99 variants
- SKU also gets suffix (SKU-001_1)
- Name validation (max 30 chars including suffix)

### Price Comparison

- Direct numeric comparison
- Handles decimal precision (40000.00 = 40000)
- Case-insensitive for name matching
- Exact match required for merging

## Best Practices

### When to Use Same Price

✅ **Use inventory price when:**
- Receiving samples or test units
- Internal transfers
- Returns or refunds
- Price testing

### When Price Differs

✅ **Different prices occur when:**
- Bulk discounts applied
- Seasonal promotions
- Supplier price changes
- Quality/specification differences
- Different payment terms (cash vs credit)

### Managing Variants

1. **Review before submitting**
   - Check if all cost variants make sense
   - Verify quantities are correct
   - Remove duplicates if needed

2. **Use notes field**
   - Explain why costs differ
   - Note supplier or deal type
   - Reference PO numbers

3. **Regular cleanup**
   - Review purchase history
   - Identify cost trends
   - Negotiate with suppliers

## Troubleshooting

### Q: Why is suffix added when I want to merge?

**A**: Purchase cost differs from inventory price. To merge:
1. Check inventory selling price
2. Enter exact same price
3. Item will merge with existing entry

### Q: Too many variants created

**A**: This happens when purchase costs vary frequently:
- **Solution**: Standardize pricing with suppliers
- **Alternative**: Review and negotiate better rates
- **Workaround**: Remove extra variants before submitting

### Q: Name too long with suffix

**A**: Base name + suffix exceeds 30 characters:
- **Solution**: Use shorter base names
- **Alternative**: Abbreviate product names
- **Note**: Happens at suffix _10 and above

## Summary

✅ **Enhanced duplicate handling now:**
1. Compares purchase cost with **inventory selling price**
2. Creates variants automatically when costs differ
3. Merges quantities when costs match
4. Provides clear feedback with detailed messages
5. Helps track cost variations and profit margins

This ensures accurate cost tracking and better purchase management!
