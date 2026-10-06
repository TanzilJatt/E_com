"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { auth } from "@/lib/firebase"
import { onAuthStateChanged, signOut, type User } from "firebase/auth"
import { ensureUserProfile, type UserProfile } from "@/lib/users"
import { Button } from "@/components/ui/button"

interface CurrentUser {
  user: User | null
  profile: UserProfile | null
  isAdmin: boolean
  isStaff: boolean
  // Uid that owns the data being worked on: the admin's own uid, or a staff member's admin
  ownerId: string | null
}

const CurrentUserContext = createContext<CurrentUser>({
  user: null,
  profile: null,
  isAdmin: false,
  isStaff: false,
  ownerId: null,
})

export const useCurrentUser = () => useContext(CurrentUserContext)

// Pages staff can open; everything else is admin only
const STAFF_ROUTES = ["/sales", "/my-inventory", "/staff-ledger", "/profile"]
const isStaffRoute = (pathname: string) =>
  pathname === "/" || STAFF_ROUTES.some((r) => pathname === r || pathname.startsWith(`${r}/`))

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const router = useRouter()
  const pathname = usePathname()

  // Public routes that don't require authentication
  const publicRoutes = ["/login", "/verify-email"]
  const isPublicRoute = publicRoutes.includes(pathname || "")

  // Keep the signed-in user and their profile (role) loaded
  useEffect(() => {
    if (!auth) return
    return onAuthStateChanged(auth, async (nextUser) => {
      if (!nextUser) {
        setUser(null)
        setProfile(null)
        return
      }
      try {
        const nextProfile = await ensureUserProfile(nextUser)
        setProfile(nextProfile)
      } catch (error) {
        console.error("Error loading user profile:", error)
        setProfile(null)
      }
      setUser(nextUser)
    })
  }, [])

  useEffect(() => {
    // If on login page or verify email page, don't check auth
    if (isPublicRoute) {
      setIsLoading(false)
      setIsAuthenticated(true)
      return
    }

    if (!auth) {
      setIsLoading(false)
      setIsAuthenticated(false)
      router.push("/login")
      return
    }

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (!firebaseUser) {
        setIsAuthenticated(false)
        setIsLoading(false)
        router.push("/login")
      }
    })
    return () => unsubscribe()
  }, [router, isPublicRoute])

  // Route the signed-in user once their profile is known
  useEffect(() => {
    if (!user) return
    // Staff logins are created by their admin, so they skip email verification
    const verified = user.emailVerified || profile?.role === "staff"

    if (!verified && pathname !== "/verify-email") {
      setIsAuthenticated(false)
      setIsLoading(false)
      router.push("/verify-email")
    } else if (verified && (pathname === "/verify-email" || pathname === "/login")) {
      setIsAuthenticated(true)
      setIsLoading(false)
      router.push("/")
    } else if (verified && profile?.role === "staff" && !isStaffRoute(pathname || "")) {
      setIsAuthenticated(false)
      setIsLoading(false)
      router.push("/")
    } else {
      setIsAuthenticated(verified || isPublicRoute)
      setIsLoading(false)
    }
  }, [user, profile, pathname, router, isPublicRoute])

  const value: CurrentUser = {
    user,
    profile,
    isAdmin: !!profile && profile.role === "admin",
    isStaff: !!profile && profile.role === "staff",
    ownerId: profile?.adminId || user?.uid || null,
  }

  // Hold protected pages until the role is known, so staff never see an admin page (even for a moment)
  const blocked = !user || (profile?.role === "staff" && !isStaffRoute(pathname || ""))

  // Show loading only on protected routes
  if ((isLoading || !isAuthenticated || blocked) && !isPublicRoute) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!isPublicRoute && profile?.role === "staff" && !profile.active) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-6 text-center">
        <h1 className="text-xl font-semibold">Account disabled</h1>
        <p className="text-muted-foreground max-w-sm">Your account has been disabled. Please contact your admin.</p>
        <Button
          variant="outline"
          onClick={async () => {
            await signOut(auth)
            router.push("/login")
          }}
        >
          Log out
        </Button>
      </div>
    )
  }

  return <CurrentUserContext.Provider value={value}>{children}</CurrentUserContext.Provider>
}
