import { NextResponse } from "next/server"
import { ApiError, requireStaffOwner } from "@/lib/firebase-admin"

export const runtime = "nodejs"

// Admin sets a new password for one of their staff members
export async function POST(request: Request) {
  try {
    const { staffId, password } = await request.json()
    if (typeof password !== "string" || password.length < 6) {
      throw new ApiError("Password must be at least 6 characters", 400)
    }
    const { adminAuth } = await requireStaffOwner(request, staffId)
    await adminAuth.updateUser(staffId, { password })
    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error("Error resetting staff password:", error)
    return NextResponse.json(
      { error: error?.message || "Failed to reset password" },
      { status: error instanceof ApiError ? error.status : 500 },
    )
  }
}
