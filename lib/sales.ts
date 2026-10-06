import { db } from "./firebase"
import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, getDoc, getDocs, query, orderBy, where, runTransaction, limit, increment } from "firebase/firestore"
import { logActivity } from "./activity-logs"

async function getNextSaleNumber(userId: string): Promise<number> {
  try {
    // Get all sales for this user (no index required)
    const salesQuery = query(
      collection(db, "sales"),
      where("userId", "==", userId)
    )
    
    const snapshot = await getDocs(salesQuery)
    
    if (snapshot.empty) {
      return 1 // First sale
    }
    
    // Sort client-side to find the highest sale number
    const sales = snapshot.docs.map(doc => doc.data())
    const highestSale = sales.reduce((max, sale) => {
      const saleNumber = sale.saleNumber || 0
      return saleNumber > max ? saleNumber : max
    }, 0)
    
    return highestSale + 1
  } catch (error) {
    console.error("Error getting next sale number:", error)
    // Fallback: count all sales for this user
    const countQuery = query(
      collection(db, "sales"),
      where("userId", "==", userId)
    )
    const countSnapshot = await getDocs(countQuery)
    return countSnapshot.size + 1
  }
}

// Separate function to migrate existing sales
export async function migrateSales(userId: string): Promise<void> {
  try {
    const allSalesQuery = query(
      collection(db, "sales"),
      where("userId", "==", userId)
    )
    const allSnapshot = await getDocs(allSalesQuery)
    
    // Get sales without saleNumber
    const salesWithoutNumbers = allSnapshot.docs
      .filter(doc => !doc.data().saleNumber)
      .sort((a, b) => {
        const aTime = a.data().createdAt?.toMillis?.() || 0
        const bTime = b.data().createdAt?.toMillis?.() || 0
        return aTime - bTime // Oldest first
      })
    
    if (salesWithoutNumbers.length === 0) {
      console.log("No sales to migrate")
      return
    }
    
    // Get the highest existing sale number
    const salesWithNumbers = allSnapshot.docs
      .filter(doc => doc.data().saleNumber)
      .map(doc => doc.data().saleNumber)
    
    const maxExistingNumber = salesWithNumbers.length > 0 ? Math.max(...salesWithNumbers) : 0
    let counter = maxExistingNumber + 1
    
    console.log(`Migrating ${salesWithoutNumbers.length} sales starting from #${counter}`)
    
    for (const doc of salesWithoutNumbers) {
      await updateDoc(doc.ref, { saleNumber: counter })
      console.log(`Assigned sale #${counter} to sale ${doc.id}`)
      counter++
    }
    
    console.log("Migration completed")
  } catch (error) {
    console.error("Error migrating sales:", error)
  }
}

export interface SaleItem {
  itemId: string
  itemName: string
  quantity: number
  // "box" = quantity is in boxes and sellingPricePerUnit is per box (older sales omit this)
  unit?: "box"
  sellingPricePerUnit: number
  cashPrice?: number
  creditPrice?: number
  totalPrice: number
}

export interface Sale {
  id: string
  saleNumber?: number
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
  customerId?: string // Linked customer (purchaserName holds their name at time of sale)
  description?: string
  userId: string
  userName: string
  createdAt: any
  transactionDate: any
}

export async function createSale(
  saleData: Omit<Sale, "id" | "createdAt" | "transactionDate" | "saleNumber">,
  userId: string,
  userName: string,
): Promise<string | null> {
  try {
    if (!db) {
      throw new Error("Database is not available. Please check your Firebase configuration and restart the dev server.")
    }
    
    // Generate sequential sale number
    const saleNumber = await getNextSaleNumber(userId)
    console.log("Generated sale number:", saleNumber)
    
    // No quantity restrictions - users can select any number of items for retail or box purchase
    const totalQuantity = saleData.items.reduce((sum, item) => sum + item.quantity, 0)

    // Clean items data - remove undefined values
    const cleanedItems = saleData.items.map(item => {
      const cleanItem: any = {
        itemId: item.itemId,
        itemName: item.itemName,
        quantity: item.quantity,
        sellingPricePerUnit: item.sellingPricePerUnit,
        totalPrice: item.totalPrice,
      }
      if (item.unit !== undefined) {
        cleanItem.unit = item.unit
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
      saleNumber,
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
    if (saleData.customerId) {
      saleDoc.customerId = saleData.customerId
    }
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

// Total quantity per item id for a list of sale lines
function quantitiesByItem(items: SaleItem[]): Record<string, number> {
  const totals: Record<string, number> = {}
  for (const item of items) totals[item.itemId] = (totals[item.itemId] || 0) + item.quantity
  return totals
}

const cleanSaleItem = (item: SaleItem) => {
  const cleanItem: any = {
    itemId: item.itemId,
    itemName: item.itemName,
    quantity: item.quantity,
    sellingPricePerUnit: item.sellingPricePerUnit,
    totalPrice: item.totalPrice,
  }
  if (item.unit !== undefined) cleanItem.unit = item.unit
  if (item.cashPrice !== undefined) cleanItem.cashPrice = item.cashPrice
  if (item.creditPrice !== undefined) cleanItem.creditPrice = item.creditPrice
  return cleanItem
}

// Update an existing sale. Stock is adjusted by the difference between the old and new lines.
// Sale number and date are kept.
export async function updateSale(
  originalSale: Sale,
  saleData: Pick<Sale, "items" | "totalAmount" | "paymentMethod" | "customerId" | "purchaserName" | "description">,
): Promise<void> {
  if (!db) {
    throw new Error("Database is not available. Please check your Firebase configuration and restart the dev server.")
  }

  const oldQty = quantitiesByItem(originalSale.items)
  const newQty = quantitiesByItem(saleData.items)
  const itemIds = new Set([...Object.keys(oldQty), ...Object.keys(newQty)])

  // Make sure there is enough stock for any increase before changing anything
  for (const itemId of itemIds) {
    const extra = (newQty[itemId] || 0) - (oldQty[itemId] || 0)
    if (extra <= 0) continue
    const itemDoc = await getDoc(doc(db, "items", itemId))
    const available = itemDoc.exists() ? itemDoc.data().quantity || 0 : 0
    if (extra > available) {
      const name = saleData.items.find((i) => i.itemId === itemId)?.itemName || "item"
      throw new Error(`Not enough stock for ${name}. Only ${available} more available.`)
    }
  }

  const paymentMethod: any = { cash: saleData.paymentMethod.cash, credit: saleData.paymentMethod.credit }
  if (saleData.paymentMethod.cashAmount !== undefined) paymentMethod.cashAmount = saleData.paymentMethod.cashAmount
  if (saleData.paymentMethod.creditAmount !== undefined) paymentMethod.creditAmount = saleData.paymentMethod.creditAmount

  await updateDoc(doc(db, "sales", originalSale.id), {
    items: saleData.items.map(cleanSaleItem),
    totalAmount: saleData.totalAmount,
    paymentMethod,
    customerId: saleData.customerId || "",
    purchaserName: saleData.purchaserName || "",
    description: saleData.description || "",
    updatedAt: serverTimestamp(),
  })

  for (const itemId of itemIds) {
    const change = (oldQty[itemId] || 0) - (newQty[itemId] || 0) // positive = stock returned
    if (change === 0) continue
    const itemRef = doc(db, "items", itemId)
    if ((await getDoc(itemRef)).exists()) {
      await updateDoc(itemRef, { quantity: increment(change), updatedAt: serverTimestamp() })
    }
  }

  await logActivity("SALE_UPDATED", `Updated sale #${originalSale.saleNumber || ""}`, {
    saleId: originalSale.id,
    changes: `Total: RS ${saleData.totalAmount}`,
  })
}

// Delete a sale and return its quantities to stock
export async function deleteSale(sale: Sale): Promise<void> {
  if (!db) {
    throw new Error("Database is not available. Please check your Firebase configuration and restart the dev server.")
  }
  await deleteDoc(doc(db, "sales", sale.id))

  for (const [itemId, quantity] of Object.entries(quantitiesByItem(sale.items))) {
    const itemRef = doc(db, "items", itemId)
    if ((await getDoc(itemRef)).exists()) {
      await updateDoc(itemRef, { quantity: increment(quantity), updatedAt: serverTimestamp() })
    }
  }

  await logActivity("SALE_DELETED", `Deleted sale #${sale.saleNumber || ""}`, {
    saleId: sale.id,
    changes: `Total: RS ${sale.totalAmount}`,
  })
}

export async function getSales(userId?: string, triggerMigration = false): Promise<Sale[]> {
  try {
    if (!db) {
      throw new Error("Database is not available")
    }
    
    // Trigger migration if requested
    if (triggerMigration && userId) {
      await migrateSales(userId)
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
          orderBy("saleNumber", "asc")
        )
        const snapshot = await getDocs(salesQuery)
        const sales = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Sale[]
        
        // Sort by saleNumber (ascending) to ensure correct order
        return sales.sort((a, b) => {
          const aNum = a.saleNumber || 0
          const bNum = b.saleNumber || 0
          return aNum - bNum
        })
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
          
          // Sort on client side (oldest first by creation time)
          const sortedSales = sales.sort((a, b) => {
            const aTime = a.createdAt?.toMillis?.() || 0
            const bTime = b.createdAt?.toMillis?.() || 0
            return aTime - bTime
          })
          
          // Assign sequential numbers to sales that don't have them
          return sortedSales.map((sale, index) => ({
            ...sale,
            saleNumber: sale.saleNumber || (index + 1)
          }))
        }
        throw indexError
      }
    } else {
      // Get all sales (fallback for backwards compatibility)
      salesQuery = query(collection(db, "sales"), orderBy("createdAt", "asc"))
      const snapshot = await getDocs(salesQuery)
      const sales = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Sale[]
      
      // Sort by creation time (oldest first)
      const sortedSales = sales.sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() || 0
        const bTime = b.createdAt?.toMillis?.() || 0
        return aTime - bTime
      })
      
      // Assign sequential numbers to sales that don't have them
      return sortedSales.map((sale, index) => ({
        ...sale,
        saleNumber: sale.saleNumber || (index + 1)
      }))
    }
  } catch (error) {
    console.error("Error fetching sales:", error)
    throw error
  }
}
