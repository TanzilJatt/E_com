import { db } from "./firebase"
import { collection, addDoc, updateDoc, doc, serverTimestamp, getDoc, getDocs, query, orderBy, where, runTransaction, limit } from "firebase/firestore"
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
    
    // DATABASE LEVEL ABSOLUTE VALIDATION: Check all items against item's regular selling price
    const { getItems } = await import("./items")
    const allItems = await getItems(userId)
    
    for (const saleItem of saleData.items) {
      const item = allItems.find(i => i.id === saleItem.itemId)
      if (item) {
        const itemSellingPrice = item.sellingPrice || item.price || 0
        console.log(`DATABASE CHECK: Item ${saleItem.itemName}, Selling price=${saleItem.sellingPricePerUnit}, Item selling price=${itemSellingPrice}`)
        
        // Check all price types against item's regular selling price
        const pricesToCheck = []
        if (saleItem.cashPrice) pricesToCheck.push({ type: 'Cash', price: saleItem.cashPrice })
        if (saleItem.creditPrice) pricesToCheck.push({ type: 'Credit', price: saleItem.creditPrice })
        pricesToCheck.push({ type: 'Base', price: saleItem.sellingPricePerUnit })
        
        for (const { type, price } of pricesToCheck) {
          if (price < itemSellingPrice) {
            console.log(`DATABASE BLOCK: ${type} price ${price} < item selling price ${itemSellingPrice}`)
            throw new Error(`DATABASE FORBIDDEN: Item "${saleItem.itemName}" ${type} price (RS ${price.toFixed(2)}) is LESS than item selling price (RS ${itemSellingPrice.toFixed(2)}). This sale is ABSOLUTELY FORBIDDEN!`)
          }
        }
      }
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
