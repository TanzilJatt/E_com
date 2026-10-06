import { db } from "./firebase"
import { collection, addDoc, getDocs, deleteDoc, doc, query, where, Timestamp } from "firebase/firestore"

// Money received from a customer against their credit balance
export interface CustomerPayment {
  id: string
  customerId: string
  customerName: string
  amount: number
  note?: string
  date: Timestamp
  userId: string
  userName: string
  createdAt: Timestamp
}

export async function addCustomerPayment(
  data: { customerId: string; customerName: string; amount: number; note?: string; date: Date },
  userId: string,
  userName: string,
): Promise<string> {
  if (!db) {
    throw new Error("Database is not available. Please check your Firebase configuration and restart the dev server.")
  }
  if (!(data.amount > 0)) {
    throw new Error("Payment amount must be greater than 0")
  }
  const docRef = await addDoc(collection(db, "customerPayments"), {
    customerId: data.customerId,
    customerName: data.customerName,
    amount: data.amount,
    note: data.note?.trim() || "",
    date: Timestamp.fromDate(data.date),
    userId,
    userName,
    createdAt: Timestamp.now(),
  })
  return docRef.id
}

export async function deleteCustomerPayment(paymentId: string): Promise<void> {
  if (!db) {
    throw new Error("Database is not available. Please check your Firebase configuration and restart the dev server.")
  }
  await deleteDoc(doc(db, "customerPayments", paymentId))
}

export async function getCustomerPayments(userId: string): Promise<CustomerPayment[]> {
  if (!db) return []
  const snapshot = await getDocs(query(collection(db, "customerPayments"), where("userId", "==", userId)))
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as CustomerPayment)
}
