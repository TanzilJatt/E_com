import { db } from "./firebase"
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
  serverTimestamp,
  orderBy,
  limit,
} from "firebase/firestore"
import { logActivity } from "./activity-logs"

export interface Item {
  id: string
  itemNumber?: number
  name: string
  sellingPrice?: number
  actualPrice?: number
  // Backward compatibility with old field names
  price?: number
  costPrice?: number
  quantity: number
  sku: string
  description: string
  vendor?: string
  createdAt: any
  createdBy: string
  updatedAt: any
  updatedBy: string
}

async function getNextItemNumber(userId: string): Promise<number> {
  try {
    // Get the highest item number for this user
    const itemsQuery = query(
      collection(db, "items"),
      where("createdBy", "==", userId),
      orderBy("itemNumber", "desc"),
      limit(1)
    )
    
    const snapshot = await getDocs(itemsQuery)
    
    if (snapshot.empty) {
      return 1 // First item
    }
    
    const highestItem = snapshot.docs[0].data()
    const highestNumber = highestItem.itemNumber || 0
    
    return highestNumber + 1
  } catch (error) {
    console.error("Error getting next item number:", error)
    // Fallback: count all items for this user
    const countQuery = query(
      collection(db, "items"),
      where("createdBy", "==", userId)
    )
    const countSnapshot = await getDocs(countQuery)
    return countSnapshot.size + 1
  }
}

async function generateNextSKU(): Promise<string> {
  try {
    if (!db) {
      throw new Error("Database is not available")
    }
    
    // Get all items to find the highest SKU number
    const snapshot = await getDocs(collection(db, "items"))
    let maxNumber = 0
    
    snapshot.docs.forEach((doc) => {
      const data = doc.data()
      if (data.sku) {
        // Extract number from SKU format like "SKU-0001"
        const match = data.sku.match(/SKU-(\d+)/)
        if (match) {
          const num = parseInt(match[1], 10)
          if (num > maxNumber) {
            maxNumber = num
          }
        }
      }
    })
    
    // Generate next SKU
    const nextNumber = maxNumber + 1
    const sku = `SKU-${nextNumber.toString().padStart(4, "0")}`
    console.log("🔢 Generated SKU:", sku)
    return sku
  } catch (error) {
    console.error("Error generating SKU:", error)
    throw error
  }
}

export async function addItem(
  itemData: Omit<Item, "id" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy" | "sku" | "itemNumber">,
  userId: string,
  userName: string,
): Promise<string | null> {
  try {
    console.log("📝 addItem called with:", { name: itemData.name, userId })
    
    if (!db) {
      console.error("❌ Database not available!")
      throw new Error("Database is not available. Please check your Firebase configuration and restart the dev server.")
    }
    
    // MAIN VALIDATION: Selling price must be greater than actual price
    if ((itemData.sellingPrice || itemData.price || 0) <= (itemData.actualPrice || itemData.costPrice || 0)) {
      throw new Error("Selling price must be greater than actual price")
    }
    
    // Generate sequential item number
    const itemNumber = await getNextItemNumber(userId)
    console.log("✓ Generated item number:", itemNumber)
    
    // Check if item with same name and sellingPrice exists
    const existingItems = await getItems(userId)
    const trimmedName = itemData.name.trim()
    const dataSellingPrice = itemData.sellingPrice || itemData.price || 0
    const existingItem = existingItems.find(
      (item) => item.name.toLowerCase() === trimmedName.toLowerCase() && (item.sellingPrice || item.price || 0) === dataSellingPrice
    )

    if (existingItem) {
      // Same name and sellingPrice - update quantity instead of creating new item
      const newQuantity = existingItem.quantity + itemData.quantity
      await updateItem(existingItem.id, { quantity: newQuantity }, userId)
      console.log("✅ Item quantity updated successfully! Document ID:", existingItem.id)
      await logActivity("ITEM_UPDATED", `Updated quantity for item: ${itemData.name} (${existingItem.sku})`, { itemId: existingItem.id })
      return existingItem.id
    }

    // Check if item with same name but different sellingPrice exists
    const sameNameDifferentPrice = existingItems.find(
      (item) => item.name.toLowerCase() === trimmedName.toLowerCase() && (item.sellingPrice || item.price || 0) !== dataSellingPrice
    )

    let finalName = trimmedName
    if (sameNameDifferentPrice) {
      // Generate unique name with suffix
      let suffix = 1
      let newName = `${trimmedName}_${suffix}`
      
      // Keep incrementing suffix until we find an unused name
      while (
        existingItems.some(
          (item) => item.name.toLowerCase() === newName.toLowerCase()
        ) &&
        suffix < 100 // Safety limit
      ) {
        suffix++
        newName = `${trimmedName}_${suffix}`
      }
      
      if (suffix >= 100) {
        throw new Error(`Too many items with name "${trimmedName}"`)
      }
      
      finalName = newName
      console.log("✓ Generated unique name:", finalName)
    }
    
    // Auto-generate SKU
    const sku = await generateNextSKU()
    console.log("✓ Auto-generated SKU:", sku)

    console.log("✓ Adding item to Firestore...")
    
    // Handle field name compatibility for both old and new names
    const dbData: any = { ...itemData, name: finalName }
    
    // Map new field names to old ones for backward compatibility
    if (itemData.sellingPrice !== undefined) {
      dbData.price = itemData.sellingPrice
    }
    if (itemData.actualPrice !== undefined) {
      dbData.costPrice = itemData.actualPrice
    }
    
    const docRef = await addDoc(collection(db, "items"), {
      ...dbData,
      sku,
      itemNumber: itemNumber,
      createdAt: serverTimestamp(),
      createdBy: userId,
      updatedAt: serverTimestamp(),
      updatedBy: userId,
    })

    console.log("✅ Item added successfully! Document ID:", docRef.id)
    console.log("📍 Check Firebase Console: https://console.firebase.google.com/project/e-commerce-25134/firestore")
    
    await logActivity("ITEM_ADDED", `Added new item: ${finalName} (${sku})`, { itemId: docRef.id })

    return docRef.id
  } catch (error: any) {
    console.error("❌ Error adding item:", error)
    console.error("Error code:", error?.code)
    console.error("Error message:", error?.message)
    
    if (error?.code === "permission-denied" || error?.message?.includes("PERMISSION_DENIED")) {
      console.error("\n🚨 PERMISSION DENIED - Firestore is not enabled or rules are blocking!")
      console.error("   Solution:")
      console.error("   1. Enable Firestore: https://console.firebase.google.com/project/e-commerce-25134/firestore")
      console.error("   2. Or check security rules")
    }
    
    throw error
  }
}

export async function updateItem(
  itemId: string,
  updates: Partial<Omit<Item, "id" | "createdAt" | "createdBy">>,
  userId: string,
  allowPriceBelowCost = false,
): Promise<void> {
  try {
    if (!db) {
      throw new Error("Database is not available. Please check your Firebase configuration and restart the dev server.")
    }
    
    // MAIN VALIDATION: Selling price must be greater than actual price (unless override is allowed)
    if (!allowPriceBelowCost) {
      const currentItems = await getItems(userId)
      const currentItem = currentItems.find(item => item.id === itemId)
      
      if (currentItem) {
        const newPrice = (updates.sellingPrice || updates.price) !== undefined ? (updates.sellingPrice || updates.price || 0) : (currentItem.sellingPrice || currentItem.price || 0)
        const newActualPrice = (updates.actualPrice || updates.costPrice) !== undefined ? (updates.actualPrice || updates.costPrice || 0) : (currentItem.actualPrice || currentItem.costPrice || 0)
        
        if (newPrice <= newActualPrice) {
          throw new Error("Selling price must be greater than actual price")
        }
      }
    }
    
    const itemRef = doc(db, "items", itemId)
    
    // Handle field name compatibility for both old and new names
    const dbUpdates: any = { ...updates }
    
    // Map new field names to old ones for backward compatibility
    if (updates.sellingPrice !== undefined) {
      dbUpdates.price = updates.sellingPrice
    }
    if (updates.actualPrice !== undefined) {
      dbUpdates.costPrice = updates.actualPrice
    }
    
    await updateDoc(itemRef, {
      ...dbUpdates,
      updatedAt: serverTimestamp(),
      updatedBy: userId,
    })

    await logActivity("ITEM_UPDATED", `Updated item: ${updates.name || "Unknown"}`, {
      itemId,
      changes: JSON.stringify(updates),
    })
  } catch (error) {
    console.error("Error updating item:", error)
    throw error
  }
}

export async function deleteItem(itemId: string): Promise<void> {
  try {
    if (!db) {
      throw new Error("Database is not available. Please check your Firebase configuration and restart the dev server.")
    }
    await deleteDoc(doc(db, "items", itemId))
    await logActivity("ITEM_DELETED", `Deleted item with ID: ${itemId}`, { itemId })
  } catch (error) {
    console.error("Error deleting item:", error)
    throw error
  }
}

export async function getItems(userId?: string): Promise<Item[]> {
  try {
    if (!db) {
      console.error("[v0] Database is not available")
      return []
    }
    console.log("[v0] Firebase getItems() called for user:", userId || "all")
    console.log("[v0] Firebase db object exists:", !!db)
    console.log("[v0] Firebase db type:", typeof db)

    let itemsQuery
    if (userId) {
      // Filter items by userId
      itemsQuery = query(collection(db, "items"), where("createdBy", "==", userId))
    } else {
      // Get all items (fallback for backwards compatibility)
      itemsQuery = collection(db, "items")
    }

    const docs = await getDocs(itemsQuery)

    console.log("[v0] Query executed successfully")
    console.log("[v0] Number of items returned:", docs.docs.length)

    const itemsList = docs.docs.map(
      (doc) =>
        ({
          id: doc.id,
          ...doc.data(),
        }) as Item,
    )
    
    // Sort by creation time (oldest first)
    const sortedItems = itemsList.sort((a, b) => {
      const aTime = a.createdAt?.toMillis?.() || 0
      const bTime = b.createdAt?.toMillis?.() || 0
      return aTime - bTime
    })
    
    // Assign sequential numbers to items that don't have them
    return sortedItems.map((item, index) => ({
      ...item,
      itemNumber: item.itemNumber || (index + 1)
    }))
  } catch (error: any) {
    console.error("[v0] Error fetching items - Type:", error.code || error.name)
    console.error("[v0] Error fetching items - Message:", error.message)
    console.error("[v0] Error details:", error)
    return []
  }
}
