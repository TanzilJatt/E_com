import { db } from "./firebase"
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  query,
  where,
  serverTimestamp,
  deleteField,
} from "firebase/firestore"
import { logActivity } from "./activity-logs"

export interface Customer {
  id: string
  name: string
  phone?: string
  address?: string
  notes?: string
  // Agreed price per box for this customer, keyed by item id
  itemPrices?: Record<string, number>
  userId: string
  userName: string
  createdAt: any
  updatedAt: any
}

export type CustomerInput = Pick<Customer, "name" | "phone" | "address" | "notes">

export async function addCustomer(data: CustomerInput, userId: string, userName: string): Promise<string> {
  try {
    if (!db) {
      throw new Error("Database is not available. Please check your Firebase configuration and restart the dev server.")
    }
    const name = data.name.trim()
    const existing = await getCustomers(userId)
    if (existing.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
      throw new Error(`A customer named "${name}" already exists`)
    }

    const docRef = await addDoc(collection(db, "customers"), {
      name,
      phone: data.phone?.trim() || "",
      address: data.address?.trim() || "",
      notes: data.notes?.trim() || "",
      itemPrices: {},
      userId,
      userName,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })

    await logActivity("CUSTOMER_ADDED", `Added customer: ${name}`, { customerId: docRef.id })
    return docRef.id
  } catch (error: any) {
    console.error("Error adding customer:", error)
    throw new Error(error.message || "Failed to add customer")
  }
}

export async function updateCustomer(customerId: string, data: CustomerInput, userId: string): Promise<void> {
  try {
    if (!db) {
      throw new Error("Database is not available. Please check your Firebase configuration and restart the dev server.")
    }
    const name = data.name.trim()
    const existing = await getCustomers(userId)
    if (existing.some((c) => c.id !== customerId && c.name.toLowerCase() === name.toLowerCase())) {
      throw new Error(`A customer named "${name}" already exists`)
    }

    await updateDoc(doc(db, "customers", customerId), {
      name,
      phone: data.phone?.trim() || "",
      address: data.address?.trim() || "",
      notes: data.notes?.trim() || "",
      updatedAt: serverTimestamp(),
    })

    await logActivity("CUSTOMER_UPDATED", `Updated customer: ${name}`, { customerId })
  } catch (error: any) {
    console.error("Error updating customer:", error)
    throw new Error(error.message || "Failed to update customer")
  }
}

export async function deleteCustomer(customerId: string, customerName: string): Promise<void> {
  try {
    if (!db) {
      throw new Error("Database is not available. Please check your Firebase configuration and restart the dev server.")
    }
    await deleteDoc(doc(db, "customers", customerId))
    await logActivity("CUSTOMER_DELETED", `Deleted customer: ${customerName}`, { customerId })
  } catch (error: any) {
    console.error("Error deleting customer:", error)
    throw new Error(error.message || "Failed to delete customer")
  }
}

export async function getCustomers(userId: string): Promise<Customer[]> {
  try {
    if (!db) {
      console.error("Database is not available")
      return []
    }
    const snapshot = await getDocs(query(collection(db, "customers"), where("userId", "==", userId)))
    return snapshot.docs
      .map((d) => ({ id: d.id, ...d.data() }) as Customer)
      .sort((a, b) => a.name.localeCompare(b.name))
  } catch (error: any) {
    console.error("Error fetching customers:", error)
    throw new Error(error.message || "Failed to fetch customers")
  }
}

// Remember the price per box a customer paid for items (called after a sale)
export async function saveCustomerItemPrices(customerId: string, prices: Record<string, number>): Promise<void> {
  if (!db || Object.keys(prices).length === 0) return
  const updates: Record<string, any> = { updatedAt: serverTimestamp() }
  for (const [itemId, price] of Object.entries(prices)) {
    updates[`itemPrices.${itemId}`] = price > 0 ? price : deleteField()
  }
  await updateDoc(doc(db, "customers", customerId), updates)
}
