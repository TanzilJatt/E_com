import { db, auth, firebaseConfig } from "./firebase"
import { initializeApp, getApps } from "firebase/app"
import { getAuth, createUserWithEmailAndPassword, updateProfile, signOut, type User } from "firebase/auth"
import { collection, doc, getDoc, getDocs, query, setDoc, updateDoc, where, serverTimestamp } from "firebase/firestore"

export type UserRole = "admin" | "staff"

// One profile per login. Admins own their data (adminId = their own uid);
// staff work inside their admin's data (adminId = the admin's uid).
export interface UserProfile {
  id: string
  name: string
  email: string
  role: UserRole
  adminId: string
  active: boolean
  createdAt?: any
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  if (!db) return null
  const snap = await getDoc(doc(db, "users", uid))
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as UserProfile) : null
}

// Load the signed-in user's profile, creating an admin profile for accounts that don't have one yet
export async function ensureUserProfile(user: User): Promise<UserProfile> {
  const existing = await getUserProfile(user.uid)
  if (existing) return existing

  const profile = {
    name: user.displayName || user.email?.split("@")[0] || "User",
    email: user.email || "",
    role: "admin" as const,
    adminId: user.uid,
    active: true,
  }
  await setDoc(doc(db, "users", user.uid), { ...profile, createdAt: serverTimestamp() })
  return { id: user.uid, ...profile }
}

export async function getStaffMembers(adminId: string): Promise<UserProfile[]> {
  if (!db) return []
  const snapshot = await getDocs(query(collection(db, "users"), where("adminId", "==", adminId)))
  return snapshot.docs
    .map((d) => ({ id: d.id, ...d.data() }) as UserProfile)
    .filter((u) => u.role === "staff")
    .sort((a, b) => a.name.localeCompare(b.name))
}

// Separate Firebase app so creating the staff login doesn't sign the admin out
function getStaffCreatorAuth() {
  const app = getApps().find((a) => a.name === "staff-creator") || initializeApp(firebaseConfig, "staff-creator")
  return getAuth(app)
}

export async function createStaffAccount(
  data: { name: string; email: string; password: string },
  adminId: string,
): Promise<string> {
  if (!db) {
    throw new Error("Database is not available. Please check your Firebase configuration and restart the dev server.")
  }
  const name = data.name.trim()
  const email = data.email.trim().toLowerCase()
  if (!name) throw new Error("Name is required")
  if (data.password.length < 6) throw new Error("Password must be at least 6 characters")

  const creatorAuth = getStaffCreatorAuth()
  let credential
  try {
    credential = await createUserWithEmailAndPassword(creatorAuth, email, data.password)
  } catch (error: any) {
    if (error?.code === "auth/email-already-in-use") throw new Error("This email already has an account")
    if (error?.code === "auth/invalid-email") throw new Error("Invalid email address")
    if (error?.code === "auth/weak-password") throw new Error("Password is too weak")
    throw error
  }

  try {
    await updateProfile(credential.user, { displayName: name })
    await setDoc(doc(db, "users", credential.user.uid), {
      name,
      email,
      role: "staff",
      adminId,
      active: true,
      createdAt: serverTimestamp(),
    })
  } catch (error) {
    // Without a staff profile the login would become an admin account, so remove it
    await credential.user.delete().catch(() => {})
    if ((error as any)?.code === "permission-denied") {
      throw new Error(
        "Firestore rules don't allow creating staff yet. Publish firestore.rules in Firebase Console → Firestore → Rules, then log out and back in.",
      )
    }
    throw error
  } finally {
    await signOut(creatorAuth).catch(() => {})
  }
  return credential.user.uid
}

// Staff actions that need the server (it checks the admin owns this staff member)
async function callStaffApi(path: string, body: Record<string, unknown>, fallbackError: string): Promise<void> {
  const token = await auth?.currentUser?.getIdToken()
  if (!token) throw new Error("Please log in again")
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  const result = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(result.error || fallbackError)
}

export async function setStaffPassword(staffId: string, password: string): Promise<void> {
  await callStaffApi("/api/staff/password", { staffId, password }, "Failed to reset password")
}

// Removes the staff login; their sales and expenses stay in the records
export async function deleteStaffAccount(staffId: string): Promise<void> {
  await callStaffApi("/api/staff/delete", { staffId }, "Failed to delete staff")
}

export async function updateStaffName(staffId: string, name: string): Promise<void> {
  const trimmed = name.trim()
  if (!trimmed) throw new Error("Name is required")
  await updateDoc(doc(db, "users", staffId), { name: trimmed })
}

export async function setStaffActive(staffId: string, active: boolean): Promise<void> {
  await updateDoc(doc(db, "users", staffId), { active })
}
