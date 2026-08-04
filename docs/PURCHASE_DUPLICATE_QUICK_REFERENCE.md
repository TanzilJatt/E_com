# Purchase Duplicate Handling - Quick Reference

## Decision Chart

```
Adding Item to Cart
        │
        ▼
  Already in Cart?
    │           │
   NO          YES
    │           │
    ▼           ▼
  ADD       Same Cost?
  NEW       │         │
           YES       NO
            │         │
            ▼         ▼
         UPDATE    ADD AS
         QTY      name_1
```

## Two Scenarios

### ✅ Scenario 1: Same Item + Same Cost

**Action**: Quantity **added** to existing cart entry

**Example:**
- In Cart: Laptop @ RS 40000, Qty 10
- Adding: Laptop @ RS 40000, Qty 5
- **Result**: Laptop @ RS 40000, Qty 15 (Updated)

**Message**: "Quantity updated! Added 5 more units"

---

### ✅ Scenario 2: Same Item + Different Cost

**Action**: New entry created with suffix

**Example:**
- In Cart: Laptop @ RS 40000
- Adding: Laptop @ RS 42000
- **Result**: New entry "Laptop_1" @ RS 42000

**Message**: "Item added as 'Laptop_1' due to different cost"

---

## Quick Examples

### Example 1: Bulk Order (Same Price)
```
Step 1: Add Mouse @ RS 450, Qty 20
Cart: [Mouse: 20 @ 450]

Step 2: Add Mouse @ RS 450, Qty 10
Cart: [Mouse: 30 @ 450] ✅ Merged
```

### Example 2: Price Comparison (Different Prices)
```
Step 1: Add Mouse @ RS 450, Qty 20
Cart: [Mouse: 20 @ 450]

Step 2: Add Mouse @ RS 500, Qty 15
Cart: [Mouse: 20 @ 450, Mouse_1: 15 @ 500] ✅ Separate
```

### Example 3: Multiple Variants
```
Step 1: Add Laptop @ RS 40000
Cart: [Laptop: 10 @ 40000]

Step 2: Add Laptop @ RS 42000
Cart: [Laptop: 10 @ 40000, Laptop_1: 8 @ 42000]

Step 3: Add Laptop @ RS 45000
Cart: [Laptop: 10 @ 40000, Laptop_1: 8 @ 42000, Laptop_2: 5 @ 45000]
```

## Benefits

| Benefit | Description |
|---------|-------------|
| 🚫 No Duplicates | Same items at same cost are merged |
| 💰 Cost Tracking | Different costs create separate entries |
| 🔄 Auto-Merge | No manual checking needed |
| 📊 Clear View | Easy to see all cost variants |

## When to Use

### Use Same Cost
- ✅ Regular supplier orders
- ✅ Split deliveries
- ✅ Consolidated purchases
- ✅ Stock replenishment

### Use Different Cost
- ✅ Price negotiations
- ✅ Multiple suppliers
- ✅ Bulk discounts
- ✅ Quality tiers

## Naming Pattern

```
Original:  Laptop
First:     Laptop_1
Second:    Laptop_2
Third:     Laptop_3
...
Max:       Laptop_99
```

## UI Location

Look for this info box on the Purchase page:

```
┌────────────────────────────────────────┐
│ 🔄 Smart Duplicate Handling:          │
│                                        │
│ • Same item + same cost: Qty added    │
│ • Same item + diff cost: Create _1    │
└────────────────────────────────────────┘
```

## Quick Tips

1. ✅ Same price = Merged automatically
2. ✅ Different price = Separate entries
3. ✅ Check cart before submitting
4. ✅ Use notes to explain cost differences
5. ✅ Maximum 99 variants per item

## Need More Info?

See full documentation: `PURCHASE_DUPLICATE_HANDLING.md`
