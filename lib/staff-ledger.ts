import { db } from "./firebase"
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
  Timestamp,
  type QueryConstraint,
} from "firebase/firestore"
import type { Sale } from "./sales"
import type { Expense } from "./expenses"

// Cash the shopkeeper (staff) handed over to the admin
export interface StaffPayment {
  id: string
  adminId: string
  staffId: string
  staffName: string
  amount: number
  note?: string
  date: Timestamp
  createdAt: Timestamp
}

// Stock sent to (+) or taken back from (-) a staff member
export interface StockTransfer {
  id: string
  adminId: string
  staffId: string
  staffName: string
  itemId: string
  itemName: string
  quantity: number
  createdAt: Timestamp
}

// Admins filter by their own id too, so the query matches what the security rules allow
const staffFilter = (staffId: string, adminId?: string): QueryConstraint[] =>
  adminId ? [where("adminId", "==", adminId), where("staffId", "==", staffId)] : [where("staffId", "==", staffId)]

export async function getStockTransfers(staffId: string, adminId?: string): Promise<StockTransfer[]> {
  if (!db) return []
  const snapshot = await getDocs(query(collection(db, "stockTransfers"), ...staffFilter(staffId, adminId)))
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as StockTransfer)
}

export async function getStaffPayments(staffId: string, adminId?: string): Promise<StaffPayment[]> {
  if (!db) return []
  const snapshot = await getDocs(query(collection(db, "staffPayments"), ...staffFilter(staffId, adminId)))
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as StaffPayment)
}

export async function getStaffExpenses(staffId: string): Promise<Expense[]> {
  if (!db) return []
  const snapshot = await getDocs(query(collection(db, "expenses"), where("staffId", "==", staffId)))
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Expense)
}

export async function addStaffPayment(data: {
  adminId: string
  staffId: string
  staffName: string
  amount: number
  note?: string
  date: Date
}): Promise<string> {
  if (!db) {
    throw new Error("Database is not available. Please check your Firebase configuration and restart the dev server.")
  }
  if (!(data.amount > 0)) {
    throw new Error("Amount must be greater than 0")
  }
  const docRef = await addDoc(collection(db, "staffPayments"), {
    adminId: data.adminId,
    staffId: data.staffId,
    staffName: data.staffName,
    amount: data.amount,
    note: data.note?.trim() || "",
    date: Timestamp.fromDate(data.date),
    createdAt: Timestamp.now(),
  })
  return docRef.id
}

export async function deleteStaffPayment(paymentId: string): Promise<void> {
  await deleteDoc(doc(db, "staffPayments", paymentId))
}

export interface StaffLedgerEntry {
  id: string
  kind: "stock" | "sale" | "expense" | "handover"
  date: Date
  reference: string // "Stock received", "Sale #0012", "Expense", "Cash to admin"
  details: string
  boxesIn: number // stock received from admin
  boxesOut: number // stock sold or returned to admin
  cashIn: number // cash taken from customers
  credit: number // sold on credit (goes to the customer's balance, not the shop's cash)
  cashOut: number // expenses paid and cash handed to admin
  stockBalance: number // boxes with the staff member after this entry
  cashBalance: number // cash in hand after this entry
  sourceId: string // id of the sale / expense / transfer / payment
}

const toDate = (value: any): Date => (value?.toDate ? value.toDate() : new Date(value))

// Every stock and cash movement for one staff member, in date order with running balances
export function buildStaffLedger(
  transfers: StockTransfer[],
  sales: Sale[],
  expenses: Expense[],
  payments: StaffPayment[],
): StaffLedgerEntry[] {
  const entries: Omit<StaffLedgerEntry, "stockBalance" | "cashBalance">[] = []
  const blank = { boxesIn: 0, boxesOut: 0, cashIn: 0, credit: 0, cashOut: 0 }

  for (const t of transfers) {
    const sent = t.quantity > 0
    entries.push({
      ...blank,
      id: `stock-${t.id}`,
      kind: "stock",
      date: toDate(t.createdAt),
      reference: sent ? "Stock received" : "Stock returned",
      details: `${t.itemName} × ${Math.abs(t.quantity)} boxes`,
      boxesIn: sent ? t.quantity : 0,
      boxesOut: sent ? 0 : -t.quantity,
      sourceId: t.id,
    })
  }

  for (const sale of sales) {
    const boxes = sale.items.reduce((sum, item) => sum + item.quantity, 0)
    entries.push({
      ...blank,
      id: `sale-${sale.id}`,
      kind: "sale",
      date: toDate(sale.transactionDate || sale.createdAt),
      reference: `Sale #${(sale.saleNumber || 0).toString().padStart(4, "0")}`,
      details: `${sale.purchaserName ? `${sale.purchaserName}: ` : ""}${sale.items
        .map((item) => `${item.itemName} × ${item.quantity}`)
        .join(", ")}`,
      boxesOut: boxes,
      cashIn: sale.paymentMethod?.cash ? sale.paymentMethod.cashAmount || 0 : 0,
      credit: sale.paymentMethod?.credit ? sale.paymentMethod.creditAmount || 0 : 0,
      sourceId: sale.id,
    })
  }

  for (const expense of expenses) {
    entries.push({
      ...blank,
      id: `expense-${expense.id}`,
      kind: "expense",
      date: toDate(expense.date || expense.createdAt),
      reference: "Expense",
      details: `${expense.name} (${expense.category})${expense.description ? ` — ${expense.description}` : ""}`,
      cashOut: expense.amount || 0,
      sourceId: expense.id,
    })
  }

  for (const payment of payments) {
    entries.push({
      ...blank,
      id: `handover-${payment.id}`,
      kind: "handover",
      date: toDate(payment.date),
      reference: "Cash to admin",
      details: payment.note || "Cash handed over",
      cashOut: payment.amount || 0,
      sourceId: payment.id,
    })
  }

  entries.sort((a, b) => a.date.getTime() - b.date.getTime())

  let stock = 0
  let cash = 0
  return entries.map((entry) => {
    stock += entry.boxesIn - entry.boxesOut
    cash += entry.cashIn - entry.cashOut
    return { ...entry, stockBalance: stock, cashBalance: cash }
  })
}
