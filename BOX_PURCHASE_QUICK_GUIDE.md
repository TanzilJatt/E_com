# 📦 Box Purchase - Quick Guide

## 🎯 What Is Box Purchase?

**Box Purchase** (formerly "Wholesale") is a sales type where:
- **1 box = 12 items**
- User enters number of boxes
- System automatically deducts 12 items per box from inventory

---

## 📊 Quick Comparison

| Sale Type | User Enters | Inventory Deducts |
|-----------|-------------|-------------------|
| **Retail** | 5 items | 5 items |
| **Box Purchase** | 5 boxes | 60 items (5 × 12) |

---

## 🔤 Name Changes

**Throughout the app:**
- ❌ "Wholesale" 
- ✅ "Box Purchase"

**Updated in:**
- Sales page
- Dashboard
- Reports
- Filters

---

## 💡 How to Use

### **For Retail:**
1. Select "Retail"
2. Enter quantity (e.g., 5)
3. Enter price per item
4. Add to cart
5. Inventory deducts 5 items ✅

### **For Box Purchase:**
1. Select "Box Purchase"
2. Enter quantity (e.g., 5 boxes)
3. See helper: "Will deduct 60 items"
4. Enter price per item
5. Add to cart
6. Inventory deducts 60 items ✅

---

## ⚠️ Stock Validation

**Example:**
- Item stock: 50 items
- Try to sell 5 boxes (60 items)
- Error: "Not enough stock available. Available: 50 items (4 boxes)"

---

## 🎨 Visual Indicators

**Info Message (Box Purchase):**
```
ℹ️ Box Purchase: Enter the number of boxes 
  (e.g., 5 boxes = 60 items). Each box contains 
  12 items. The system will automatically deduct 
  the correct quantity from inventory.
```

**Helper Text:**
```
Quantity (Number of Boxes) *
[    5    ]
ℹ️ Will deduct 60 items from inventory (Quantity × 12)
```

---

## ✅ Key Points

1. **1 box = 12 items** (always)
2. **Automatic calculation** (no manual math)
3. **Real-time helper text** (shows actual items)
4. **Stock validation** (prevents overselling)
5. **Clear labels** (shows "Number of Boxes")

---

## 🎯 Quick Example

**Selling 5 boxes:**
- Quantity: 5
- Items deducted: 60 (5 × 12)
- Price per item: RS 8
- Total: RS 480 (60 × 8)

**Done!** 📦✨
