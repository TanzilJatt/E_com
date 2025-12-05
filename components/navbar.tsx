"use client"

import { useRouter, usePathname } from "next/navigation"
import { auth } from "@/lib/firebase"
import { signOut } from "firebase/auth"
import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export function Navbar() {
  const router = useRouter()
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)

  const isActive = (path: string) => {
    if (path === "/") {
      return pathname === "/"
    }
    return pathname?.startsWith(path)
  }

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
              <Button 
                variant={isActive("/") ? "secondary" : "ghost"} 
                size="sm"
                className={isActive("/") ? "bg-primary text-primary-foreground hover:bg-primary/90" : ""}
              >
                Dashboard
              </Button>
            </Link>
            <Link href="/items">
              <Button 
                variant={isActive("/items") ? "secondary" : "ghost"} 
                size="sm"
                className={isActive("/items") ? "bg-primary text-primary-foreground hover:bg-primary/90" : ""}
              >
                Items
              </Button>
            </Link>
            <Link href="/sales">
              <Button 
                variant={isActive("/sales") ? "secondary" : "ghost"} 
                size="sm"
                className={isActive("/sales") ? "bg-primary text-primary-foreground hover:bg-primary/90" : ""}
              >
                Sales
              </Button>
            </Link>
            <Link href="/expenses">
              <Button 
                variant={isActive("/expenses") ? "secondary" : "ghost"} 
                size="sm"
                className={isActive("/expenses") ? "bg-primary text-primary-foreground hover:bg-primary/90" : ""}
              >
                Expenses
              </Button>
            </Link>
            <Link href="/reports">
              <Button 
                variant={isActive("/reports") ? "secondary" : "ghost"} 
                size="sm"
                className={isActive("/reports") ? "bg-primary text-primary-foreground hover:bg-primary/90" : ""}
              >
                Reports
              </Button>
            </Link>
            <Link href="/logs">
              <Button 
                variant={isActive("/logs") ? "secondary" : "ghost"} 
                size="sm"
                className={isActive("/logs") ? "bg-primary text-primary-foreground hover:bg-primary/90" : ""}
              >
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
              <Button 
                variant={isActive("/") ? "secondary" : "ghost"} 
                size="sm" 
                className={`w-full justify-start ${isActive("/") ? "bg-primary text-primary-foreground hover:bg-primary/90" : ""}`}
              >
                Dashboard
              </Button>
            </Link>
            <Link href="/items">
              <Button 
                variant={isActive("/items") ? "secondary" : "ghost"} 
                size="sm" 
                className={`w-full justify-start ${isActive("/items") ? "bg-primary text-primary-foreground hover:bg-primary/90" : ""}`}
              >
                Items
              </Button>
            </Link>
            <Link href="/sales">
              <Button 
                variant={isActive("/sales") ? "secondary" : "ghost"} 
                size="sm" 
                className={`w-full justify-start ${isActive("/sales") ? "bg-primary text-primary-foreground hover:bg-primary/90" : ""}`}
              >
                Sales
              </Button>
            </Link>
            <Link href="/expenses">
              <Button 
                variant={isActive("/expenses") ? "secondary" : "ghost"} 
                size="sm" 
                className={`w-full justify-start ${isActive("/expenses") ? "bg-primary text-primary-foreground hover:bg-primary/90" : ""}`}
              >
                Expenses
              </Button>
            </Link>
            <Link href="/reports">
              <Button 
                variant={isActive("/reports") ? "secondary" : "ghost"} 
                size="sm" 
                className={`w-full justify-start ${isActive("/reports") ? "bg-primary text-primary-foreground hover:bg-primary/90" : ""}`}
              >
                Reports
              </Button>
            </Link>
            <Link href="/logs">
              <Button 
                variant={isActive("/logs") ? "secondary" : "ghost"} 
                size="sm" 
                className={`w-full justify-start ${isActive("/logs") ? "bg-primary text-primary-foreground hover:bg-primary/90" : ""}`}
              >
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
