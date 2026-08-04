"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { auth } from "@/lib/firebase"
import { onAuthStateChanged } from "firebase/auth"

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  // Public routes that don't require authentication
  const publicRoutes = ["/login", "/verify-email"]
  const isPublicRoute = publicRoutes.includes(pathname || "")

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

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user && !isPublicRoute) {
        setIsAuthenticated(false)
        setIsLoading(false)
        router.push("/login")
      } else if (user && !user.emailVerified && pathname !== "/verify-email") {
        // If logged in but email not verified, redirect to verification page
        setIsAuthenticated(false)
        setIsLoading(false)
        router.push("/verify-email")
      } else if (user && user.emailVerified && pathname === "/verify-email") {
        // If email is verified and on verify page, redirect to dashboard
        setIsAuthenticated(true)
        setIsLoading(false)
        router.push("/")
      } else if (user && pathname === "/login") {
        // If logged in and on login page, redirect appropriately
        setIsLoading(false)
        if (user.emailVerified) {
          setIsAuthenticated(true)
          router.push("/")
        } else {
          setIsAuthenticated(false)
          router.push("/verify-email")
        }
      } else if (user && user.emailVerified) {
        // User is authenticated and verified
        setIsAuthenticated(true)
        setIsLoading(false)
      } else {
        setIsLoading(false)
        setIsAuthenticated(false)
      }
    })

    return () => unsubscribe()
  }, [router, pathname, isPublicRoute])

  // Show loading only on protected routes
  if (isLoading && !isPublicRoute) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  // Don't render children if not authenticated and not on public route
  if (!isAuthenticated && !isPublicRoute) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return <>{children}</>
}
