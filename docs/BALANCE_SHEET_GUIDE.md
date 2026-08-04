# Balance Sheet - Complete Guide

## Overview

The Balance Sheet page provides a comprehensive view of your inventory movements and financial flows. It tracks every purchase and sale transaction, showing how inventory quantities change and how money flows in and out of your business.

## What is a Balance Sheet?

A balance sheet in this context is a **ledger** or **movement report** that shows:

1. **Inventory Flow**
   - Purchases: Inventory IN (quantity increases)
   - Sales: Inventory OUT (quantity decreases)

2. **Money Flow**
   - Purchases: Money OUT (expenses)
   - Sales: Money IN (revenue)

3. **Running Balance**
   - Cumulative net flow of money (Sales - Purchases)

## Accessing the Balance Sheet

### From Items Page

Click the **"Balance Sheet"** button in the top right corner of the Items page.

```
┌────────────────────────────────────────┐
│  Inventory Items                       │
│  [Balance Sheet] [Download] [Import]   │
└────────────────────────────────────────┘
```

### Direct URL

Navigate to: `/balance`

## Page Layout

### 1. Summary Cards (Top Row)

```
┌──────────────┬──────────────┬──────────────┬──────────────┐
│ Total        │ Total        │ Net Flow     │ Inventory    │
│ Purchases    │ Sales        │              │ Value        │
│              │              │              │              │
│ RS 500,000   │ RS 750,000   │ RS 250,000   │ RS 1,000,000 │
│ (RED)        │ (GREEN)      │ (GREEN/RED)  │ (BLUE)       │
└──────────────┴──────────────┴──────────────┴──────────────┘
```

**Explanations:**
- **Total Purchases**: Total money spent on purchases (outflow)
- **Total Sales**: Total money earned from sales (inflow)
- **Net Flow**: Difference between sales and purchases (profit/loss)
- **Inventory Value**: Current total value of all items in stock

### 2. Filters Section

```
┌─────────────────────────────────────────────────────────┐
│ Search: [________________]                              │
│ Start Date: [________]  End Date: [________]            │
└─────────────────────────────────────────────────────────┘
```

**Search By:**
- Item name
- SKU
- Description

**Date Range:**
- Filter transactions by date
- Leave empty to see all transactions

### 3. Transactions Table

```
┌──────┬────────┬────────┬────────┬─────────┬────────────┬─────────┬─────────────┐
│ Date │ Type   │ Item   │ SKU    │ Qty Chg │ Money Flow │ Balance │ Description │
├──────┼────────┼────────┼────────┼─────────┼────────────┼─────────┼─────────────┤
│ 1/29 │ SALE   │ Laptop │ SKU-001│ -5      │ +RS 225000 │ 225000  │ Sold 5...   │
│ 1/28 │PURCHASE│ Mouse  │ SKU-002│ +20     │ -RS 9000   │ 0       │ Purchased..│
└──────┴────────┴────────┴────────┴─────────┴────────────┴─────────┴─────────────┘
```

## Understanding the Table

### Column Details

#### 1. Date
- Date and time of transaction
- Shows both date and time in separate lines

#### 2. Type
- **PURCHASE** (Red badge): Money out, inventory in
- **SALE** (Green badge): Money in, inventory out

#### 3. Item
- Name of the item
- Can include variants (Laptop_1, Laptop_2)

#### 4. SKU
- Stock Keeping Unit identifier
- Unique identifier for each item

#### 5. Qty Change
- **Positive (+)** in GREEN: Inventory increased (purchase)
- **Negative (-)** in RED: Inventory decreased (sale)

#### 6. Money Flow
- **Positive (+)** in GREEN: Money came in (sale revenue)
- **Negative (-)** in RED: Money went out (purchase cost)

#### 7. Running Balance
- Cumulative net flow
- Formula: Previous Balance + Current Money Flow

#### 8. Description
- Details about the transaction
- Format: "Purchased X units @ RS Y" or "Sold X units @ RS Y"

## Examples

### Example 1: Simple Transactions

**Starting Balance: RS 0**

```
Transaction 1: Purchase 10 Laptops @ RS 40000 each
├─ Qty Change: +10
├─ Money Flow: -RS 400,000 (paid to supplier)
└─ Running Balance: RS -400,000

Transaction 2: Sell 5 Laptops @ RS 50000 each
├─ Qty Change: -5
├─ Money Flow: +RS 250,000 (received from customer)
└─ Running Balance: RS -150,000 (-400,000 + 250,000)

Transaction 3: Sell 3 Laptops @ RS 50000 each
├─ Qty Change: -3
├─ Money Flow: +RS 150,000 (received from customer)
└─ Running Balance: RS 0 (-150,000 + 150,000)
```

**Result:**
- Total Purchases: RS 400,000
- Total Sales: RS 400,000
- Net Flow: RS 0 (break even)
- Remaining Inventory: 2 Laptops

### Example 2: Multiple Items

```
┌──────┬─────────┬────────┬─────────┬────────────┬─────────┐
│ Date │ Type    │ Item   │ Qty Chg │ Money Flow │ Balance │
├──────┼─────────┼────────┼─────────┼────────────┼─────────┤
│ 1/30 │ SALE    │ Mouse  │ -10     │ +RS 5000   │ +5000   │
│ 1/29 │ SALE    │ Laptop │ -2      │ +RS 100000 │ 0       │
│ 1/28 │PURCHASE │ Mouse  │ +50     │ -RS 22500  │ -100000 │
│ 1/27 │PURCHASE │ Laptop │ +10     │ -RS 400000 │ -77500  │
└──────┴─────────┴────────┴─────────┴────────────┴─────────┘
```

**Analysis:**
- Started with 2 purchases totaling RS 422,500
- Made 2 sales totaling RS 105,000
- Current balance: +RS 5,000
- Still have inventory worth more (8 Laptops, 40 Mice)

### Example 3: Variant Tracking

```
┌──────┬─────────┬──────────┬─────────┬────────────┬─────────┐
│ Date │ Type    │ Item     │ Qty Chg │ Money Flow │ Balance │
├──────┼─────────┼──────────┼─────────┼────────────┼─────────┤
│ 1/30 │ SALE    │ Laptop   │ -3      │ +RS 150000 │ +150000 │
│ 1/29 │ SALE    │ Laptop_1 │ -5      │ +RS 250000 │ 0       │
│ 1/28 │PURCHASE │ Laptop_1 │ +10     │ -RS 400000 │ -250000 │
│ 1/27 │PURCHASE │ Laptop   │ +5      │ -RS 225000 │ 150000  │
└──────┴─────────┴──────────┴─────────┴────────────┴─────────┘
```

**Analysis:**
- Purchased Laptop at RS 45000 each
- Purchased Laptop_1 (variant) at RS 40000 each
- Sold from Laptop_1 first (better margin!)
- Tracks each variant separately

## Key Features

### 1. Real-Time Data

- Automatically fetches latest purchases and sales
- Refreshes when you navigate to the page
- Shows all historical transactions

### 2. Search & Filter

**Search Capabilities:**
- Item name (case-insensitive)
- SKU number
- Transaction description

**Date Filtering:**
- Filter by date range
- View specific periods (day, week, month)
- Clear filters to see all data

### 3. Summary Statistics

**Four Key Metrics:**
1. Total Purchases (all-time)
2. Total Sales (all-time)
3. Net Flow (profit/loss)
4. Current Inventory Value

### 4. PDF Export

**Export Features:**
- Includes all filtered data
- Shows summary statistics
- Professional formatting
- Date-stamped filename

**Export Contents:**
- Report header with date
- Summary section
- Complete transactions table
- All current filters applied

## Financial Insights

### 1. Profitability Analysis

```
Net Flow = Total Sales - Total Purchases

Positive Net Flow = Profit
Negative Net Flow = Loss (or investments in inventory)
Zero Net Flow = Break even
```

### 2. Cash Flow Tracking

**Money Out (Purchases):**
- Initial inventory investment
- Restocking costs
- New product purchases

**Money In (Sales):**
- Revenue from sales
- Customer payments
- Income generation

### 3. Inventory Turnover

Compare:
- Inventory Value (current stock)
- Net Flow (realized profit)

**Formula:**
```
Turnover Ratio = Total Sales / Average Inventory Value
```

Higher ratio = Faster inventory movement = Better cash flow

### 4. Margin Analysis

Use with variant tracking:
```
Laptop purchased @ RS 40000, sold @ RS 50000
Margin: RS 10000 (25% profit)

Laptop_1 purchased @ RS 42000, sold @ RS 50000
Margin: RS 8000 (19% profit)

Choose to sell Laptop first for better margin!
```

## Use Cases

### 1. Daily Reconciliation

**Morning Routine:**
1. Check yesterday's balance
2. Verify all transactions recorded
3. Match with physical cash/bank

### 2. Monthly Reporting

**Month-End Analysis:**
1. Set date filter to current month
2. Review total purchases and sales
3. Calculate profit margin
4. Export PDF for records

### 3. Inventory Audit

**Verification Process:**
1. Check running balance
2. Compare with bank statements
3. Verify inventory value matches physical stock
4. Identify discrepancies

### 4. Business Planning

**Strategic Decisions:**
1. Analyze which items sell fastest
2. Identify profitable variants
3. Plan purchasing schedule
4. Optimize inventory levels

### 5. Tax Preparation

**Year-End Process:**
1. Export full year transactions
2. Separate purchases and sales
3. Calculate total revenue
4. Provide to accountant

## Best Practices

### 1. Regular Monitoring

✅ **DO:**
- Check balance sheet daily
- Verify new transactions
- Monitor net flow trend
- Track inventory value

❌ **DON'T:**
- Only check monthly
- Ignore negative balances
- Skip verification
- Forget to export records

### 2. Data Accuracy

✅ **ENSURE:**
- All purchases are recorded
- All sales are entered
- Dates are correct
- Amounts are verified

### 3. Using Filters

✅ **TIPS:**
- Use date filters for specific periods
- Search by item to track specific products
- Clear filters to see full picture
- Export filtered data for reports

### 4. Understanding Balance

**Negative Balance:**
- Normal at start (purchases before sales)
- Shows investment in inventory
- Will turn positive as you sell

**Positive Balance:**
- Shows net profit
- Money earned after covering costs
- Can reinvest or withdraw

## Troubleshooting

### Q: Balance sheet is empty

**A:** Check if you have:
- Any recorded purchases
- Any recorded sales
- Correct date filters
- Search terms cleared

### Q: Numbers don't match expectations

**A:** Verify:
- All purchases were recorded
- All sales were entered
- No duplicate entries
- Dates are correct

### Q: Can't find specific transaction

**A:** Try:
- Clear all filters
- Search by SKU instead of name
- Check date range
- Verify transaction was saved

### Q: Net flow is negative

**A:** This means:
- Purchases > Sales (so far)
- Normal for new businesses
- You have inventory value
- Will improve with sales

### Q: PDF export not working

**A:** Ensure:
- Browser allows downloads
- Sufficient data to export
- No browser extensions blocking
- Try different browser

## Integration with Other Pages

### Items Page
- Shows current inventory
- Balance sheet shows how you got there
- Links to detailed item info

### Purchase Page
- Records money out transactions
- Each purchase appears in balance sheet
- Shows inventory increases

### Sales Page
- Records money in transactions
- Each sale appears in balance sheet
- Shows inventory decreases

## Summary

The Balance Sheet provides:
- ✅ Complete transaction history
- ✅ Real-time financial tracking
- ✅ Inventory movement visualization
- ✅ Profit/loss calculation
- ✅ PDF export capability
- ✅ Search and filter options

Use it to:
- Monitor daily cash flow
- Track inventory changes
- Calculate profitability
- Make informed decisions
- Prepare financial reports

The Balance Sheet is your **financial dashboard** for inventory and money management!
