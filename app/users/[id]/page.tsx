"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ArrowLeft, MoreVertical, Pencil, Power, Trash2 } from "lucide-react"
import { useCurrentUser } from "@/components/auth-guard"
import {
  DeleteStaffDialog,
  EditStaffDialog,
  ResetPasswordDialog,
  TransferStockDialog,
  type TransferMode,
} from "@/components/staff-dialogs"
import { getUserProfile, setStaffActive, type UserProfile } from "@/lib/users"
import { getItems, type Item } from "@/lib/items"
import { getStaffStock, type StaffStock } from "@/lib/staff-stock"
import { getStaffSales, type Sale } from "@/lib/sales"
import {
  buildStaffLedger,
  getStaffExpenses,
  getStaffPayments,
  getStockTransfers,
  type StaffLedgerEntry,
} from "@/lib/staff-ledger"
import { toast } from "sonner"

const rs = (value: number) => `RS ${value.toFixed(2)}`
const toDate = (value: any): Date => (value?.toDate ? value.toDate() : new Date(value))

const ENTRY_STYLES: Record<StaffLedgerEntry["kind"], string> = {
  stock: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300",
  sale: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  expense: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  handover: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
}

export default function StaffDetailPage() {
  const { id: staffId } = useParams<{ id: string }>()
  const router = useRouter()
  const { ownerId } = useCurrentUser()
  const [member, setMember] = useState<UserProfile | null>(null)
  const [items, setItems] = useState<Item[]>([])
  const [stock, setStock] = useState<StaffStock[]>([])
  const [sales, setSales] = useState<Sale[]>([])
  const [ledger, setLedger] = useState<StaffLedgerEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const [transfer, setTransfer] = useState<{ staff: UserProfile; mode: TransferMode } | null>(null)
  const [resetting, setResetting] = useState<UserProfile | null>(null)
  const [editing, setEditing] = useState<UserProfile | null>(null)
  const [deleting, setDeleting] = useState<UserProfile | null>(null)

  const fetchData = async () => {
    if (!ownerId || !staffId) return
    try {
      const profile = await getUserProfile(staffId)
      if (!profile || profile.role !== "staff" || profile.adminId !== ownerId) {
        setNotFound(true)
        return
      }
      const [itemList, stockList, transfers, saleList, expenses, payments] = await Promise.all([
        getItems(ownerId),
        getStaffStock({ adminId: ownerId }),
        getStockTransfers(staffId, ownerId),
        getStaffSales(staffId),
        getStaffExpenses(staffId),
        getStaffPayments(staffId, ownerId),
      ])
      setMember(profile)
      setItems(itemList)
      setStock(stockList.filter((s) => s.staffId === staffId))
      setSales(saleList)
      setLedger(buildStaffLedger(transfers, saleList, expenses, payments))
    } catch (error: any) {
      console.error("Error loading staff member:", error)
      toast.error(error.message || "Failed to load staff member")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [ownerId, staffId])

  const stats = useMemo(() => {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthSales = sales.filter((s) => toDate(s.transactionDate || s.createdAt) >= startOfMonth)
    return {
      boxesInHand: stock.reduce((sum, s) => sum + Math.max(s.quantity, 0), 0),
      cashInHand: ledger[ledger.length - 1]?.cashBalance || 0,
      monthTotal: monthSales.reduce((sum, s) => sum + (s.totalAmount || 0), 0),
      monthCount: monthSales.length,
      allTotal: sales.reduce((sum, s) => sum + (s.totalAmount || 0), 0),
    }
  }, [stock, ledger, sales])

  const stockInHand = stock.filter((s) => s.quantity > 0).sort((a, b) => a.itemName.localeCompare(b.itemName))
  const recentActivity = [...ledger].reverse().slice(0, 10)

  const handleToggleActive = async () => {
    if (!member) return
    try {
      await setStaffActive(member.id, !member.active)
      toast.success(`${member.name} ${member.active ? "disabled" : "enabled"}`)
      fetchData()
    } catch (error: any) {
      toast.error(error.message || "Failed to update staff")
    }
  }

  const page = (content: React.ReactNode) => (
    <>
      <Navbar />
      <div className="md:pl-64">
        <main className="w-full px-4 sm:px-6 lg:px-10 py-4 sm:py-8">
          <Link href="/users" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="w-4 h-4" />
            Users
          </Link>
          {content}
        </main>
      </div>
    </>
  )

  if (loading) {
    return page(
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>,
    )
  }

  if (notFound || !member) {
    return page(<Card className="p-8 text-center text-muted-foreground">Staff member not found.</Card>)
  }

  return page(
    <>
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4 mb-6">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{member.name}</h1>
            <Badge variant="secondary">Staff</Badge>
            {member.active ? (
              <Badge className="bg-green-600 hover:bg-green-600">Active</Badge>
            ) : (
              <Badge variant="destructive">Disabled</Badge>
            )}
          </div>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">{member.email}</p>
          {member.createdAt && (
            <p className="text-xs text-muted-foreground mt-1">Added {toDate(member.createdAt).toLocaleDateString()}</p>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" onClick={() => setTransfer({ staff: member, mode: "send" })} disabled={!member.active}>
            Send Stock
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setTransfer({ staff: member, mode: "return" })}
            disabled={stockInHand.length === 0}
          >
            Take Back
          </Button>
          <Button size="sm" variant="outline" onClick={() => setResetting(member)}>
            Reset Password
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" className="h-8 w-8 p-0" aria-label="More actions">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onSelect={() => setEditing(member)}>
                <Pencil />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={handleToggleActive}>
                <Power />
                {member.active ? "Disable" : "Enable"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(member)}>
                <Trash2 />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <Card className="p-4">
          <div className="text-xs sm:text-sm font-medium text-muted-foreground">Stock in Hand</div>
          <div className="text-xl sm:text-2xl font-bold text-primary mt-1">{stats.boxesInHand} boxes</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs sm:text-sm font-medium text-muted-foreground">Cash in Hand</div>
          <div className={`text-xl sm:text-2xl font-bold mt-1 ${stats.cashInHand < 0 ? "text-red-600" : "text-green-600"}`}>
            {rs(stats.cashInHand)}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xs sm:text-sm font-medium text-muted-foreground">Sales This Month</div>
          <div className="text-xl sm:text-2xl font-bold mt-1">{rs(stats.monthTotal)}</div>
          <div className="text-xs text-muted-foreground mt-1">{stats.monthCount} sales</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs sm:text-sm font-medium text-muted-foreground">All-time Sales</div>
          <div className="text-xl sm:text-2xl font-bold mt-1">{rs(stats.allTotal)}</div>
          <div className="text-xs text-muted-foreground mt-1">{sales.length} sales</div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Stock */}
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-muted/50 border-b border-border">
            <h2 className="font-semibold">Stock in Hand</h2>
            <Link href={`/my-inventory?staff=${member.id}`} className="text-sm text-primary hover:underline">
              Inventory
            </Link>
          </div>
          {stockInHand.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">No stock assigned.</p>
          ) : (
            <ul className="divide-y divide-border">
              {stockInHand.map((s) => (
                <li key={s.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <span className="font-medium">{s.itemName}</span>
                  <span className="font-semibold">{s.quantity} boxes</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Recent activity */}
        <Card className="lg:col-span-2 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-muted/50 border-b border-border">
            <h2 className="font-semibold">Recent Activity</h2>
            <Link href={`/staff-ledger?staff=${member.id}`} className="text-sm text-primary hover:underline">
              Full ledger
            </Link>
          </div>
          {recentActivity.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">No activity yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {recentActivity.map((entry) => (
                <li key={entry.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                  <div className="min-w-0 flex items-center gap-2">
                    <span className={`shrink-0 px-2 py-0.5 rounded text-xs font-medium ${ENTRY_STYLES[entry.kind]}`}>
                      {entry.reference}
                    </span>
                    <span className="text-muted-foreground truncate">{entry.details}</span>
                  </div>
                  <div className="text-right whitespace-nowrap">
                    <div className="font-semibold">
                      {entry.cashIn
                        ? <span className="text-green-600">+{rs(entry.cashIn)}</span>
                        : entry.cashOut
                          ? <span className="text-red-600">−{rs(entry.cashOut)}</span>
                          : entry.credit
                            ? <span className="text-amber-600">{rs(entry.credit)} credit</span>
                            : entry.boxesIn
                              ? `+${entry.boxesIn} boxes`
                              : `−${entry.boxesOut} boxes`}
                    </div>
                    <div className="text-xs text-muted-foreground">{entry.date.toLocaleDateString()}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <TransferStockDialog
        transfer={transfer}
        items={items}
        staffStock={stock}
        onClose={() => setTransfer(null)}
        onDone={fetchData}
      />
      <ResetPasswordDialog staff={resetting} onClose={() => setResetting(null)} />
      <EditStaffDialog staff={editing} onClose={() => setEditing(null)} onSaved={fetchData} />
      <DeleteStaffDialog staff={deleting} onClose={() => setDeleting(null)} onDeleted={() => router.push("/users")} />
    </>,
  )
}
