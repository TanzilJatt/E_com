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
} from "firebase/firestore"
import { logActivity } from "./activity-logs"

export interface Item {
  id: string
  name: string
  price: number
  quantity: number
  sku: string
  description: string
  createdAt: any
  createdBy: string
  updatedAt: any
  updatedBy: string
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
  itemData: Omit<Item, "id" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy" | "sku">,
  userId: string,
  userName: string,
): Promise<string | null> {
  try {
    console.log("📝 addItem called with:", { name: itemData.name, userId })
    
    if (!db) {
      console.error("❌ Database not available!")
      throw new Error("Database is not available. Please check your Firebase configuration and restart the dev server.")
    }
    
    // Auto-generate SKU
    const sku = await generateNextSKU()
    console.log("✓ Auto-generated SKU:", sku)

    console.log("✓ Adding item to Firestore...")
    const docRef = await addDoc(collection(db, "items"), {
      ...itemData,
      sku,
      createdAt: serverTimestamp(),
      createdBy: userId,
      updatedAt: serverTimestamp(),
      updatedBy: userId,
    })

    console.log("✅ Item added successfully! Document ID:", docRef.id)
    console.log("📍 Check Firebase Console: https://console.firebase.google.com/project/e-commerce-25134/firestore")
    
    await logActivity("ITEM_ADDED", `Added new item: ${itemData.name} (${sku})`, { itemId: docRef.id })

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
): Promise<void> {
  try {
    if (!db) {
      throw new Error("Database is not available. Please check your Firebase configuration and restart the dev server.")
    }
    const itemRef = doc(db, "items", itemId)
    await updateDoc(itemRef, {
      ...updates,
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

    return itemsList
  } catch (error: any) {
    console.error("[v0] Error fetching items - Type:", error.code || error.name)
    console.error("[v0] Error fetching items - Message:", error.message)
    console.error("[v0] Error details:", error)
    return []
  }
}
