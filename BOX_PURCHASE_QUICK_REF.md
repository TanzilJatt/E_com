# 📦 Box Purchase - Quick Reference

## 🎯 How It Works

When selling in **Box Purchase** mode:
- **User enters:** Number of boxes + Price per item
- **System calculates:** Boxes × 12 = Total items
- **Total:** Total items × Price per item

---

## 💰 Example

```
Box Purchase:
━━━━━━━━━━━━━━━━━━━━━━━━
Quantity: 5 boxes
Price Per Item: RS 8
━━━━━━━━━━━━━━━━━━━━━━━━
System Calculates:
├─ Items: 5 × 12 = 60
└─ Total: 60 × 8 = RS 480
━━━━━━━━━━━━━━━━━━━━━━━━
Inventory Deducted: 60 items
```

---

## 🎨 UI Flow

### **Step 1: Select Box Purchase**
```
○ Retail
● Box Purchase
```

### **Step 2: Enter Quantity**
```
Quantity (Number of Boxes) *
[    5    ]
ℹ️ Will deduct 60 items from inventory
```

### **Step 3: Enter Price**
```
Price Per Item (RS) *
[    8.00    ]
💰 Total: RS 480.00 (60 items × RS 8)
```

---

## ✅ Key Points

1. **Always enter price PER ITEM** (not per box)
2. **System multiplies by 12** automatically
3. **Helper text shows** real-time calculations
4. **Cart displays** total items and price

---

## 📊 Quick Comparison

| Mode | Quantity | Price Input | Items Deducted | Total |
|------|----------|-------------|----------------|-------|
| **Retail** | 60 items | RS 8/item | 60 | RS 480 |
| **Box** | 5 boxes | RS 8/item | 60 (5×12) | RS 480 |

**Same result, different input method!**

---

**Simple and intuitive!** 📦💰
