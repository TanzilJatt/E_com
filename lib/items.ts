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

export async function addItem(
  itemData: Omit<Item, "id" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy">,
  userId: string,
  userName: string,
): Promise<string | null> {
  try {
    const existingSku = query(collection(db, "items"), where("sku", "==", itemData.sku.toUpperCase()))
    const docs = await getDocs(existingSku)
    if (!docs.empty) {
      const error = new Error("SKU already exists")
      error.name = "DuplicateSKU"
      throw error
    }

    const docRef = await addDoc(collection(db, "items"), {
      ...itemData,
      sku: itemData.sku.toUpperCase(),
      createdAt: serverTimestamp(),
      createdBy: userId,
      updatedAt: serverTimestamp(),
      updatedBy: userId,
    })

    await logActivity("ITEM_ADDED", `Added new item: ${itemData.name}`, { itemId: docRef.id })

    return docRef.id
  } catch (error) {
    console.error("Error adding item:", error)
    throw error
  }
}

export async function updateItem(
  itemId: string,
  updates: Partial<Omit<Item, "id" | "createdAt" | "createdBy">>,
  userId: string,
): Promise<void> {
  try {
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
    await deleteDoc(doc(db, "items", itemId))
    await logActivity("ITEM_DELETED", `Deleted item with ID: ${itemId}`, { itemId })
  } catch (error) {
    console.error("Error deleting item:", error)
    throw error
  }
}

export async function getItems(): Promise<Item[]> {
  try {
    console.log("[v0] Firebase getItems() called")
    console.log("[v0] Firebase db object exists:", !!db)
    console.log("[v0] Firebase db type:", typeof db)

    const docs = await getDocs(collection(db, "items"))

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
