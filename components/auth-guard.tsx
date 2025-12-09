"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { auth } from "@/lib/firebase"
import { onAuthStateChanged } from "firebase/auth"

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  // Public routes that don't require authentication
  const publicRoutes = ["/login"]
  const isPublicRoute = publicRoutes.includes(pathname || "")

  useEffect(() => {
    // If on login page, don't check auth
    if (isPublicRoute) {
      setIsLoading(false)
      return
    }

    if (!auth) {
      setIsLoading(false)
      router.push("/login")
      return
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user && !isPublicRoute) {
        router.push("/login")
      } else if (user && pathname === "/login") {
        // If logged in and on login page, redirect to dashboard
        router.push("/")
      }
      setIsLoading(false)
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

  return <>{children}</>
}
