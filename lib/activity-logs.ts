import { db, auth } from "./firebase"
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  orderBy,
  getDocs,
  type QueryConstraint,
} from "firebase/firestore"

export type ActivityAction =
  | "ITEM_ADDED"
  | "ITEM_UPDATED"
  | "ITEM_DELETED"
  | "SALE_COMPLETED"
  | "USER_LOGIN"
  | "USER_LOGOUT"

export interface ActivityLog {
  id: string
  userId: string
  userName: string
  action: ActivityAction
  details: string
  metadata?: {
    itemId?: string
    saleId?: string
    changes?: string
  }
  timestamp: any
}

export async function logActivity(action: ActivityAction, details: string, metadata?: ActivityLog["metadata"]) {
  try {
    const user = auth.currentUser
    if (!user) return

    await addDoc(collection(db, "activityLogs"), {
      userId: user.uid,
      userName: user.displayName || user.email || "Unknown",
      action,
      details,
      metadata,
      timestamp: serverTimestamp(),
    })
  } catch (error) {
    console.error("Error logging activity:", error)
  }
}

export async function getActivityLogs(filters?: {
  userId?: string
  action?: ActivityAction
  startDate?: Date
  endDate?: Date
}): Promise<ActivityLog[]> {
  try {
    const constraints: QueryConstraint[] = [orderBy("timestamp", "desc")]

    if (filters?.userId) {
      constraints.splice(0, 0, where("userId", "==", filters.userId))
    }
    if (filters?.action) {
      constraints.splice(0, 0, where("action", "==", filters.action))
    }

    const q = query(collection(db, "activityLogs"), ...constraints)
    const docs = await getDocs(q)
    return docs.docs.map(
      (doc) =>
        ({
          id: doc.id,
          ...doc.data(),
        }) as ActivityLog,
    )
  } catch (error) {
    console.error("Error fetching activity logs:", error)
    return []
  }
}
