# 🔧 Firebase Undefined Error - Quick Fix

## ❌ Error
```
FirebaseError: Function addDoc() called with invalid data. 
Unsupported field value: undefined
```

---

## ⚡ Quick Solution

**Rule:** Firebase doesn't allow `undefined` values!

**Fix:** Don't include fields with `undefined` values

---

## 🎯 Before & After

### **❌ WRONG:**
```typescript
const data = {
  name: "Product",
  price: 100,
  discount: undefined  // ❌ ERROR!
}
await addDoc(collection(db, "items"), data)
```

### **✅ CORRECT:**
```typescript
// Option 1: Don't include field
const data = {
  name: "Product",
  price: 100
  // discount not included ✅
}

// Option 2: Use null
const data = {
  name: "Product",
  price: 100,
  discount: null  // ✅ OK
}

// Option 3: Conditional add
const data: any = { name: "Product", price: 100 }
if (discount !== undefined) {
  data.discount = discount
}

await addDoc(collection(db, "items"), data)
```

---

## 📝 What Was Fixed

### **Files Changed:**
- ✅ `lib/purchases.ts` - Cleans data before saving
- ✅ `app/purchase/page.tsx` - Doesn't add undefined fields

### **Changes:**
```typescript
// Before (❌)
bulkPrice: type === "bulk" ? value : undefined

// After (✅)
if (type === "bulk" && value) {
  item.bulkPrice = value
}
```

---

## ✅ Result

**Before:**
- ❌ Error when saving purchase
- ❌ App crashes

**After:**
- ✅ Purchases save successfully
- ✅ No errors

---

## 🎯 Key Takeaway

> **Never send `undefined` to Firebase!**
> 
> Use `null` or don't include the field at all.

---

**Fixed!** ✅

