import { db } from "./firebase"
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  runTransaction,
  setDoc,
  increment,
  serverTimestamp,
} from "firebase/firestore"

// Boxes of an item the admin has handed to a staff member to sell
export interface StaffStock {
  id: string
  adminId: string
  staffId: string
  itemId: string
  itemName: string
  quantity: number
  updatedAt?: any
}

export const staffStockId = (staffId: string, itemId: string) => `${staffId}_${itemId}`

export async function getStaffStock(filter: { staffId: string } | { adminId: string }): Promise<StaffStock[]> {
  if (!db) return []
  const [field, value] = "staffId" in filter ? ["staffId", filter.staffId] : ["adminId", filter.adminId]
  const snapshot = await getDocs(query(collection(db, "staffStock"), where(field, "==", value)))
  return snapshot.docs
    .map((d) => ({ id: d.id, ...d.data() }) as StaffStock)
    .sort((a, b) => a.itemName.localeCompare(b.itemName))
}

export async function getStaffStockQuantity(staffId: string, itemId: string): Promise<number> {
  const snap = await getDoc(doc(db, "staffStock", staffStockId(staffId, itemId)))
  return snap.exists() ? snap.data().quantity || 0 : 0
}

// Admin-side change to a staff member's stock (used when an admin edits or deletes a staff sale)
export async function adjustStaffStock(
  adminId: string,
  staffId: string,
  itemId: string,
  itemName: string,
  change: number,
): Promise<void> {
  await setDoc(
    doc(db, "staffStock", staffStockId(staffId, itemId)),
    { adminId, staffId, itemId, itemName, quantity: increment(change), updatedAt: serverTimestamp() },
    { merge: true },
  )
}

// Move boxes between the main inventory and a staff member.
// Positive quantity sends stock to the staff member, negative takes it back.
export async function transferStock(
  data: { adminId: string; staffId: string; staffName: string; itemId: string; quantity: number },
  adminName: string,
): Promise<void> {
  if (!db) {
    throw new Error("Database is not available. Please check your Firebase configuration and restart the dev server.")
  }
  if (!Number.isInteger(data.quantity) || data.quantity === 0) {
    throw new Error("Enter a whole number of boxes")
  }

  const itemRef = doc(db, "items", data.itemId)
  const stockRef = doc(db, "staffStock", staffStockId(data.staffId, data.itemId))

  await runTransaction(db, async (tx) => {
    const itemSnap = await tx.get(itemRef)
    if (!itemSnap.exists()) throw new Error("Item not found")
    const stockSnap = await tx.get(stockRef)
    const itemQty = itemSnap.data().quantity || 0
    const staffQty = stockSnap.exists() ? stockSnap.data().quantity || 0 : 0
    const itemName = itemSnap.data().name

    if (data.quantity > 0 && data.quantity > itemQty) {
      throw new Error(`Only ${itemQty} boxes of ${itemName} in stock`)
    }
    if (data.quantity < 0 && -data.quantity > staffQty) {
      throw new Error(`${data.staffName} only has ${staffQty} boxes of ${itemName}`)
    }

    tx.update(itemRef, { quantity: itemQty - data.quantity, updatedAt: serverTimestamp() })
    tx.set(stockRef, {
      adminId: data.adminId,
      staffId: data.staffId,
      itemId: data.itemId,
      itemName,
      quantity: staffQty + data.quantity,
      updatedAt: serverTimestamp(),
    })
    tx.set(doc(collection(db, "stockTransfers")), {
      adminId: data.adminId,
      adminName,
      staffId: data.staffId,
      staffName: data.staffName,
      itemId: data.itemId,
      itemName,
      quantity: data.quantity,
      createdAt: serverTimestamp(),
    })
  })
}
