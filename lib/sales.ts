import { db } from "./firebase"
import { collection, addDoc, updateDoc, doc, serverTimestamp, getDoc, getDocs, query, orderBy, where } from "firebase/firestore"
import { logActivity } from "./activity-logs"

export interface SaleItem {
  itemId: string
  itemName: string
  quantity: number
  pricePerUnit: number
  cashPrice?: number
  creditPrice?: number
  totalPrice: number
}

export interface Sale {
  id: string
  type: "box" | "retail"
  items: SaleItem[]
  totalAmount: number
  paymentMethod: {
    cash: boolean
    credit: boolean
    cashAmount?: number
    creditAmount?: number
  }
  purchaserName?: string
  description?: string
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
    // No quantity restrictions - users can select any number of items for retail or box purchase
    const totalQuantity = saleData.items.reduce((sum, item) => sum + item.quantity, 0)

    // Clean items data - remove undefined values
    const cleanedItems = saleData.items.map(item => {
      const cleanItem: any = {
        itemId: item.itemId,
        itemName: item.itemName,
        quantity: item.quantity,
        pricePerUnit: item.pricePerUnit,
        totalPrice: item.totalPrice,
      }
      if (item.cashPrice !== undefined) {
        cleanItem.cashPrice = item.cashPrice
      }
      if (item.creditPrice !== undefined) {
        cleanItem.creditPrice = item.creditPrice
      }
      return cleanItem
    })

    // Clean payment method data - remove undefined values
    const cleanedPaymentMethod: any = {
      cash: saleData.paymentMethod.cash,
      credit: saleData.paymentMethod.credit,
    }
    if (saleData.paymentMethod.cashAmount !== undefined) {
      cleanedPaymentMethod.cashAmount = saleData.paymentMethod.cashAmount
    }
    if (saleData.paymentMethod.creditAmount !== undefined) {
      cleanedPaymentMethod.creditAmount = saleData.paymentMethod.creditAmount
    }

    // Create sale with cleaned data
    const saleDoc: any = {
      type: saleData.type,
      items: cleanedItems,
      totalAmount: saleData.totalAmount,
      paymentMethod: cleanedPaymentMethod,
      userId,
      userName,
      createdAt: serverTimestamp(),
      transactionDate: serverTimestamp(),
    }

    // Add optional fields if provided
    if (saleData.purchaserName) {
      saleDoc.purchaserName = saleData.purchaserName
    }
    if (saleData.description) {
      saleDoc.description = saleData.description
    }

    const saleRef = await addDoc(collection(db, "sales"), saleDoc)

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
    const paymentInfo = saleData.paymentMethod.cash && saleData.paymentMethod.credit
      ? `Cash: RS ${saleData.paymentMethod.cashAmount}, Credit: RS ${saleData.paymentMethod.creditAmount}`
      : saleData.paymentMethod.cash
        ? "Cash"
        : "Credit"
    
    await logActivity("SALE_COMPLETED", `Completed ${saleData.type} sale with ${saleData.items.length} items`, {
      saleId: saleRef.id,
      changes: `Total: RS ${saleData.totalAmount} | Payment: ${paymentInfo}`,
    })

    return saleRef.id
  } catch (error) {
    console.error("Error creating sale:", error)
    throw error
  }
}

export async function getSales(userId?: string): Promise<Sale[]> {
  try {
    if (!db) {
      throw new Error("Database is not available")
    }
    
    let salesQuery
    if (userId) {
      // Filter sales by userId
      // Note: This requires a composite index (userId + createdAt)
      // The index will be auto-created when you click the link in the error
      try {
        salesQuery = query(
          collection(db, "sales"), 
          where("userId", "==", userId),
          orderBy("createdAt", "desc")
        )
        const snapshot = await getDocs(salesQuery)
        return snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Sale[]
      } catch (indexError: any) {
        // If index doesn't exist yet, fall back to client-side sorting
        if (indexError.code === 'failed-precondition') {
          console.warn("Index not created yet, using client-side sorting")
          salesQuery = query(
            collection(db, "sales"), 
            where("userId", "==", userId)
          )
          const snapshot = await getDocs(salesQuery)
          const sales = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
          })) as Sale[]
          
          // Sort on client side
          return sales.sort((a, b) => {
            const aTime = a.createdAt?.toMillis?.() || 0
            const bTime = b.createdAt?.toMillis?.() || 0
            return bTime - aTime
          })
        }
        throw indexError
      }
    } else {
      // Get all sales (fallback for backwards compatibility)
      salesQuery = query(collection(db, "sales"), orderBy("createdAt", "desc"))
      const snapshot = await getDocs(salesQuery)
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Sale[]
    }
  } catch (error) {
    console.error("Error fetching sales:", error)
    throw error
  }
}
