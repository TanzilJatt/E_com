"use client"

import { useRouter, usePathname } from "next/navigation"
import { auth } from "@/lib/firebase"
import { signOut, onAuthStateChanged } from "firebase/auth"
import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export function Navbar() {
  const router = useRouter()
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false)
  const [userName, setUserName] = useState<string>("")
  const [userInitial, setUserInitial] = useState<string>("U")
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // Get user's display name from either email/password signup or Google Sign-In
        const name = user.displayName || user.email?.split("@")[0] || "User"
        setUserName(name)
        
        // Get first letter of name for the profile icon
        const initial = name.charAt(0).toUpperCase()
        setUserInitial(initial)
      }
    })

    return () => unsubscribe()
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProfileDropdownOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Close mobile menu when route changes
  useEffect(() => {
    setIsOpen(false)
  }, [pathname])

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  const isActive = (path: string) => {
    if (path === "/") {
      return pathname === "/"
    }
    return pathname?.startsWith(path)
  }

  const handleLogout = async () => {
    try {
      setIsProfileDropdownOpen(false)
      await signOut(auth)
      router.push("/login")
    } catch (error) {
      console.error("Error logging out:", error)
    }
  }

  const handleEditProfile = () => {
    setIsProfileDropdownOpen(false)
    router.push("/profile")
  }

  return (
    <>
      {/* Backdrop overlay when mobile menu is open */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity duration-300 ease-in-out"
          onClick={() => setIsOpen(false)}
          style={{ opacity: isOpen ? 1 : 0 }}
        />
      )}
      
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
            <Link href="/purchase">
              <Button 
                variant={isActive("/purchase") ? "secondary" : "ghost"} 
                size="sm"
                className={isActive("/purchase") ? "bg-primary text-primary-foreground hover:bg-primary/90" : ""}
              >
                Purchase
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
            {/* <Link href="/logs">
              <Button 
                variant={isActive("/logs") ? "secondary" : "ghost"} 
                size="sm"
                className={isActive("/logs") ? "bg-primary text-primary-foreground hover:bg-primary/90" : ""}
              >
                Activity
              </Button>
            </Link> */}
          </div>

          {/* Desktop Profile Section */}
          <div className="hidden md:flex items-center relative" ref={dropdownRef}>
            {/* Profile Button - Clickable */}
            <button
              onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted transition-colors"
            >
              <div className="w-9 h-9 bg-primary rounded-full flex items-center justify-center">
                <span className="text-primary-foreground font-semibold text-sm">{userInitial}</span>
              </div>
              <span className="text-sm font-medium text-foreground hidden lg:inline">{userName}</span>
              {/* Dropdown Arrow */}
              <svg
                className={`w-4 h-4 text-muted-foreground transition-transform ${isProfileDropdownOpen ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Dropdown Menu */}
            {isProfileDropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-card border border-border rounded-lg shadow-lg py-2 z-50">
                {/* User Info Header */}
                <div className="px-4 py-3 border-b border-border">
                  <p className="text-sm font-semibold text-foreground">{userName}</p>
                  <p className="text-xs text-muted-foreground truncate">{auth.currentUser?.email}</p>
                </div>

                {/* Menu Items */}
                <div className="py-1">
                  <button
                    onClick={handleEditProfile}
                    className="w-full px-4 py-2 text-left text-sm text-foreground hover:bg-muted transition-colors flex items-center gap-3"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Edit Profile
                  </button>

                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-muted transition-colors flex items-center gap-3"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center gap-2 md:hidden">
            <button 
              onClick={() => setIsOpen(!isOpen)} 
              className="p-2 text-foreground hover:bg-muted rounded-lg transition-colors relative z-50"
              aria-label="Toggle menu"
            >
              <span className="sr-only">{isOpen ? "Close menu" : "Open menu"}</span>
              <div className="w-6 h-6 flex flex-col justify-center items-center">
                {/* Animated hamburger icon */}
                <span 
                  className={`block w-6 h-0.5 bg-current transition-all duration-300 ease-in-out ${
                    isOpen ? "rotate-45 translate-y-0.5" : "-translate-y-1.5"
                  }`}
                />
                <span 
                  className={`block w-6 h-0.5 bg-current transition-all duration-300 ease-in-out my-1 ${
                    isOpen ? "opacity-0" : "opacity-100"
                  }`}
                />
                <span 
                  className={`block w-6 h-0.5 bg-current transition-all duration-300 ease-in-out ${
                    isOpen ? "-rotate-45 -translate-y-0.5" : "translate-y-1.5"
                  }`}
                />
              </div>
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div 
          className={`
            fixed top-16 right-0 w-72 h-[calc(100vh-4rem)] bg-card border-l border-border
            md:hidden overflow-y-auto shadow-2xl z-50
            transform transition-transform duration-300 ease-in-out
            ${isOpen ? "translate-x-0" : "translate-x-full"}
          `}
        >
          <div className="p-4 space-y-2">
            {/* Mobile Profile Section */}
            <div className="flex items-center gap-3 px-3 py-3 bg-muted/50 rounded-lg mb-2">
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                <span className="text-primary-foreground font-semibold">{userInitial}</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">{userName}</p>
                <p className="text-xs text-muted-foreground truncate">{auth.currentUser?.email}</p>
              </div>
            </div>
            
            <Link href="/" onClick={() => setIsOpen(false)}>
              <Button 
                variant={isActive("/") ? "secondary" : "ghost"} 
                size="sm" 
                className={`w-full justify-start ${isActive("/") ? "bg-primary text-primary-foreground hover:bg-primary/90" : ""}`}
              >
                Dashboard
              </Button>
            </Link>
            <Link href="/items" onClick={() => setIsOpen(false)}>
              <Button 
                variant={isActive("/items") ? "secondary" : "ghost"} 
                size="sm" 
                className={`w-full justify-start ${isActive("/items") ? "bg-primary text-primary-foreground hover:bg-primary/90" : ""}`}
              >
                Items
              </Button>
            </Link>
            <Link href="/sales" onClick={() => setIsOpen(false)}>
              <Button 
                variant={isActive("/sales") ? "secondary" : "ghost"} 
                size="sm" 
                className={`w-full justify-start ${isActive("/sales") ? "bg-primary text-primary-foreground hover:bg-primary/90" : ""}`}
              >
                Sales
              </Button>
            </Link>
            <Link href="/purchase" onClick={() => setIsOpen(false)}>
              <Button 
                variant={isActive("/purchase") ? "secondary" : "ghost"} 
                size="sm" 
                className={`w-full justify-start ${isActive("/purchase") ? "bg-primary text-primary-foreground hover:bg-primary/90" : ""}`}
              >
                Purchase
              </Button>
            </Link>
            <Link href="/expenses" onClick={() => setIsOpen(false)}>
              <Button 
                variant={isActive("/expenses") ? "secondary" : "ghost"} 
                size="sm" 
                className={`w-full justify-start ${isActive("/expenses") ? "bg-primary text-primary-foreground hover:bg-primary/90" : ""}`}
              >
                Expenses
              </Button>
            </Link>
            <Link href="/reports" onClick={() => setIsOpen(false)}>
              <Button 
                variant={isActive("/reports") ? "secondary" : "ghost"} 
                size="sm" 
                className={`w-full justify-start ${isActive("/reports") ? "bg-primary text-primary-foreground hover:bg-primary/90" : ""}`}
              >
                Reports
              </Button>
            </Link>
            {/* <Link href="/logs">
              <Button 
                variant={isActive("/logs") ? "secondary" : "ghost"} 
                size="sm" 
                className={`w-full justify-start ${isActive("/logs") ? "bg-primary text-primary-foreground hover:bg-primary/90" : ""}`}
              >
                Activity
              </Button>
            </Link> */}
            
            {/* Profile Actions */}
            <div className="border-t border-border pt-2 mt-2 space-y-2">
              <Link href="/profile" onClick={() => setIsOpen(false)}>
                <Button variant="ghost" size="sm" className="w-full justify-start">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Edit Profile
                </Button>
              </Link>
              <Button onClick={handleLogout} variant="outline" size="sm" className="w-full justify-start bg-transparent text-red-600 dark:text-red-400 border-red-200 dark:border-red-900">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>
    </nav>
    </>
  )
}
