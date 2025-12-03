import { db } from "./firebase"
import { collection, addDoc, updateDoc, doc, serverTimestamp, getDoc } from "firebase/firestore"
import { logActivity } from "./activity-logs"

export interface SaleItem {
  itemId: string
  itemName: string
  quantity: number
  pricePerUnit: number
  totalPrice: number
}

export interface Sale {
  id: string
  type: "wholesale" | "retail"
  items: SaleItem[]
  totalAmount: number
  userId: string
  userName: string
  createdAt: any
  transactionDate: any
}

export async function createSale(
  saleData: Omit<Sale, "id" | "createdAt" | "transactionDate">,
  userId: string,
  userName: string,
): Promise<string | null> {
  try {
    if (!db) {
      throw new Error("Database is not available. Please check your Firebase configuration and restart the dev server.")
    }
    // Validate sale type
    const totalQuantity = saleData.items.reduce((sum, item) => sum + item.quantity, 0)

    if (saleData.type === "wholesale" && totalQuantity < 12) {
      throw new Error("Wholesale sales require minimum 12 items")
    }
    if (saleData.type === "retail" && totalQuantity > 11) {
      throw new Error("Retail sales cannot exceed 11 items")
    }

    // Create sale
    const saleRef = await addDoc(collection(db, "sales"), {
      ...saleData,
      userId,
      userName,
      createdAt: serverTimestamp(),
      transactionDate: serverTimestamp(),
    })

    // Update inventory for each item
    for (const item of saleData.items) {
      const itemRef = doc(db, "items", item.itemId)
      const itemDoc = await getDoc(itemRef)
      if (itemDoc.exists()) {
        const currentQuantity = itemDoc.data().quantity
        await updateDoc(itemRef, {
          quantity: currentQuantity - item.quantity,
          updatedAt: serverTimestamp(),
        })
      }
    }

    // Log activity
    await logActivity("SALE_COMPLETED", `Completed ${saleData.type} sale with ${saleData.items.length} items`, {
      saleId: saleRef.id,
      changes: `Total: $${saleData.totalAmount}`,
    })

    return saleRef.id
  } catch (error) {
    console.error("Error creating sale:", error)
    throw error
  }
}
