"use client"

import { Suspense, useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useCurrentUser } from "@/components/auth-guard"
import { getStaffMembers, type UserProfile } from "@/lib/users"
import { getStaffStock, type StaffStock } from "@/lib/staff-stock"
import { getStockTransfers, type StockTransfer } from "@/lib/staff-ledger"
import { getStaffSales, type Sale } from "@/lib/sales"
import { toast } from "sonner"

interface InventoryRow {
  itemId: string
  name: string
  received: number
  returned: number
  sold: number
  inHand: number
  lastReceived: Date | null
}

const toDate = (value: any): Date => (value?.toDate ? value.toDate() : new Date(value))

function MyInventoryContent() {
  const searchParams = useSearchParams()
  const { user, isStaff, ownerId } = useCurrentUser()
  const [staff, setStaff] = useState<UserProfile[]>([])
  const [staffId, setStaffId] = useState(searchParams.get("staff") || "")
  const [stock, setStock] = useState<StaffStock[]>([])
  const [transfers, setTransfers] = useState<StockTransfer[]>([])
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  // Staff see their own stock; admins can pick one of their staff
  useEffect(() => {
    if (!user || !ownerId) return
    if (isStaff) {
      setStaffId(user.uid)
      return
    }
    getStaffMembers(ownerId)
      .then((list) => {
        setStaff(list)
        setStaffId((current) => current || list[0]?.id || "")
        if (list.length === 0) setLoading(false)
      })
      .catch((err) => toast.error(err.message || "Failed to load staff"))
  }, [user, ownerId, isStaff])

  useEffect(() => {
    if (!staffId) return
    const adminId = isStaff ? undefined : ownerId || undefined
    setLoading(true)
    Promise.all([
      // Admins can only list stock by their own id, so filter to this staff member afterwards
      isStaff ? getStaffStock({ staffId }) : getStaffStock({ adminId: adminId! }),
      getStockTransfers(staffId, adminId),
      getStaffSales(staffId),
    ])
      .then(([stockList, transferList, saleList]) => {
        setStock(stockList.filter((s) => s.staffId === staffId))
        setTransfers(transferList)
        setSales(saleList)
      })
      .catch((err) => {
        console.error("Error loading inventory:", err)
        toast.error(err.message || "Failed to load inventory")
      })
      .finally(() => setLoading(false))
  }, [staffId])

  const rows = useMemo(() => {
    const byItem: Record<string, InventoryRow> = {}
    const row = (itemId: string, name: string) =>
      (byItem[itemId] ||= { itemId, name, received: 0, returned: 0, sold: 0, inHand: 0, lastReceived: null })

    for (const t of transfers) {
      const r = row(t.itemId, t.itemName)
      if (t.quantity > 0) {
        r.received += t.quantity
        const date = toDate(t.createdAt)
        if (!r.lastReceived || date > r.lastReceived) r.lastReceived = date
      } else {
        r.returned -= t.quantity
      }
    }
    for (const sale of sales) {
      for (const item of sale.items) row(item.itemId, item.itemName).sold += item.quantity
    }
    // Current stock is the source of truth for what is in hand
    for (const s of stock) row(s.itemId, s.itemName).inHand = s.quantity

    return Object.values(byItem).sort((a, b) => a.name.localeCompare(b.name))
  }, [stock, transfers, sales])

  const filteredRows = rows.filter((r) => r.name.toLowerCase().includes(searchTerm.toLowerCase()))
  const totalInHand = rows.reduce((sum, r) => sum + r.inHand, 0)
  const totalReceived = rows.reduce((sum, r) => sum + r.received, 0)
  const totalSold = rows.reduce((sum, r) => sum + r.sold, 0)
  const itemsInStock = rows.filter((r) => r.inHand > 0).length

  const selectClass =
    "h-9 border border-border/60 hover:border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-md px-2 text-sm bg-background text-foreground transition-colors outline-none max-w-[200px]"

  return (
    <>
      <Navbar />
      <div className="md:pl-64">
        <main className="w-full px-4 sm:px-6 lg:px-10 py-4 sm:py-8">
          <div className="mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{isStaff ? "My Inventory" : "Staff Inventory"}</h1>
            <p className="text-muted-foreground mt-1 sm:mt-2 text-sm sm:text-base">
              Items assigned by the admin and how many boxes are left to sell
            </p>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
            <Card className="p-4">
              <div className="text-xs sm:text-sm font-medium text-muted-foreground">Items in Stock</div>
              <div className="text-2xl font-bold text-primary mt-1">{itemsInStock}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs sm:text-sm font-medium text-muted-foreground">Boxes in Hand</div>
              <div className="text-2xl font-bold text-primary mt-1">{totalInHand}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs sm:text-sm font-medium text-muted-foreground">Boxes Received</div>
              <div className="text-2xl font-bold mt-1">{totalReceived}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs sm:text-sm font-medium text-muted-foreground">Boxes Sold</div>
              <div className="text-2xl font-bold text-green-600 mt-1">{totalSold}</div>
            </Card>
          </div>

          {/* Filters */}
          <div className="mb-4 flex items-center gap-2 flex-wrap">
            <Input
              type="text"
              placeholder="Search item..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-9 w-full sm:w-64 text-sm"
            />
            {!isStaff && (
              <select value={staffId} onChange={(e) => setStaffId(e.target.value)} className={selectClass}>
                {staff.length === 0 && <option value="">No staff yet</option>}
                {staff.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center min-h-[200px]">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : filteredRows.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">
              {rows.length === 0 ? "No items have been assigned yet." : "No items match your search."}
            </Card>
          ) : (
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead className="bg-muted/50">
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 font-semibold">Item</th>
                      <th className="text-right py-3 px-4 font-semibold">Received</th>
                      <th className="text-right py-3 px-4 font-semibold">Returned</th>
                      <th className="text-right py-3 px-4 font-semibold">Sold</th>
                      <th className="text-right py-3 px-4 font-semibold">In Hand</th>
                      <th className="text-left py-3 px-4 font-semibold">Last Received</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.map((r, index) => (
                      <tr
                        key={r.itemId}
                        className={`border-b border-border last:border-0 hover:bg-muted/30 ${
                          index % 2 === 0 ? "bg-background" : "bg-muted/10"
                        }`}
                      >
                        <td className="py-3 px-4 font-medium">{r.name}</td>
                        <td className="py-3 px-4 text-right">{r.received}</td>
                        <td className="py-3 px-4 text-right">{r.returned || "—"}</td>
                        <td className="py-3 px-4 text-right">{r.sold || "—"}</td>
                        <td className="py-3 px-4 text-right">
                          {r.inHand > 0 ? (
                            <span className="font-bold text-primary">{r.inHand}</span>
                          ) : (
                            <span className="text-xs font-medium px-2 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                              Out of stock
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">
                          {r.lastReceived ? r.lastReceived.toLocaleDateString() : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-muted/30 border-t-2 border-border">
                    <tr>
                      <td className="py-3 px-4 font-semibold">Total</td>
                      <td className="py-3 px-4 text-right font-semibold">
                        {filteredRows.reduce((sum, r) => sum + r.received, 0)}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold">
                        {filteredRows.reduce((sum, r) => sum + r.returned, 0) || "—"}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold">
                        {filteredRows.reduce((sum, r) => sum + r.sold, 0)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-primary">
                        {filteredRows.reduce((sum, r) => sum + r.inHand, 0)}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </Card>
          )}
        </main>
      </div>
    </>
  )
}

export default function MyInventory() {
  return (
    <Suspense>
      <MyInventoryContent />
    </Suspense>
  )
}
