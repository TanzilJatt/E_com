import { cert, getApps, initializeApp } from "firebase-admin/app"
import { getAuth } from "firebase-admin/auth"
import { getFirestore } from "firebase-admin/firestore"

// Server-side Firebase with full access, used only by API routes.
// Needs a service account key from Firebase Console → Project settings → Service accounts.
const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL
// .env files keep the key on one line with "\n" escapes
const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n")

export const isAdminConfigured = !!(projectId && clientEmail && privateKey)

function getAdminApp() {
  if (!isAdminConfigured) {
    throw new Error(
      "Password reset is not set up yet. Add FIREBASE_ADMIN_CLIENT_EMAIL and FIREBASE_ADMIN_PRIVATE_KEY to .env.local and restart the server.",
    )
  }
  return getApps()[0] || initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) })
}

export const getAdminAuth = () => getAuth(getAdminApp())
export const getAdminDb = () => getFirestore(getAdminApp())

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message)
  }
}

// Checks the request comes from the admin who owns this staff member
export async function requireStaffOwner(request: Request, staffId: unknown) {
  const token = request.headers.get("authorization")?.replace(/^Bearer /, "")
  if (!token) throw new ApiError("Please log in again", 401)
  if (typeof staffId !== "string" || !staffId) throw new ApiError("Staff member is required", 400)

  const adminAuth = getAdminAuth()
  const db = getAdminDb()
  let caller
  try {
    caller = await adminAuth.verifyIdToken(token)
  } catch {
    throw new ApiError("Your session expired. Please log in again.", 401)
  }

  const [staffSnap, callerSnap] = await Promise.all([
    db.collection("users").doc(staffId).get(),
    db.collection("users").doc(caller.uid).get(),
  ])
  const staff = staffSnap.data()
  if (!staff || staff.role !== "staff" || staff.adminId !== caller.uid) {
    throw new ApiError("You can only manage your own staff", 403)
  }
  if (callerSnap.exists && callerSnap.data()?.role !== "admin") {
    throw new ApiError("Only admins can manage staff", 403)
  }
  return { adminAuth, db, staff, adminId: caller.uid }
}
