# 📦 Box Price - Quick Reference

## 🎯 What's New?

When "Box Purchase" is selected, the price field now says **"Box Price"** instead of "Price Per Item".

---

## 💰 How It Works

### **Retail:**
- Label: "Price Per Item"
- User enters: RS 8 per item
- For 60 items: Total = RS 480

### **Box Purchase:**
- Label: "Box Price"
- User enters: RS 96 per box
- For 5 boxes: Total = RS 480
- System deducts: 60 items (5 × 12)

---

## 📊 Quick Example

```
Box Purchase:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Quantity: 5 boxes
Box Price: RS 96
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Helper shows:
💰 Total: RS 480.00 (5 boxes × RS 96)
ℹ️ Will deduct 60 items (Quantity × 12)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Cart displays:
Qty: 60 | Price: RS 8.00 | Total: RS 480.00
```

---

## ✅ Key Points

1. **Box Price** = Price for 1 box of 12 items
2. **System auto-calculates** price per item (box price ÷ 12)
3. **Helper text** shows total in real-time
4. **Inventory deducts** correct amount (boxes × 12)
5. **Cart shows** items and price per item

---

## 🎨 Visual Difference

**Before:**
```
Price Per Item (RS) *
[    8    ]
```

**After (Box Purchase):**
```
Box Price (RS) *
[    96    ]
💰 Total: RS 480.00 (5 boxes × RS 96)
```

---

**Simple and clear!** 📦💰
