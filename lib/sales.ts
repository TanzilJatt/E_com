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
  type: "wholesale" | "retail"
  items: SaleItem[]
  totalAmount: number
  paymentMethod: {
    cash: boolean
    credit: boolean
    cashAmount?: number
    creditAmount?: number
  }
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
    const saleRef = await addDoc(collection(db, "sales"), {
      type: saleData.type,
      items: cleanedItems,
      totalAmount: saleData.totalAmount,
      paymentMethod: cleanedPaymentMethod,
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

export async function getSales(): Promise<Sale[]> {
  try {
    if (!db) {
      throw new Error("Database is not available")
    }
    const q = query(collection(db, "sales"), orderBy("createdAt", "desc"))
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Sale[]
  } catch (error) {
    console.error("Error fetching sales:", error)
    throw error
  }
}
