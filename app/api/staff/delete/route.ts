import { NextResponse } from "next/server"
import { ApiError, requireStaffOwner } from "@/lib/firebase-admin"

export const runtime = "nodejs"

// Admin deletes a staff login. Their sales and expenses stay in the admin's records.
export async function POST(request: Request) {
  try {
    const { staffId } = await request.json()
    const { adminAuth, db, staff } = await requireStaffOwner(request, staffId)

    // Stock still with the staff member must be taken back first, or it would be lost
    const stockSnap = await db.collection("staffStock").where("staffId", "==", staffId).get()
    const boxesLeft = stockSnap.docs.reduce((sum, d) => sum + (d.data().quantity || 0), 0)
    if (boxesLeft > 0) {
      throw new ApiError(`${staff.name} still has ${boxesLeft} boxes. Take back their stock before deleting.`, 400)
    }

    try {
      await adminAuth.deleteUser(staffId)
    } catch (error: any) {
      if (error?.code !== "auth/user-not-found") throw error
    }
    const batch = db.batch()
    stockSnap.docs.forEach((d) => batch.delete(d.ref))
    batch.delete(db.collection("users").doc(staffId))
    await batch.commit()

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error("Error deleting staff:", error)
    return NextResponse.json(
      { error: error?.message || "Failed to delete staff" },
      { status: error instanceof ApiError ? error.status : 500 },
    )
  }
}
