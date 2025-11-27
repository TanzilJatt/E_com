import { db } from "./firebase"
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, Timestamp } from "firebase/firestore"
import { logActivity } from "./activity-logs"

export interface Expense {
  id: string
  name: string
  category: string
  amount: number
  description: string
  date: Timestamp
  userId: string
  userName: string
  createdAt: Timestamp
}

export async function addExpense(
  expenseData: Omit<Expense, "id" | "userId" | "userName" | "createdAt">,
  userId: string,
  userName: string,
) {
  try {
    const expenseRef = await addDoc(collection(db, "expenses"), {
      ...expenseData,
      userId,
      userName,
      createdAt: Timestamp.now(),
    })

    await logActivity("ADD_EXPENSE", `Added expense: ${expenseData.name} ($${expenseData.amount})`, userId, userName)

    return expenseRef.id
  } catch (error: any) {
    console.error("Error adding expense:", error)
    throw new Error(error.message || "Failed to add expense")
  }
}

export async function updateExpense(
  expenseId: string,
  expenseData: Partial<Omit<Expense, "id" | "userId" | "userName" | "createdAt">>,
  userId: string,
  userName: string,
) {
  try {
    const expenseRef = doc(db, "expenses", expenseId)
    await updateDoc(expenseRef, expenseData)

    await logActivity("UPDATE_EXPENSE", `Updated expense: ${expenseData.name}`, userId, userName)

    return expenseId
  } catch (error: any) {
    console.error("Error updating expense:", error)
    throw new Error(error.message || "Failed to update expense")
  }
}

export async function deleteExpense(expenseId: string, userId: string, userName: string, expenseName: string) {
  try {
    await deleteDoc(doc(db, "expenses", expenseId))

    await logActivity("DELETE_EXPENSE", `Deleted expense: ${expenseName}`, userId, userName)

    return true
  } catch (error: any) {
    console.error("Error deleting expense:", error)
    throw new Error(error.message || "Failed to delete expense")
  }
}

export async function getExpenses(): Promise<Expense[]> {
  try {
    const snapshot = await getDocs(collection(db, "expenses"))
    return snapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0)) as Expense[]
  } catch (error: any) {
    console.error("Error fetching expenses:", error)
    throw new Error(error.message || "Failed to fetch expenses")
  }
}

export async function getExpensesByDateRange(startDate: Date, endDate: Date): Promise<Expense[]> {
  try {
    const expenses = await getExpenses()
    return expenses.filter((expense) => {
      const expenseDate = expense.date?.toDate?.() || new Date()
      return expenseDate >= startDate && expenseDate <= endDate
    })
  } catch (error: any) {
    console.error("Error fetching expenses by date range:", error)
    throw new Error(error.message || "Failed to fetch expenses")
  }
}

export async function getTotalExpensesByCategory(): Promise<Record<string, number>> {
  try {
    const expenses = await getExpenses()
    return expenses.reduce(
      (acc, expense) => {
        acc[expense.category] = (acc[expense.category] || 0) + expense.amount
        return acc
      },
      {} as Record<string, number>,
    )
  } catch (error: any) {
    console.error("Error calculating expenses by category:", error)
    throw new Error(error.message || "Failed to calculate expenses")
  }
}

export async function getTotalExpenses(): Promise<number> {
  try {
    const expenses = await getExpenses()
    return expenses.reduce((sum, expense) => sum + expense.amount, 0)
  } catch (error: any) {
    console.error("Error calculating total expenses:", error)
    throw new Error(error.message || "Failed to calculate total")
  }
}
