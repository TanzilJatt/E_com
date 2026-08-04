# Balance Sheet with Variants - Complete Integration

## Overview

The Balance Sheet seamlessly integrates with the variant system (Laptop_1, Laptop_2, etc.) to provide complete tracking of inventory purchases at different costs.

## How Variants Appear in Balance Sheet

### Scenario: Laptop with Multiple Purchase Costs

**Step 1: Initial Inventory**

```
Items Page:
┌──────────┬─────────┬────────┬───────┐
│ Laptop   │ SKU-001 │ 45000  │ 10    │
└──────────┴─────────┴────────┴───────┘
```

**Step 2: Purchase at Different Cost**

```
Purchase Page:
- Select: Laptop (SKU-001)
- Qty: 8
- Cost: RS 40000 (different from inventory RS 45000)
- Result: Added to cart as "Laptop_1"
```

**Step 3: Complete Purchase**

```
System creates NEW inventory item:

Items Page After Purchase:
┌──────────┬─────────┬────────┬───────┐
│ Laptop   │ SKU-001 │ 45000  │ 10    │
│ Laptop_1 │ SKU-002 │ 40000  │ 8     │ ← NEW!
└──────────┴─────────┴────────┴───────┘
```

**Step 4: Balance Sheet View**

```
Balance Sheet:
┌──────┬─────────┬──────────┬─────────┬────────────┬─────────┐
│ Date │ Type    │ Item     │ Qty Chg │ Money Flow │ Balance │
├──────┼─────────┼──────────┼─────────┼────────────┼─────────┤
│ 1/29 │PURCHASE │ Laptop_1 │ +8      │ -RS 320k   │ -320k   │
└──────┴─────────┴──────────┴─────────┴────────────┴─────────┘

Laptop_1 is tracked separately! ✅
```

## Complete Lifecycle Example

### Day-by-Day Tracking

**DAY 1: Purchase Original**
```
Purchase: Laptop @ RS 45000, Qty 10

Items:
┌──────────┬────────┬──────┐
│ Laptop   │ 45000  │ 10   │
└──────────┴────────┴──────┘

Balance Sheet:
┌──────┬─────────┬────────┬──────┬─────────┬─────────┐
│ 1/27 │PURCHASE │ Laptop │ +10  │ -450k   │ -450k   │
└──────┴─────────┴────────┴──────┴─────────┴─────────┘
```

---

**DAY 2: Purchase Variant (Discount)**
```
Purchase: Laptop @ RS 40000, Qty 8 → Becomes "Laptop_1"

Items:
┌──────────┬────────┬──────┐
│ Laptop   │ 45000  │ 10   │
│ Laptop_1 │ 40000  │ 8    │ ← NEW
└──────────┴────────┴──────┘

Balance Sheet:
┌──────┬─────────┬──────────┬──────┬─────────┬─────────┐
│ 1/28 │PURCHASE │ Laptop_1 │ +8   │ -320k   │ -770k   │
│ 1/27 │PURCHASE │ Laptop   │ +10  │ -450k   │ -450k   │
└──────┴─────────┴──────────┴──────┴─────────┴─────────┘
```

---

**DAY 3: Sell from Laptop_1 (Better Margin)**
```
Sale: Laptop_1 @ RS 50000, Qty 5

Items:
┌──────────┬────────┬──────┐
│ Laptop   │ 45000  │ 10   │
│ Laptop_1 │ 40000  │ 3    │ ← Reduced
└──────────┴────────┴──────┘

Balance Sheet:
┌──────┬─────────┬──────────┬──────┬─────────┬─────────┐
│ 1/29 │ SALE    │ Laptop_1 │ -5   │ +250k   │ -520k   │
│ 1/28 │PURCHASE │ Laptop_1 │ +8   │ -320k   │ -770k   │
│ 1/27 │PURCHASE │ Laptop   │ +10  │ -450k   │ -450k   │
└──────┴─────────┴──────────┴──────┴─────────┴─────────┘

Profit on this sale: 5 × (50k - 40k) = RS 50,000 ✅
```

---

**DAY 4: Purchase Another Variant (Price Increase)**
```
Purchase: Laptop @ RS 48000, Qty 10 → Becomes "Laptop_2"

Items:
┌──────────┬────────┬──────┐
│ Laptop   │ 45000  │ 10   │
│ Laptop_1 │ 40000  │ 3    │
│ Laptop_2 │ 48000  │ 10   │ ← NEW
└──────────┴────────┴──────┘

Balance Sheet:
┌──────┬─────────┬──────────┬──────┬─────────┬─────────┐
│ 1/30 │PURCHASE │ Laptop_2 │ +10  │ -480k   │ -1000k  │
│ 1/29 │ SALE    │ Laptop_1 │ -5   │ +250k   │ -520k   │
│ 1/28 │PURCHASE │ Laptop_1 │ +8   │ -320k   │ -770k   │
│ 1/27 │PURCHASE │ Laptop   │ +10  │ -450k   │ -450k   │
└──────┴─────────┴──────────┴──────┴─────────┴─────────┘

All three variants tracked! ✅
```

---

**DAY 5: Strategic Selling**
```
Sell from each variant:

Sale 1: Laptop_1 @ RS 50000, Qty 3 (remaining stock)
Profit: 3 × (50k - 40k) = RS 30,000

Sale 2: Laptop @ RS 50000, Qty 5
Profit: 5 × (50k - 45k) = RS 25,000

Sale 3: Laptop_2 @ RS 50000, Qty 2
Profit: 2 × (50k - 48k) = RS 4,000

Total Profit from Day 5: RS 59,000

Balance Sheet:
┌──────┬─────────┬──────────┬──────┬─────────┬─────────┐
│ 1/31 │ SALE    │ Laptop_2 │ -2   │ +100k   │ -510k   │
│ 1/31 │ SALE    │ Laptop   │ -5   │ +250k   │ -610k   │
│ 1/31 │ SALE    │ Laptop_1 │ -3   │ +150k   │ -860k   │
│ 1/30 │PURCHASE │ Laptop_2 │ +10  │ -480k   │ -1000k  │
│ 1/29 │ SALE    │ Laptop_1 │ -5   │ +250k   │ -520k   │
│ 1/28 │PURCHASE │ Laptop_1 │ +8   │ -320k   │ -770k   │
│ 1/27 │PURCHASE │ Laptop   │ +10  │ -450k   │ -450k   │
└──────┴─────────┴──────────┴──────┴─────────┴─────────┘
```

## Variant Analysis from Balance Sheet

### Profit by Variant

Using the balance sheet, you can calculate:

```
Laptop (Original):
Purchase: 10 @ RS 45k = RS 450k
Sales: 5 @ RS 50k = RS 250k
Remaining: 5 (worth RS 250k)
Realized Profit: RS 25k
Potential Profit: RS 25k more (if all sold @ RS 50k)

Laptop_1 (Discount Variant):
Purchase: 8 @ RS 40k = RS 320k
Sales: 8 @ RS 50k = RS 400k
Remaining: 0
Realized Profit: RS 80k ✅ BEST MARGIN!

Laptop_2 (Price Increase):
Purchase: 10 @ RS 48k = RS 480k
Sales: 2 @ RS 50k = RS 100k
Remaining: 8 (worth RS 400k)
Realized Profit: RS 4k
Potential Profit: RS 16k more (if all sold @ RS 50k)
```

**Strategy Decision:**
- Sell Laptop_1 first (best margin)
- Then Laptop (good margin)
- Finally Laptop_2 (smallest margin)

## Search Capabilities with Variants

### Search: "Laptop"

```
Results show ALL laptop-related transactions:
┌──────┬─────────┬──────────┬──────┬─────────┐
│ Date │ Type    │ Item     │ Qty  │ Money   │
├──────┼─────────┼──────────┼──────┼─────────┤
│ 1/31 │ SALE    │ Laptop_2 │ -2   │ +100k   │
│ 1/31 │ SALE    │ Laptop   │ -5   │ +250k   │
│ 1/31 │ SALE    │ Laptop_1 │ -3   │ +150k   │
│ 1/30 │PURCHASE │ Laptop_2 │ +10  │ -480k   │
│ 1/29 │ SALE    │ Laptop_1 │ -5   │ +250k   │
│ 1/28 │PURCHASE │ Laptop_1 │ +8   │ -320k   │
│ 1/27 │PURCHASE │ Laptop   │ +10  │ -450k   │
└──────┴─────────┴──────────┴──────┴─────────┘

Complete history across all variants! ✅
```

### Search: "Laptop_1"

```
Results show ONLY Laptop_1 transactions:
┌──────┬─────────┬──────────┬──────┬─────────┐
│ Date │ Type    │ Item     │ Qty  │ Money   │
├──────┼─────────┼──────────┼──────┼─────────┤
│ 1/31 │ SALE    │ Laptop_1 │ -3   │ +150k   │
│ 1/29 │ SALE    │ Laptop_1 │ -5   │ +250k   │
│ 1/28 │PURCHASE │ Laptop_1 │ +8   │ -320k   │
└──────┴─────────┴──────────┴──────┴─────────┘

Specific variant tracking! ✅
```

## Business Insights

### 1. Cost Comparison

```
From Balance Sheet, you can see:

Laptop purchases:
- 1/27: 10 @ RS 45k = RS 450k (average cost)
- 1/28: 8 @ RS 40k = RS 320k (discount - better!)
- 1/30: 10 @ RS 48k = RS 480k (increase - worse)

Conclusion: Try to buy more at discount (Laptop_1 pricing)
```

### 2. Margin Analysis

```
Calculate profit per variant:

Laptop_1: Cost RS 40k, Sell RS 50k = RS 10k profit/unit (25%)
Laptop: Cost RS 45k, Sell RS 50k = RS 5k profit/unit (11%)
Laptop_2: Cost RS 48k, Sell RS 50k = RS 2k profit/unit (4%)

Strategy: Prioritize selling Laptop_1 stock!
```

### 3. Supplier Evaluation

```
If variants represent different suppliers:

Laptop_1 (Supplier A): Cost RS 40k - Best deal! ✅
Laptop (Supplier B): Cost RS 45k - Average
Laptop_2 (Supplier C): Cost RS 48k - Expensive

Decision: Order more from Supplier A
```

## Integration Benefits

### 1. Complete Transparency

```
Purchase Page → Creates variants → Balance Sheet tracks them

Every cost variation is recorded and visible
No hidden transactions
Full audit trail
```

### 2. Accurate Accounting

```
Each variant = Separate inventory item
Separate SKU
Separate tracking
Individual profit calculation
```

### 3. Better Decision Making

```
Balance Sheet shows:
"Which variant sold best?"
"Which had best margin?"
"Should I reorder this variant?"
```

## Visual Flow

```
                PURCHASE PAGE
                      │
           Purchase @ different cost
                      │
                      ▼
         ┌────────────────────────┐
         │  Cart: Laptop_1        │
         └───────────┬────────────┘
                     │
          "Complete Purchase"
                     │
                     ▼
              ITEMS PAGE
         ┌────────────────────┐
         │  Laptop_1 created  │
         │  with SKU-002      │
         └────────┬───────────┘
                  │
                  ▼
           BALANCE SHEET
    ┌──────────────────────────┐
    │ Shows purchase entry:    │
    │ Laptop_1, +8, -RS 320k   │
    └──────────────────────────┘
                  │
    Later: Sell Laptop_1
                  │
                  ▼
           SALES PAGE
    ┌──────────────────────────┐
    │ Sell Laptop_1 @ RS 50k   │
    └──────────┬───────────────┘
               │
               ▼
        BALANCE SHEET
    ┌──────────────────────────┐
    │ Shows sale entry:        │
    │ Laptop_1, -5, +RS 250k   │
    └──────────────────────────┘
```

## Example: Electronics Store Month

### Week 1: Building Inventory

```
Day 1: Purchase 20 Mice @ RS 450
Balance Sheet:
┌──────┬─────────┬───────┬──────┬─────────┬─────────┐
│ 1/01 │PURCHASE │ Mouse │ +20  │ -9k     │ -9k     │
└──────┴─────────┴───────┴──────┴─────────┴─────────┘

Day 3: Purchase 20 more @ RS 500 (price increase)
Creates: Mouse_1

Balance Sheet:
┌──────┬─────────┬─────────┬──────┬─────────┬─────────┐
│ 1/03 │PURCHASE │ Mouse_1 │ +20  │ -10k    │ -19k    │
│ 1/01 │PURCHASE │ Mouse   │ +20  │ -9k     │ -9k     │
└──────┴─────────┴─────────┴──────┴─────────┴─────────┘
```

### Week 2: Starting Sales

```
Day 8: Sell 15 Mouse @ RS 600
System picks from Mouse (cheaper cost)

Balance Sheet:
┌──────┬─────────┬─────────┬──────┬─────────┬─────────┐
│ 1/08 │ SALE    │ Mouse   │ -15  │ +9k     │ -10k    │
│ 1/03 │PURCHASE │ Mouse_1 │ +20  │ -10k    │ -19k    │
│ 1/01 │PURCHASE │ Mouse   │ +20  │ -9k     │ -9k     │
└──────┴─────────┴─────────┴──────┴─────────┴─────────┘

Profit: 15 × (600 - 450) = RS 2,250
```

### Week 3: Profit Optimization

```
Day 15: Sell 5 more Mouse @ RS 600

Balance Sheet:
┌──────┬─────────┬─────────┬──────┬─────────┬─────────┐
│ 1/15 │ SALE    │ Mouse   │ -5   │ +3k     │ -7k     │
│ 1/08 │ SALE    │ Mouse   │ -15  │ +9k     │ -10k    │
│ 1/03 │PURCHASE │ Mouse_1 │ +20  │ -10k    │ -19k    │
│ 1/01 │PURCHASE │ Mouse   │ +20  │ -9k     │ -9k     │
└──────┴─────────┴─────────┴──────┴─────────┴─────────┘

All Mouse @ 450 sold!
Remaining: 20 Mouse_1 @ 500
```

### Week 4: Mixed Sales

```
Day 22: Sell 10 Mouse_1 @ RS 600

Balance Sheet:
┌──────┬─────────┬─────────┬──────┬─────────┬─────────┐
│ 1/22 │ SALE    │ Mouse_1 │ -10  │ +6k     │ -1k     │
│ 1/15 │ SALE    │ Mouse   │ -5   │ +3k     │ -7k     │
│ 1/08 │ SALE    │ Mouse   │ -15  │ +9k     │ -10k    │
│ 1/03 │PURCHASE │ Mouse_1 │ +20  │ -10k    │ -19k    │
│ 1/01 │PURCHASE │ Mouse   │ +20  │ -9k     │ -9k     │
└──────┴─────────┴─────────┴──────┴─────────┴─────────┘

Profit: 10 × (600 - 500) = RS 1,000
Lower margin but still profit
```

### Month Summary

```
┌─────────────────────────────────────────────────────┐
│  JANUARY 2026 SUMMARY                               │
├─────────────────────────────────────────────────────┤
│  Total Purchases: RS 19,000                         │
│  Total Sales: RS 18,000                             │
│  Net Flow: -RS 1,000 (still invested)               │
│  Inventory Value: RS 6,000 (10 Mouse_1)             │
├─────────────────────────────────────────────────────┤
│  VARIANTS:                                          │
│  • Mouse (450): 0 remaining - ALL SOLD              │
│  • Mouse_1 (500): 10 remaining                      │
├─────────────────────────────────────────────────────┤
│  PROFIT ANALYSIS:                                   │
│  • Mouse sales: RS 3,000 profit                     │
│  • Mouse_1 sales: RS 1,000 profit                   │
│  • Total realized: RS 4,000                         │
│  • Potential (if all sold): RS 5,000 more           │
└─────────────────────────────────────────────────────┘
```

## Key Insights from Variant Tracking

### 1. Which Variant Sells Best?

```
Search: "Mouse"
Filter: Last 30 days

Count transactions:
- Mouse: 2 sale transactions (20 units)
- Mouse_1: 1 sale transaction (10 units)

Conclusion: Mouse (cheaper) sold faster
```

### 2. Which Variant is Most Profitable?

```
Calculate from balance sheet:

Mouse: 
- Buy @ 450, Sell @ 600 = 150 profit/unit
- Units sold: 20
- Total profit: RS 3,000

Mouse_1:
- Buy @ 500, Sell @ 600 = 100 profit/unit
- Units sold: 10
- Total profit: RS 1,000

Conclusion: Mouse has better margin
```

### 3. Should You Reorder?

```
Check balance sheet:
- Mouse: Sold out quickly (good)
- Mouse_1: Still 10 in stock (slower)

Decision: Reorder at Mouse pricing (RS 450)
Negotiate with supplier for better rate
```

## Integration Summary

```
┌────────────────────────────────────────┐
│  COMPLETE SYSTEM INTEGRATION           │
├────────────────────────────────────────┤
│                                        │
│  PURCHASE PAGE                         │
│  - Buy at different costs              │
│  - Creates variants in cart            │
│  - Laptop_1, Laptop_2, etc.            │
│         ↓                              │
│  COMPLETE PURCHASE                     │
│  - Creates items in inventory          │
│  - Each variant = separate item        │
│         ↓                              │
│  ITEMS PAGE                            │
│  - Shows all variants                  │
│  - Laptop, Laptop_1, Laptop_2          │
│  - Each with own SKU                   │
│         ↓                              │
│  SALES PAGE                            │
│  - Sell any variant                    │
│  - Track which variant sold            │
│         ↓                              │
│  BALANCE SHEET                         │
│  - Complete transaction history        │
│  - Purchases by variant                │
│  - Sales by variant                    │
│  - Profit analysis                     │
│                                        │
└────────────────────────────────────────┘
```

## Summary

✅ **Variants in Balance Sheet**
- Each variant tracked separately
- Purchase entries show variant name
- Sale entries show which variant sold
- Complete cost and profit visibility

✅ **Financial Clarity**
- Know which variants are profitable
- Track cost variations
- Optimize inventory mix
- Make informed decisions

✅ **Business Intelligence**
- Identify best margins
- Track supplier performance
- Analyze sales velocity
- Plan future purchases

The Balance Sheet with variant integration provides complete financial and inventory intelligence for your business!
