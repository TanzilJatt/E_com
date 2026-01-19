import { db } from "./firebase"
import { collection, addDoc, getDocs, getDoc, doc, updateDoc, query, where, orderBy, serverTimestamp, Timestamp, increment } from "firebase/firestore"

export interface PurchaseItem {
  itemId: string
  itemName: string
  sku: string
  quantity: number
  unitCost: number
  totalCost: number
  pricingType?: "unit" | "bulk"
  bulkPrice?: number
}

export interface Purchase {
  id: string
  userId: string
  supplierName: string
  supplierContact?: string
  items: PurchaseItem[]
  totalAmount: number
  purchaseDate: Timestamp
  notes?: string
  createdAt: Timestamp
}

export interface NewItemPurchase {
  itemName: string
  category: string
  sku: string
  quantity: number
  unitCost: number
  retailPrice: number
  wholesalePrice: number
  description?: string
}

/**
 * Create a new purchase record
 */
export async function createPurchase(
  userId: string,
  purchaseData: {
    supplierName: string
    supplierContact?: string
    items: PurchaseItem[]
    totalAmount: number
    notes?: string
  }
): Promise<string> {
  try {
    // First, update inventory quantities for all items
    for (const item of purchaseData.items) {
      const itemRef = doc(db, "items", item.itemId)
      
      // Get current item to update SKU in purchase record
      const itemDoc = await getDoc(itemRef)
      if (itemDoc.exists()) {
        // Update quantity using increment
        await updateDoc(itemRef, {
          quantity: increment(item.quantity),
          updatedAt: serverTimestamp(),
          updatedBy: userId,
        })
        
        // Update SKU in the purchase item if it was auto-generated
        if (item.sku === "Auto-generated") {
          item.sku = itemDoc.data().sku || "Auto-generated"
        }
      }
    }

    // Clean items to remove undefined values (Firebase doesn't allow undefined)
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

    // Create purchase record
    const purchaseRef = await addDoc(collection(db, "purchases"), {
      userId,
      supplierName: purchaseData.supplierName,
      supplierContact: purchaseData.supplierContact || "",
      items: cleanedItems,
      totalAmount: purchaseData.totalAmount,
      notes: purchaseData.notes || "",
      purchaseDate: serverTimestamp(),
      createdAt: serverTimestamp(),
    })

    // Log activity
    await addDoc(collection(db, "activityLogs"), {
      userId,
      action: "Purchase Recorded",
      description: `Purchased ${purchaseData.items.length} items`,
      timestamp: serverTimestamp(),
    })

    return purchaseRef.id
  } catch (error) {
    console.error("Error creating purchase:", error)
    throw error
  }
}

/**
 * Get all purchases for a specific user
 */
export async function getPurchases(userId: string): Promise<Purchase[]> {
  try {
    // Try with index first
    const q = query(
      collection(db, "purchases"),
      where("userId", "==", userId),
      orderBy("purchaseDate", "desc")
    )

    const snapshot = await getDocs(q)
    const purchases = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Purchase[]
    
    // Filter out deleted purchases
    return purchases.filter((purchase: any) => !purchase.deleted)
  } catch (error: any) {
    // If index doesn't exist, fallback to client-side sorting
    if (error?.code === "failed-precondition" || error?.message?.includes("index")) {
      console.log("⚠️ Firestore index not deployed yet. Using fallback query with client-side sorting.")
      console.log("💡 To fix this permanently, deploy the index using: firebase deploy --only firestore:indexes")
      
      try {
        const q = query(collection(db, "purchases"), where("userId", "==", userId))
        const snapshot = await getDocs(q)
        const purchases = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Purchase[]
        
        // Filter out deleted purchases and sort client-side by purchaseDate descending
        return purchases
          .filter((purchase: any) => !purchase.deleted)
          .sort((a, b) => {
          const aTime = a.purchaseDate?.toMillis ? a.purchaseDate.toMillis() : 0
          const bTime = b.purchaseDate?.toMillis ? b.purchaseDate.toMillis() : 0
          return bTime - aTime
        })
      } catch (fallbackError) {
        console.error("Error in fallback query:", fallbackError)
        throw fallbackError
      }
    } else {
      console.error("Error fetching purchases:", error)
      throw error
    }
  }
}

/**
 * Get total purchase amount for a date range
 */
export async function getTotalPurchases(
  userId: string,
  startDate?: Date,
  endDate?: Date
): Promise<number> {
  try {
    let q = query(collection(db, "purchases"), where("userId", "==", userId))

    const snapshot = await getDocs(q)
    const purchases = snapshot.docs.map((doc) => doc.data())

    let total = 0
    purchases.forEach((purchase: any) => {
      const purchaseDate = purchase.purchaseDate?.toDate ? purchase.purchaseDate.toDate() : new Date()
      
      if (startDate && endDate) {
        if (purchaseDate >= startDate && purchaseDate <= endDate) {
          total += purchase.totalAmount || 0
        }
      } else {
        total += purchase.totalAmount || 0
      }
    })

    return total
  } catch (error) {
    console.error("Error calculating total purchases:", error)
    return 0
  }
}

/**
 * Update an existing purchase record
 */
export async function updatePurchase(
  purchaseId: string,
  purchaseData: {
    supplierName: string
    supplierContact?: string
    items: PurchaseItem[]
    totalAmount: number
    notes?: string
  },
  userId: string
): Promise<void> {
  try {
    const purchaseRef = doc(db, "purchases", purchaseId)
    
    // Get the old purchase to calculate inventory adjustments
    const oldPurchaseDoc = await getDoc(purchaseRef)
    if (!oldPurchaseDoc.exists()) {
      throw new Error("Purchase not found")
    }
    
    const oldPurchase = oldPurchaseDoc.data() as Purchase
    
    // Adjust inventory: subtract old quantities and add new quantities
    // First, revert the old quantities
    for (const oldItem of oldPurchase.items) {
      const itemRef = doc(db, "items", oldItem.itemId)
      const itemDoc = await getDoc(itemRef)
      if (itemDoc.exists()) {
        await updateDoc(itemRef, {
          quantity: increment(-oldItem.quantity),
          updatedAt: serverTimestamp(),
          updatedBy: userId,
        })
      }
    }
    
    // Then, add the new quantities
    for (const newItem of purchaseData.items) {
      const itemRef = doc(db, "items", newItem.itemId)
      const itemDoc = await getDoc(itemRef)
      if (itemDoc.exists()) {
        await updateDoc(itemRef, {
          quantity: increment(newItem.quantity),
          updatedAt: serverTimestamp(),
          updatedBy: userId,
        })
      }
    }

    // Clean items to remove undefined values (Firebase doesn't allow undefined)
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

    // Update purchase record
    await updateDoc(purchaseRef, {
      supplierName: purchaseData.supplierName,
      supplierContact: purchaseData.supplierContact || "",
      items: cleanedItems,
      totalAmount: purchaseData.totalAmount,
      notes: purchaseData.notes || "",
      updatedAt: serverTimestamp(),
    })

    // Log activity
    await addDoc(collection(db, "activityLogs"), {
      userId,
      action: "Purchase Updated",
      description: `Updated purchase with ${purchaseData.items.length} items`,
      timestamp: serverTimestamp(),
    })
  } catch (error) {
    console.error("Error updating purchase:", error)
    throw error
  }
}

/**
 * Delete a purchase record
 */
export async function deletePurchase(purchaseId: string, userId: string): Promise<void> {
  try {
    const purchaseRef = doc(db, "purchases", purchaseId)
    
    // Get the purchase to revert inventory
    const purchaseDoc = await getDoc(purchaseRef)
    if (!purchaseDoc.exists()) {
      throw new Error("Purchase not found")
    }
    
    const purchase = purchaseDoc.data() as Purchase
    
    // Revert inventory quantities
    for (const item of purchase.items) {
      const itemRef = doc(db, "items", item.itemId)
      const itemDoc = await getDoc(itemRef)
      if (itemDoc.exists()) {
        await updateDoc(itemRef, {
          quantity: increment(-item.quantity),
          updatedAt: serverTimestamp(),
          updatedBy: userId,
        })
      }
    }

    // Delete purchase record
    await updateDoc(purchaseRef, {
      deleted: true,
      deletedAt: serverTimestamp(),
      deletedBy: userId,
    })

    // Log activity
    await addDoc(collection(db, "activityLogs"), {
      userId,
      action: "Purchase Deleted",
      description: `Deleted purchase with ${purchase.items.length} items`,
      timestamp: serverTimestamp(),
    })
  } catch (error) {
    console.error("Error deleting purchase:", error)
    throw error
  }
}

