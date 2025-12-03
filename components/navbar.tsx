"use client"

import { useRouter } from "next/navigation"
import { auth } from "@/lib/firebase"
import { signOut } from "firebase/auth"
import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export function Navbar() {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)

  const handleLogout = async () => {
    try {
      await signOut(auth)
      router.push("/login")
    } catch (error) {
      console.error("Error logging out:", error)
    }
  }

  return (
    <nav className="bg-card border-b border-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold">I</span>
            </div>
            <span className="text-xl font-bold text-foreground hidden sm:inline">Inventory</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex gap-1">
            <Link href="/">
              <Button variant="ghost" size="sm">
                Dashboard
              </Button>
            </Link>
            <Link href="/items">
              <Button variant="ghost" size="sm">
                Items
              </Button>
            </Link>
            <Link href="/sales">
              <Button variant="ghost" size="sm">
                Sales
              </Button>
            </Link>
            <Link href="/expenses">
              <Button variant="ghost" size="sm">
                Expenses
              </Button>
            </Link>
            <Link href="/reports">
              <Button variant="ghost" size="sm">
                Reports
              </Button>
            </Link>
            <Link href="/logs">
              <Button variant="ghost" size="sm">
                Activity
              </Button>
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center gap-2 md:hidden">
            <button onClick={() => setIsOpen(!isOpen)} className="p-2 text-foreground hover:bg-muted rounded-lg">
              <span className="sr-only">Menu</span>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>

          {/* Logout button */}
          <Button onClick={handleLogout} variant="outline" size="sm" className="hidden sm:inline-flex bg-transparent">
            Logout
          </Button>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden pb-4 space-y-2">
            <Link href="/">
              <Button variant="ghost" size="sm" className="w-full justify-start">
                Dashboard
              </Button>
            </Link>
            <Link href="/items">
              <Button variant="ghost" size="sm" className="w-full justify-start">
                Items
              </Button>
            </Link>
            <Link href="/sales">
              <Button variant="ghost" size="sm" className="w-full justify-start">
                Sales
              </Button>
            </Link>
            <Link href="/expenses">
              <Button variant="ghost" size="sm" className="w-full justify-start">
                Expenses
              </Button>
            </Link>
            <Link href="/reports">
              <Button variant="ghost" size="sm" className="w-full justify-start">
                Reports
              </Button>
            </Link>
            <Link href="/logs">
              <Button variant="ghost" size="sm" className="w-full justify-start">
                Activity
              </Button>
            </Link>
            <Button onClick={handleLogout} variant="outline" size="sm" className="w-full justify-start bg-transparent">
              Logout
            </Button>
          </div>
        )}
      </div>
    </nav>
  )
}
