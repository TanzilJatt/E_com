# 🔧 Firebase Undefined Values Fix

## ❌ Error That Was Fixed

**Error Type:** `FirebaseError`

**Error Message:**
```
Function addDoc() called with invalid data. 
Unsupported field value: undefined 
(found in document purchases/FcNtIZYydZhiD30PV32P)
```

---

## 🎯 Problem

Firebase Firestore **does not allow `undefined` values** in documents. When you try to save a field with `undefined`, Firebase throws an error.

### **Where It Happened:**

In the **Purchase** feature, cart items had optional fields:
- `pricingType` (could be `undefined`)
- `bulkPrice` (could be `undefined`)

When adding items to cart with **unit pricing**, the `bulkPrice` was set to `undefined`:

```typescript
// ❌ PROBLEM: bulkPrice is undefined for unit pricing
const cartItem: CartItem = {
  itemId: item.id,
  itemName: item.name,
  sku: item.sku,
  quantity: qty,
  unitCost: cost,
  totalCost: totalCost,
  pricingType: "unit",
  bulkPrice: undefined,  // ❌ This causes Firebase error!
}
```

---

## ✅ Solution

**Three-part fix:**

### **1. Clean Data in `lib/purchases.ts`**

Added a cleaning function before saving to Firebase that removes `undefined` values:

```typescript
// Clean items to remove undefined values
const cleanedItems = purchaseData.items.map(item => {
  const cleanItem: any = {
    itemId: item.itemId,
    itemName: item.itemName,
    sku: item.sku,
    quantity: item.quantity,
    unitCost: item.unitCost,
    totalCost: item.totalCost,
  }
  
  // Only add optional fields if they're defined
  if (item.pricingType !== undefined) {
    cleanItem.pricingType = item.pricingType
  }
  if (item.bulkPrice !== undefined) {
    cleanItem.bulkPrice = item.bulkPrice
  }
  
  return cleanItem
})

// Use cleanedItems instead of purchaseData.items
await addDoc(collection(db, "purchases"), {
  userId,
  supplierName: purchaseData.supplierName,
  supplierContact: purchaseData.supplierContact || "",
  items: cleanedItems,  // ✅ No undefined values
  totalAmount: purchaseData.totalAmount,
  notes: purchaseData.notes || "",
  purchaseDate: serverTimestamp(),
  createdAt: serverTimestamp(),
})
```

**Applied to:**
- ✅ `createPurchase()` function
- ✅ `updatePurchase()` function

---

### **2. Fix Cart Item Creation (Existing Items)**

Changed from assigning `undefined` to conditionally adding the field:

**Before (❌):**
```typescript
const cartItem: CartItem = {
  itemId: item.id,
  itemName: item.name,
  sku: item.sku,
  quantity: qty,
  unitCost: cost,
  totalCost: totalCost,
  pricingType: existingItemPricingType,
  bulkPrice: existingItemPricingType === "bulk" ? parseFloat(bulkPrice) : undefined,
  // ❌ bulkPrice is undefined for unit pricing
}
```

**After (✅):**
```typescript
const cartItem: CartItem = {
  itemId: item.id,
  itemName: item.name,
  sku: item.sku,
  quantity: qty,
  unitCost: cost,
  totalCost: totalCost,
  pricingType: existingItemPricingType,
}

// Only add bulkPrice if it's defined
if (existingItemPricingType === "bulk" && bulkPrice) {
  cartItem.bulkPrice = parseFloat(bulkPrice)
}
// ✅ bulkPrice field not added for unit pricing
```

---

### **3. Fix Cart Item Creation (New Items)**

Same approach for new items:

**Before (❌):**
```typescript
const cartItem: CartItem = {
  itemId: itemId,
  itemName: newItem.itemName,
  sku: "Auto-generated",
  quantity: qty,
  unitCost: cost,
  totalCost: totalCost,
  pricingType: newItem.pricingType,
  bulkPrice: newItem.pricingType === "bulk" ? bulkPriceValue : undefined,
  // ❌ bulkPrice is undefined for unit pricing
}
```

**After (✅):**
```typescript
const cartItem: CartItem = {
  itemId: itemId,
  itemName: newItem.itemName,
  sku: "Auto-generated",
  quantity: qty,
  unitCost: cost,
  totalCost: totalCost,
  pricingType: newItem.pricingType,
}

// Only add bulkPrice if it's defined
if (newItem.pricingType === "bulk" && bulkPriceValue) {
  cartItem.bulkPrice = bulkPriceValue
}
// ✅ bulkPrice field not added for unit pricing
```

---

## 📋 What Changed

### **Files Modified:**

1. **`lib/purchases.ts`**
   - Added cleaning logic in `createPurchase()`
   - Added cleaning logic in `updatePurchase()`
   - Removes `undefined` values before saving to Firebase

2. **`app/purchase/page.tsx`**
   - Fixed `handleAddToCart()` - existing items
   - Fixed `handleAddNewItem()` - new items
   - Conditionally adds `bulkPrice` field

---

## 🎯 How It Works Now

### **Unit Pricing:**
```typescript
// Cart item structure
{
  itemId: "abc123",
  itemName: "Product A",
  sku: "SKU001",
  quantity: 10,
  unitCost: 50,
  totalCost: 500,
  pricingType: "unit"
  // bulkPrice: NOT INCLUDED ✅
}
```

### **Bulk Pricing:**
```typescript
// Cart item structure
{
  itemId: "abc123",
  itemName: "Product B",
  sku: "SKU002",
  quantity: 24,
  unitCost: 4.17,
  totalCost: 100,
  pricingType: "bulk",
  bulkPrice: 50  // ✅ Included for bulk pricing
}
```

---

## ✅ Result

### **Before Fix:**
```
❌ Error: Unsupported field value: undefined
❌ Purchase not saved
❌ App crashes
```

### **After Fix:**
```
✅ No undefined values sent to Firebase
✅ Purchase saved successfully
✅ No errors
```

---

## 🧪 Testing

### **Test 1: Unit Pricing**
1. Add item with unit pricing
2. Add to cart
3. Complete purchase
4. **Expected:** ✅ Purchase saved without errors

### **Test 2: Bulk Pricing**
1. Add item with bulk pricing (12 items)
2. Add to cart
3. Complete purchase
4. **Expected:** ✅ Purchase saved with bulkPrice field

### **Test 3: Mixed Cart**
1. Add some items with unit pricing
2. Add some items with bulk pricing
3. Complete purchase
4. **Expected:** ✅ All items saved correctly

### **Test 4: Update Purchase**
1. Edit existing purchase
2. Update items
3. Save changes
4. **Expected:** ✅ Purchase updated without errors

---

## 🔍 Key Learning

### **Firebase Rule:**
> **Firebase Firestore does NOT allow `undefined` values**

### **Solutions:**
1. ✅ **Don't include the field** if value is undefined
2. ✅ **Use `null`** instead of `undefined`
3. ✅ **Clean data** before sending to Firebase
4. ❌ **Never send `undefined`** values

### **Example:**

**Bad (❌):**
```typescript
await addDoc(collection(db, "items"), {
  name: "Product",
  price: 100,
  discount: undefined  // ❌ ERROR!
})
```

**Good (✅):**
```typescript
// Option 1: Don't include the field
await addDoc(collection(db, "items"), {
  name: "Product",
  price: 100
  // discount not included ✅
})

// Option 2: Use null
await addDoc(collection(db, "items"), {
  name: "Product",
  price: 100,
  discount: null  // ✅ OK
})

// Option 3: Conditionally add
const data: any = {
  name: "Product",
  price: 100
}
if (discountValue !== undefined) {
  data.discount = discountValue
}
await addDoc(collection(db, "items"), data)  // ✅ OK
```

---

## 📚 Related Errors

This fix prevents these Firebase errors:

- ❌ `Unsupported field value: undefined`
- ❌ `Function addDoc() called with invalid data`
- ❌ `Function updateDoc() called with invalid data`
- ❌ `Function setDoc() called with invalid data`

---

## 🎉 Summary

**Problem:**
- Cart items with optional fields had `undefined` values
- Firebase doesn't allow `undefined`
- Purchases failed to save

**Solution:**
- Clean data before saving (remove `undefined` values)
- Don't add optional fields if they're `undefined`
- Only include fields with actual values

**Result:**
- ✅ Purchases save successfully
- ✅ No Firebase errors
- ✅ Proper data structure
- ✅ All pricing types work correctly

---

**The Firebase error is now fixed!** ✅🎉

**Last Updated:** Jan 19, 2026

