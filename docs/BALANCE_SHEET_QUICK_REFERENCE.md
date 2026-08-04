# Balance Sheet - Quick Reference

## Quick Access

**From Items Page:** Click **"Balance Sheet"** button (top right)

**Direct URL:** `/balance`

## What You See

```
┌─────────────────────────────────────────────────────┐
│  SUMMARY CARDS                                      │
├─────────────┬─────────────┬─────────────┬──────────┤
│ Purchases   │ Sales       │ Net Flow    │ Inventory│
│ (Money OUT) │ (Money IN)  │ (Profit)    │ Value    │
│ RS 500k 📉  │ RS 750k 📈  │ RS 250k ✅  │ RS 1M    │
└─────────────┴─────────────┴─────────────┴──────────┘

┌─────────────────────────────────────────────────────┐
│  FILTERS                                            │
│  Search: [_______]  From: [____]  To: [____]       │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  TRANSACTIONS TABLE                                 │
│  Date │ Type │ Item │ Qty │ Money │ Balance        │
│  ──────────────────────────────────────────        │
│  1/29 │SALE  │Laptop│ -5  │ +250k │ 250k          │
│  1/28 │BUY   │Mouse │ +20 │ -9k   │ 0             │
└─────────────────────────────────────────────────────┘
```

## Understanding Columns

| Column | Meaning | Color Code |
|--------|---------|------------|
| **Date** | When transaction occurred | - |
| **Type** | PURCHASE or SALE | Red/Green badge |
| **Item** | Item name & SKU | - |
| **Qty Change** | +inventory or -inventory | Green (+) / Red (-) |
| **Money Flow** | Money in (+) or out (-) | Green (+) / Red (-) |
| **Balance** | Running total | - |

## Key Formulas

```
Net Flow = Total Sales - Total Purchases

Running Balance = Previous Balance + Current Money Flow

Inventory Value = Σ(Item Price × Item Quantity)
```

## Transaction Types

### Purchase (Red Badge)
```
Qty Change: +10 (inventory increases)
Money Flow: -RS 40000 (money goes out)
```

### Sale (Green Badge)
```
Qty Change: -5 (inventory decreases)
Money Flow: +RS 50000 (money comes in)
```

## Quick Examples

### Example 1: First Purchase
```
Purchase 10 Laptops @ RS 40000
├─ Qty: +10
├─ Money: -RS 400,000
└─ Balance: -RS 400,000
```

### Example 2: First Sale
```
Sell 5 Laptops @ RS 50000
├─ Qty: -5
├─ Money: +RS 250,000
└─ Balance: -RS 150,000
```

### Example 3: Profit Made
```
Starting Balance: -RS 150,000
Sell 3 more @ RS 50000
├─ Money: +RS 150,000
└─ Balance: RS 0 ✅ Break even!
```

## Reading the Balance

| Balance | Meaning |
|---------|---------|
| **Negative** | Money invested in inventory |
| **Zero** | Break even point |
| **Positive** | Net profit made |

## Search & Filter

### Search By:
- ✅ Item name
- ✅ SKU number
- ✅ Description

### Filter By:
- ✅ Date range
- ✅ Start date only
- ✅ End date only

## Export to PDF

Click **"Export PDF"** button

**Includes:**
- Summary statistics
- All filtered transactions
- Professional formatting
- Date-stamped filename

## Common Use Cases

### Daily Check
```
1. Open balance sheet
2. Verify yesterday's transactions
3. Check running balance
```

### Monthly Report
```
1. Set date filter to current month
2. Review net flow
3. Export PDF
```

### Item Tracking
```
1. Search for specific item
2. See all movements
3. Analyze performance
```

## Pro Tips

✅ **Check daily** for accurate records
✅ **Export monthly** for backup
✅ **Search by SKU** for specific items
✅ **Monitor net flow** for profitability
✅ **Use date filters** for periods

## Quick Troubleshooting

| Issue | Solution |
|-------|----------|
| Empty page | Record some purchases/sales first |
| Wrong numbers | Check if all transactions recorded |
| Can't find item | Clear filters and search |
| Negative balance | Normal - shows inventory investment |

## Integration

```
ITEMS PAGE
    ↓
  [Balance Sheet Button]
    ↓
BALANCE SHEET PAGE
    ↑
Shows history from:
- Purchase Page (money out, inventory in)
- Sales Page (money in, inventory out)
```

## Summary Stats Explained

### 1. Total Purchases (Red)
```
Sum of all purchase costs
= Money spent on inventory
```

### 2. Total Sales (Green)
```
Sum of all sales revenue
= Money earned from customers
```

### 3. Net Flow (Green/Red)
```
Sales - Purchases
= Profit (+) or Loss (-)
```

### 4. Inventory Value (Blue)
```
Current stock worth
= Σ(Price × Quantity)
```

## Quick Decision Making

### Selling Strategy
```
Have: Laptop @ RS 45000 (8 units)
Have: Laptop_1 @ RS 40000 (10 units)

Customer wants 5 units at RS 50000

Option A: Sell from Laptop
Profit: 5 × (50000 - 45000) = RS 25000

Option B: Sell from Laptop_1
Profit: 5 × (50000 - 40000) = RS 50000 ✅ Better!
```

### Purchasing Decision
```
Net Flow: RS 100,000 (positive)
Can afford new inventory!

Net Flow: -RS 50,000 (negative)
Need to sell more before buying
```

## Remember

- 📊 Balance Sheet = Financial Dashboard
- 📈 Green = Good (money in, inventory in)
- 📉 Red = Cost (money out, inventory out)
- ✅ Positive Balance = Profit
- ⚠️ Negative Balance = Investment

**Track everything, know your business!**
