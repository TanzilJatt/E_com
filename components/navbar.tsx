"use client"

import { useRouter, usePathname } from "next/navigation"
import { auth } from "@/lib/firebase"
import { signOut, onAuthStateChanged } from "firebase/auth"
import { useState, useEffect } from "react"
import Link from "next/link"
import { useCurrentUser } from "@/components/auth-guard"
import {
  Home,
  Package,
  ShoppingCart,
  Wallet,
  PieChart,
  UserCog,
  Users,
  BookOpen,
  LogOut,
  Boxes,
  Menu,
  X,
  ShieldCheck,
  NotebookTabs,
  type LucideIcon,
} from "lucide-react"

// staff: also shown to staff; staffOnly: shown to staff only
const NAV_LINKS: {
  href: string
  label: string
  icon: LucideIcon
  staff?: boolean
  staffOnly?: boolean
  staffLabel?: string
}[] = [
  { href: "/", label: "Dashboard", icon: Home, staff: true },
  { href: "/my-inventory", label: "My Inventory", icon: Package, staffOnly: true },
  { href: "/items", label: "Items", icon: Package },
  { href: "/sales", label: "Sales", icon: ShoppingCart, staff: true },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/ledger", label: "Ledger", icon: BookOpen },
  { href: "/expenses", label: "Expenses", icon: Wallet },
  { href: "/reports", label: "Reports", icon: PieChart },
  { href: "/staff-ledger", label: "Staff Ledger", icon: NotebookTabs, staff: true, staffLabel: "My Ledger" },
  { href: "/users", label: "Users", icon: ShieldCheck },
]

const SIDEBAR_BG = "bg-[#0d3a4a]"
const ITEM_BASE =
  "w-full flex items-center gap-3 px-4 py-2.5 rounded-md text-[15px] font-medium transition-colors"
const ITEM_IDLE = "text-white hover:bg-white/5 hover:text-[#29b6f6]"
const ITEM_ACTIVE = "bg-[#164c5e] text-[#29b6f6]"

export function Navbar() {
  const router = useRouter()
  const pathname = usePathname()
  const { isStaff } = useCurrentUser()
  const navLinks = NAV_LINKS.filter((link) => (isStaff ? link.staff || link.staffOnly : !link.staffOnly))
  const [isOpen, setIsOpen] = useState(false)
  const [userName, setUserName] = useState<string>("")
  const [userInitial, setUserInitial] = useState<string>("U")

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // Get user's display name from either email/password signup or Google Sign-In
        const name = user.displayName || user.email?.split("@")[0] || "User"
        setUserName(name)
        setUserInitial(name.charAt(0).toUpperCase())
      }
    })

    return () => unsubscribe()
  }, [])

  // Close mobile menu when route changes
  useEffect(() => {
    setIsOpen(false)
  }, [pathname])

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "unset"
    return () => {
      document.body.style.overflow = "unset"
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
      await signOut(auth)
      router.push("/login")
    } catch (error) {
      console.error("Error logging out:", error)
    }
  }

  const logo = (
    <Link href="/" className="flex flex-col items-center gap-1">
      <div className="w-11 h-11 rounded-xl bg-[#29b6f6]/15 flex items-center justify-center">
        <Boxes className="w-6 h-6 text-[#29b6f6]" />
      </div>
      <span className="text-[11px] font-semibold tracking-widest uppercase text-[#29b6f6]">Inventory</span>
    </Link>
  )

  const menu = (
    <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-1.5">
      {navLinks.map(({ href, label, staffLabel, icon: Icon }) => (
        <Link key={href} href={href} className={`${ITEM_BASE} ${isActive(href) ? ITEM_ACTIVE : ITEM_IDLE}`}>
          <Icon className="w-[18px] h-[18px] shrink-0" strokeWidth={2} />
          {isStaff && staffLabel ? staffLabel : label}
        </Link>
      ))}
      <Link
        href="/profile"
        className={`${ITEM_BASE} ${isActive("/profile") ? ITEM_ACTIVE : ITEM_IDLE}`}
      >
        <UserCog className="w-[18px] h-[18px] shrink-0" strokeWidth={2} />
        Profile
      </Link>
      <button onClick={handleLogout} className={`${ITEM_BASE} ${ITEM_IDLE}`}>
        <LogOut className="w-[18px] h-[18px] shrink-0" strokeWidth={2} />
        Logout
      </button>
    </nav>
  )

  const userCard = (
    <div className="flex items-center gap-3 px-4 py-3 border-t border-white/10 shrink-0">
      <div className="w-9 h-9 bg-[#29b6f6] rounded-full flex items-center justify-center shrink-0">
        <span className="text-white font-semibold text-sm">{userInitial}</span>
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-white truncate">{userName}</p>
        <p className="text-xs text-white/50 truncate">
          {isStaff ? "Staff · " : ""}
          {auth.currentUser?.email}
        </p>
      </div>
    </div>
  )

  return (
    <>
      {/* Backdrop overlay when mobile menu is open */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setIsOpen(false)} />
      )}

      {/* Mobile top bar */}
      <nav className={`${SIDEBAR_BG} sticky top-0 z-50 md:hidden`}>
        <div className="flex justify-between items-center h-16 px-4">
          <Link href="/" className="flex items-center gap-2">
            <Boxes className="w-6 h-6 text-[#29b6f6]" />
            <span className="text-lg font-semibold text-white">Inventory</span>
          </Link>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 text-white hover:bg-white/10 rounded-lg transition-colors"
            aria-label={isOpen ? "Close menu" : "Open menu"}
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </nav>

      {/* Mobile drawer */}
      <aside
        className={`
          ${SIDEBAR_BG} fixed top-16 left-0 w-64 h-[calc(100vh-4rem)] flex flex-col z-50 md:hidden
          transform transition-transform duration-300 ease-in-out shadow-2xl
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {menu}
        {userCard}
      </aside>

      {/* Desktop sidebar */}
      <aside className={`${SIDEBAR_BG} hidden md:flex md:flex-col fixed left-0 top-0 h-screen w-64 z-40`}>
        <div className="flex items-center justify-center h-24 border-b border-white/10 shrink-0">{logo}</div>
        {menu}
        {userCard}
      </aside>
    </>
  )
}
