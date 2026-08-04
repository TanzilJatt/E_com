# Purchase Variants - Quick Visual Guide

## The Simple Rule

```
╔══════════════════════════════════════════════════╗
║                                                  ║
║  Item name has suffix (_1, _2, _3)?             ║
║                                                  ║
║  YES → CREATE NEW ITEM in inventory              ║
║  NO  → UPDATE EXISTING ITEM                      ║
║                                                  ║
╚══════════════════════════════════════════════════╝
```

## Before Purchase

**Inventory:**
```
┌──────────┬─────────┬────────┬───────┐
│ Laptop   │ SKU-001 │ 45000  │ 10    │
└──────────┴─────────┴────────┴───────┘

Only 1 item exists
```

## Create Purchase Cart

```
Purchase different costs:

Cart:
┌──────────┬──────┬──────────┐
│ Laptop   │ 5    │ 45000    │ ← No suffix
│ Laptop_1 │ 8    │ 40000    │ ← Has _1
│ Laptop_2 │ 10   │ 48000    │ ← Has _2
└──────────┴──────┴──────────┘
```

## Click "Complete Purchase"

```
System Processing...

Item: Laptop (no suffix)
→ UPDATE existing item
→ Add 5 to quantity

Item: Laptop_1 (has _1)
→ CREATE NEW item
→ With 8 quantity

Item: Laptop_2 (has _2)
→ CREATE NEW item
→ With 10 quantity
```

## After Purchase

**Inventory:**
```
┌──────────┬─────────┬────────┬───────┐
│ Name     │ SKU     │ Price  │ Qty   │
├──────────┼─────────┼────────┼───────┤
│ Laptop   │ SKU-001 │ 45000  │ 15    │ ✅ Updated (+5)
│ Laptop_1 │ SKU-002 │ 40000  │ 8     │ ✅ Created (new)
│ Laptop_2 │ SKU-003 │ 48000  │ 10    │ ✅ Created (new)
└──────────┴─────────┴────────┴───────┘

Now 3 items exist!
```

## Visual Flow

```
PURCHASE CART              INVENTORY (BEFORE)
┌─────────────┐           ┌─────────────┐
│ Laptop   5  │           │ Laptop  10  │
│             │    ───┐   │             │
│ Laptop_1 8  │       │   │             │
│             │       │   │             │
│ Laptop_2 10 │       │   │             │
└─────────────┘       │   └─────────────┘
                      │
                      ▼
              "Complete Purchase"
                      │
                      ▼
               ┌──────────────┐
               │  Processing  │
               └──────────────┘
                      │
       ┌──────────────┼──────────────┐
       │              │              │
   No suffix      Has _1         Has _2
   (Laptop)     (Laptop_1)     (Laptop_2)
       │              │              │
       ▼              ▼              ▼
   Update         Create         Create
   existing       new item       new item
       │              │              │
       └──────────────┼──────────────┘
                      │
                      ▼
             INVENTORY (AFTER)
        ┌─────────────────────────┐
        │ Laptop    15 (10+5)     │
        │ Laptop_1   8 (new!)     │
        │ Laptop_2  10 (new!)     │
        └─────────────────────────┘
```

## Example with Mouse

```
BEFORE:
┌───────┬────────┬───────┬──────┐
│ Mouse │ SKU-10 │ 500   │ 20   │
└───────┴────────┴───────┴──────┘

PURCHASE:
Add Mouse @ 450 (discount) → Creates "Mouse_1"
Add Mouse @ 500 (regular) → Updates "Mouse"
Add Mouse @ 550 (expensive) → Creates "Mouse_2"

AFTER:
┌─────────┬────────┬───────┬──────┐
│ Mouse   │ SKU-10 │ 500   │ 25   │ ← Updated
│ Mouse_1 │ SKU-11 │ 450   │ 30   │ ← Created
│ Mouse_2 │ SKU-12 │ 550   │ 10   │ ← Created
└─────────┴────────┴───────┴──────┘
```

## Items Page View

```
After purchase, go to Items page:

┌──────────────────────────────────────────────┐
│          INVENTORY ITEMS                     │
├──────────┬─────────┬────────┬───────────────┤
│ Name     │ SKU     │ Price  │ Qty  │ Value  │
├──────────┼─────────┼────────┼──────┼────────┤
│ Laptop   │ SKU-001 │ 45,000 │  15  │675,000 │
│ Laptop_1 │ SKU-002 │ 40,000 │   8  │320,000 │
│ Laptop_2 │ SKU-003 │ 48,000 │  10  │480,000 │
│ Mouse    │ SKU-10  │   500  │  25  │ 12,500 │
│ Mouse_1  │ SKU-11  │   450  │  30  │ 13,500 │
│ Mouse_2  │ SKU-12  │   550  │  10  │  5,500 │
└──────────┴─────────┴────────┴──────┴────────┘

All variants visible and manageable! ✅
```

## Decision Tree

```
                Item in Cart
                     │
                     ▼
           ┌─────────────────┐
           │ Check item name │
           └────────┬────────┘
                    │
            ┌───────┴───────┐
            │               │
       Has suffix      No suffix
       (ends with      (normal
        _\d+)           name)
            │               │
            ▼               ▼
    ┌──────────────┐ ┌─────────────┐
    │ CREATE NEW   │ │ UPDATE      │
    │ ITEM in      │ │ EXISTING    │
    │ Inventory    │ │ ITEM        │
    └──────┬───────┘ └──────┬──────┘
           │                │
           │    New SKU     │ Same SKU
           │    New ID      │ Same ID
           │    Qty = N     │ Qty += N
           │                │
           └────────┬───────┘
                    │
                    ▼
            Purchase Complete
```

## Key Points

✅ **_1, _2, _3** = New items created
✅ **No suffix** = Existing item updated
✅ **Auto SKU** = System generates new SKUs
✅ **Vendor copied** = From original item
✅ **Independent** = Each variant separate

## Common Scenario

```
You have: Laptop @ RS 45000

Buy 10 @ RS 40000 (discount)
→ Creates "Laptop_1"

Buy 5 @ RS 45000 (regular)
→ Updates "Laptop" (+5)

Buy 8 @ RS 48000 (price up)
→ Creates "Laptop_2"

Result:
3 separate inventory items! ✅
```

## Benefits

```
┌─────────────────────────────────┐
│ ✅ Track all cost variations    │
│ ✅ Separate inventory counts    │
│ ✅ Calculate accurate profits   │
│ ✅ Manage each batch uniquely   │
│ ✅ Optimize sales strategy      │
└─────────────────────────────────┘
```

## Need More Info?

See: `PURCHASE_VARIANT_INVENTORY_CREATION.md` for complete guide
