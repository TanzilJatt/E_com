# Purchase Page - Variant Items Created in Inventory

## Overview

When you purchase items at different costs than the inventory price, the system now **automatically creates separate items in the inventory** for each variant (Laptop_1, Laptop_2, etc.). This ensures complete cost tracking and proper inventory management.

## How It Works

### The Complete Flow

```
┌─────────────────────────────────────────────────────┐
│            USER CREATES PURCHASE                    │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│        CART CONTAINS VARIANTS                       │
│  - Laptop @ RS 45000 (original)                    │
│  - Laptop_1 @ RS 40000 (discount)                  │
│  - Laptop_2 @ RS 48000 (price increase)            │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│      USER CLICKS "COMPLETE PURCHASE"                │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│     SYSTEM PROCESSES EACH ITEM                      │
└────────────────┬────────────────────────────────────┘
                 │
       ┌─────────┴─────────┐
       │                   │
   Has suffix?         No suffix
   (Laptop_1)          (Laptop)
       │                   │
       ▼                   ▼
┌────────────────┐  ┌────────────────┐
│ CREATE NEW     │  │ UPDATE         │
│ ITEM IN        │  │ EXISTING       │
│ INVENTORY      │  │ ITEM           │
└───────┬────────┘  └───────┬────────┘
        │                   │
        └─────────┬─────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────┐
│      UPDATE INVENTORY QUANTITIES                    │
│  - Each item gets its quantity added                │
│  - Purchase record is created                       │
│  - Activity log is generated                        │
└─────────────────────────────────────────────────────┘
```

## Complete Example

### Starting Point

**Inventory:**
```
┌──────────┬─────────┬────────┬───────┬──────────┐
│ Name     │ SKU     │ Price  │ Qty   │ Vendor   │
├──────────┼─────────┼────────┼───────┼──────────┤
│ Laptop   │ SKU-001 │ 45000  │ 10    │ Dell     │
└──────────┴─────────┴────────┴───────┴──────────┘
```

### Step 1: Create Purchase Cart

User adds items with different costs:

**Purchase Cart:**
```
┌──────────┬──────┬──────────┬────────────┐
│ Name     │ Qty  │ Cost     │ Total      │
├──────────┼──────┼──────────┼────────────┤
│ Laptop   │ 5    │ 45000    │ 225000     │ ← Same as inventory
│ Laptop_1 │ 8    │ 40000    │ 320000     │ ← Discount variant
│ Laptop_2 │ 10   │ 48000    │ 480000     │ ← Price increase
└──────────┴──────┴──────────┴────────────┘
Total: RS 1,025,000
```

### Step 2: Complete Purchase

User clicks "Complete Purchase" button.

**System Processing:**

```
FOR EACH ITEM IN CART:
  
  Item: "Laptop" (no suffix)
  ├─ Check: Has suffix? NO
  ├─ Action: Update existing item
  └─ Result: Laptop (SKU-001) updated
  
  Item: "Laptop_1" (has suffix)
  ├─ Check: Has suffix? YES (_1)
  ├─ Action: Create NEW item in inventory
  ├─ Details:
  │  ├─ Name: "Laptop_1"
  │  ├─ Price: RS 40000 (purchase cost)
  │  ├─ SKU: Auto-generated (SKU-002)
  │  ├─ Description: "Variant of Laptop"
  │  └─ Vendor: "Dell" (copied from original)
  └─ Result: NEW item created
  
  Item: "Laptop_2" (has suffix)
  ├─ Check: Has suffix? YES (_2)
  ├─ Action: Create NEW item in inventory
  ├─ Details:
  │  ├─ Name: "Laptop_2"
  │  ├─ Price: RS 48000 (purchase cost)
  │  ├─ SKU: Auto-generated (SKU-003)
  │  ├─ Description: "Variant of Laptop"
  │  └─ Vendor: "Dell" (copied from original)
  └─ Result: NEW item created
```

### Step 3: Final Inventory

**After Purchase Complete:**
```
┌──────────┬─────────┬────────┬───────┬──────────┬─────────────────────────┐
│ Name     │ SKU     │ Price  │ Qty   │ Vendor   │ Description             │
├──────────┼─────────┼────────┼───────┼──────────┼─────────────────────────┤
│ Laptop   │ SKU-001 │ 45000  │ 15    │ Dell     │ Original                │
│          │         │        │  ↑    │          │                         │
│          │         │        │  +5   │          │                         │
├──────────┼─────────┼────────┼───────┼──────────┼─────────────────────────┤
│ Laptop_1 │ SKU-002 │ 40000  │ 8     │ Dell     │ Variant of Laptop       │
│          │         │        │  ↑    │          │                         │
│          │         │        │ NEW!  │          │ ← CREATED               │
├──────────┼─────────┼────────┼───────┼──────────┼─────────────────────────┤
│ Laptop_2 │ SKU-003 │ 48000  │ 10    │ Dell     │ Variant of Laptop       │
│          │         │        │  ↑    │          │                         │
│          │         │        │ NEW!  │          │ ← CREATED               │
└──────────┴─────────┴────────┴───────┴──────────┴─────────────────────────┘
```

**Analysis:**
- Original Laptop: Quantity increased from 10 to 15 (+5 units)
- Laptop_1: NEW item created with 8 units @ RS 40000
- Laptop_2: NEW item created with 10 units @ RS 48000

## Benefits

### 1. **Complete Cost Tracking**

Each purchase cost creates its own inventory item:

```
Items Page View:
┌──────────┬─────────┬────────┬───────┬────────────────┐
│ Name     │ SKU     │ Price  │ Qty   │ Total Value    │
├──────────┼─────────┼────────┼───────┼────────────────┤
│ Laptop   │ SKU-001 │ 45000  │ 15    │ 675,000        │
│ Laptop_1 │ SKU-002 │ 40000  │ 8     │ 320,000        │
│ Laptop_2 │ SKU-003 │ 48000  │ 10    │ 480,000        │
└──────────┴─────────┴────────┴───────┴────────────────┘

Total Inventory Value: RS 1,475,000
```

### 2. **Accurate Profit Calculations**

Each variant has its own selling price:

```
If you sell:
- Laptop @ RS 45000 → Cost: RS 45000 → Profit: RS 0 (break even)
- Laptop_1 @ RS 40000 → Cost: RS 40000 → Profit: RS 0 (break even)
- Laptop_2 @ RS 48000 → Cost: RS 48000 → Profit: RS 0 (break even)

Or you can adjust selling prices:
- Laptop @ RS 50000 → Cost: RS 45000 → Profit: RS 5000 (11%)
- Laptop_1 @ RS 50000 → Cost: RS 40000 → Profit: RS 10000 (25%) ✅ Best
- Laptop_2 @ RS 50000 → Cost: RS 48000 → Profit: RS 2000 (4%)
```

### 3. **Inventory Valuation Methods**

**FIFO (First In, First Out):**
```
Sell order:
1. Laptop (older stock) @ RS 45000
2. Laptop_1 (discount batch) @ RS 40000
3. Laptop_2 (latest batch) @ RS 48000
```

**Weighted Average Cost:**
```
Total Units: 15 + 8 + 10 = 33 units
Total Cost: 675000 + 320000 + 480000 = 1,475,000
Average: 1,475,000 / 33 = RS 44,696.97 per unit
```

### 4. **Stock Management**

Each variant can be managed independently:

```
Low Stock Alert Example:
- Laptop: 15 units (Safe)
- Laptop_1: 2 units (Low - reorder at discount!)
- Laptop_2: 3 units (Low - but expensive, avoid)
```

### 5. **Sales Strategy**

```
Scenario: Customer wants to buy 20 laptops

Option A: Sell from single variant
- 15 × Laptop @ RS 50000 = RS 750,000
- 5 more needed from Laptop_1 or Laptop_2

Option B: Optimize for profit
- 8 × Laptop_1 @ RS 50000 = RS 400,000 (profit: RS 80,000)
- 10 × Laptop @ RS 50000 = RS 500,000 (profit: RS 50,000)
- 2 × Laptop_2 @ RS 50000 = RS 100,000 (profit: RS 4,000)
- Total profit: RS 134,000 ✅
```

## Technical Details

### Item Creation Logic

```typescript
// Check if item has a suffix
const hasSuffix = /_\d+$/.test(item.itemName)

if (hasSuffix) {
  // Create new item in inventory
  const originalItem = items.find(i => i.id === item.itemId)
  
  const newItemId = await addItem({
    name: item.itemName,              // e.g., "Laptop_1"
    price: item.unitCost,             // Purchase cost becomes selling price
    quantity: 0,                      // Will be incremented after
    description: `Variant of ${originalItem?.name}`,
    vendor: originalItem?.vendor || ""
  }, userId, userName)
  
  // Return with new itemId
  return { ...item, itemId: newItemId }
} else {
  // Update existing item
  await updateItem(item.itemId, { price: item.unitCost }, userId)
  return item
}
```

### SKU Generation

- **Original item**: Keeps existing SKU (e.g., SKU-001)
- **Variant items**: Get new auto-generated SKUs (SKU-002, SKU-003, etc.)
- **SKU pattern**: Sequential numbering across all items
- **No manual SKU needed**: System handles everything

### Quantity Updates

After items are created/updated:

```typescript
// In lib/purchases.ts (createPurchase function)
for (const item of purchaseData.items) {
  const itemRef = doc(db, "items", item.itemId)
  await updateDoc(itemRef, {
    quantity: increment(item.quantity)  // Adds to existing quantity
  })
}
```

## Real-World Scenarios

### Scenario 1: Seasonal Pricing

**Context**: Prices vary by season

```
January (Winter Sale):
Purchase: Laptop @ RS 40000, Qty 20
→ Creates: Laptop_1 @ RS 40000

March (Regular):
Purchase: Laptop @ RS 45000, Qty 15
→ Updates: Laptop @ RS 45000 (original)

June (Price Increase):
Purchase: Laptop @ RS 48000, Qty 10
→ Creates: Laptop_2 @ RS 48000

Result in Inventory:
- Laptop: 15 units @ RS 45000 (regular price)
- Laptop_1: 20 units @ RS 40000 (winter sale)
- Laptop_2: 10 units @ RS 48000 (price increase)
```

### Scenario 2: Multiple Suppliers

**Context**: Different suppliers, different costs

```
Supplier A (Bulk):
Purchase: Mouse @ RS 400, Qty 100
→ Creates: Mouse_1 @ RS 400

Supplier B (Regular):
Purchase: Mouse @ RS 500, Qty 50
→ Updates: Mouse @ RS 500 (original)

Supplier C (Premium):
Purchase: Mouse @ RS 450, Qty 75
→ Creates: Mouse_2 @ RS 450

Result:
Each supplier's batch is separately tracked!
```

### Scenario 3: Quality Tiers

**Context**: Same product, different quality

```
Standard Grade:
Purchase: Cable @ RS 150, Qty 200
→ Creates: Cable_1 @ RS 150

Premium Grade:
Purchase: Cable @ RS 200, Qty 100
→ Updates: Cable @ RS 200 (original)

Enterprise Grade:
Purchase: Cable @ RS 250, Qty 50
→ Creates: Cable_2 @ RS 250

Result:
Three quality tiers in inventory!
```

## Items Page View

After purchases, the Items page shows:

```
┌──────────────────────────────────────────────────────────────┐
│                    INVENTORY ITEMS                           │
├──────────┬─────────┬────────┬───────┬──────────┬────────────┤
│ Name     │ SKU     │ Price  │ Qty   │ Vendor   │ Total Value│
├──────────┼─────────┼────────┼───────┼──────────┼────────────┤
│ Laptop   │ SKU-001 │ 45000  │ 15    │ Dell     │ 675,000    │
│ Laptop_1 │ SKU-002 │ 40000  │ 8     │ Dell     │ 320,000    │
│ Laptop_2 │ SKU-003 │ 48000  │ 10    │ Dell     │ 480,000    │
│ Mouse    │ SKU-004 │ 500    │ 50    │ Logitech │ 25,000     │
│ Mouse_1  │ SKU-005 │ 450    │ 100   │ Logitech │ 45,000     │
└──────────┴─────────┴────────┴───────┴──────────┴────────────┘

All variants are visible and manageable!
```

## Sales Integration

When creating a sale, all variants appear in the item list:

```
Select Item Dropdown:
- Laptop (SKU-001) - Current Stock: 15
- Laptop_1 (SKU-002) - Current Stock: 8
- Laptop_2 (SKU-003) - Current Stock: 10
- Mouse (SKU-004) - Current Stock: 50
- Mouse_1 (SKU-005) - Current Stock: 100

You can sell from any variant!
```

## Data Consistency

### What Gets Copied

From original item to variant:
- ✅ **Vendor**: Same vendor
- ✅ **Description**: Marked as "Variant of [original name]"
- ❌ **Price**: Uses purchase cost (not copied)
- ❌ **Quantity**: Starts at 0 (then incremented)
- ❌ **SKU**: Auto-generated (not copied)

### What's Unique

Each variant item has:
- Unique SKU
- Unique itemId
- Own price
- Own quantity
- Own creation timestamp
- Own update history

## Important Notes

### ⚠️ Variant Recognition

System recognizes suffix pattern: `_\d+`
- Matches: _1, _2, _3, ..., _99
- Examples: Laptop_1, Mouse_2, Cable_15
- Regex: `/_\d+$/`

### ⚠️ Manual Editing

If you manually edit item names in inventory:
- Adding suffix manually doesn't make it a variant
- Original link to base item is lost
- Best practice: Use purchase system for variants

### ⚠️ Deletion

When deleting a variant item:
- Only that variant is deleted
- Other variants remain
- Original item unaffected

### ⚠️ Price Updates

Updating variant price in Items page:
- Only affects that specific variant
- Doesn't affect original or other variants
- Each variant has independent pricing

## Summary

✅ **Automatic Creation**: Variants (Laptop_1, Laptop_2) automatically created in inventory

✅ **Complete Tracking**: Each purchase cost gets its own inventory item

✅ **Independent Management**: Each variant can be managed separately

✅ **Profit Optimization**: Sell from best-margin variants first

✅ **Full Integration**: Works with Sales, Reports, and all other features

The system now provides complete end-to-end tracking from purchase to inventory to sales!
