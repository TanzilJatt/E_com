import { db } from "./firebase"
import { collection, addDoc, getDocs, query, where, orderBy, serverTimestamp, Timestamp } from "firebase/firestore"

export interface PurchaseItem {
  itemId: string
  itemName: string
  sku: string
  quantity: number
  unitCost: number
  totalCost: number
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
    const purchaseRef = await addDoc(collection(db, "purchases"), {
      userId,
      supplierName: purchaseData.supplierName,
      supplierContact: purchaseData.supplierContact || "",
      items: purchaseData.items,
      totalAmount: purchaseData.totalAmount,
      notes: purchaseData.notes || "",
      purchaseDate: serverTimestamp(),
      createdAt: serverTimestamp(),
    })

    // Log activity
    await addDoc(collection(db, "activityLogs"), {
      userId,
      action: "Purchase Recorded",
      description: `Purchased ${purchaseData.items.length} items from ${purchaseData.supplierName}`,
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
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Purchase[]
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
        
        // Sort client-side by purchaseDate descending
        return purchases.sort((a, b) => {
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

