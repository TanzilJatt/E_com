"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Navbar } from "@/components/navbar"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useCurrentUser } from "@/components/auth-guard"
import { AddExpenseDialog } from "@/components/add-expense-dialog"
import { getStaffSales, type Sale } from "@/lib/sales"
import { getStaffStock, type StaffStock } from "@/lib/staff-stock"
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
const LOW_STOCK = 5 // boxes

// Home page for staff: today's sales, cash in hand, stock and recent sales
export function StaffDashboard() {
  const { user, profile } = useCurrentUser()
  const [sales, setSales] = useState<Sale[]>([])
  const [stock, setStock] = useState<StaffStock[]>([])
  const [ledger, setLedger] = useState<StaffLedgerEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [isExpenseOpen, setIsExpenseOpen] = useState(false)

  const fetchData = async () => {
    if (!user) return
    try {
      const [saleList, stockList, transfers, expenses, payments] = await Promise.all([
        getStaffSales(user.uid),
        getStaffStock({ staffId: user.uid }),
        getStockTransfers(user.uid),
        getStaffExpenses(user.uid),
        getStaffPayments(user.uid),
      ])
      setSales(saleList)
      setStock(stockList)
      setLedger(buildStaffLedger(transfers, saleList, expenses, payments))
    } catch (err: any) {
      console.error("Error loading dashboard:", err)
      toast.error(err.message || "Failed to load dashboard")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [user])

  const stats = useMemo(() => {
    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const saleDate = (s: Sale) => toDate(s.transactionDate || s.createdAt)
    const todaySales = sales.filter((s) => saleDate(s) >= startOfToday)
    const monthSales = sales.filter((s) => saleDate(s) >= startOfMonth)
    const total = (list: Sale[]) => list.reduce((sum, s) => sum + (s.totalAmount || 0), 0)
    return {
      todayTotal: total(todaySales),
      todayCount: todaySales.length,
      todayCash: todaySales.reduce((sum, s) => sum + (s.paymentMethod?.cash ? s.paymentMethod.cashAmount || 0 : 0), 0),
      monthTotal: total(monthSales),
      monthCount: monthSales.length,
      cashInHand: ledger[ledger.length - 1]?.cashBalance || 0,
      boxesInHand: stock.reduce((sum, s) => sum + s.quantity, 0),
    }
  }, [sales, stock, ledger])

  const lowStock = stock.filter((s) => s.quantity <= LOW_STOCK).sort((a, b) => a.quantity - b.quantity)
  const recentSales = [...sales].sort((a, b) => toDate(b.transactionDate).getTime() - toDate(a.transactionDate).getTime()).slice(0, 5)

  return (
    <>
      <Navbar />
      <div className="md:pl-64">
        <main className="w-full px-4 sm:px-6 lg:px-10 py-4 sm:py-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-6 sm:mb-8">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Dashboard</h1>
              <p className="text-muted-foreground mt-1 sm:mt-2 text-sm sm:text-base">
                Welcome back{profile?.name ? `, ${profile.name}` : ""}! Here&apos;s your shop today.
              </p>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button variant="outline" className="flex-1 sm:flex-none" onClick={() => setIsExpenseOpen(true)}>
                + Add Expense
              </Button>
              <Button className="flex-1 sm:flex-none" asChild>
                <Link href="/sales?new=1">+ Add Sale</Link>
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center min-h-[300px]">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : (
            <>
              {/* Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
                <Card className="p-4">
                  <div className="text-xs sm:text-sm font-medium text-muted-foreground">Today&apos;s Sales</div>
                  <div className="text-xl sm:text-2xl font-bold text-primary mt-1">{rs(stats.todayTotal)}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {stats.todayCount} sales · Cash {rs(stats.todayCash)}
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="text-xs sm:text-sm font-medium text-muted-foreground">This Month</div>
                  <div className="text-xl sm:text-2xl font-bold text-primary mt-1">{rs(stats.monthTotal)}</div>
                  <div className="text-xs text-muted-foreground mt-1">{stats.monthCount} sales</div>
                </Card>
                <Card className="p-4">
                  <div className="text-xs sm:text-sm font-medium text-muted-foreground">Cash in Hand</div>
                  <div className={`text-xl sm:text-2xl font-bold mt-1 ${stats.cashInHand < 0 ? "text-red-600" : "text-green-600"}`}>
                    {rs(stats.cashInHand)}
                  </div>
                  <Link href="/staff-ledger" className="text-xs text-primary hover:underline mt-1 inline-block">
                    View ledger
                  </Link>
                </Card>
                <Card className="p-4">
                  <div className="text-xs sm:text-sm font-medium text-muted-foreground">Boxes in Hand</div>
                  <div className="text-xl sm:text-2xl font-bold text-primary mt-1">{stats.boxesInHand}</div>
                  <Link href="/my-inventory" className="text-xs text-primary hover:underline mt-1 inline-block">
                    View inventory
                  </Link>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                {/* Recent sales */}
                <Card className="lg:col-span-2 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 bg-muted/50 border-b border-border">
                    <h2 className="font-semibold">Recent Sales</h2>
                    <Link href="/sales" className="text-sm text-primary hover:underline">
                      View all
                    </Link>
                  </div>
                  {recentSales.length === 0 ? (
                    <p className="p-6 text-center text-sm text-muted-foreground">No sales yet.</p>
                  ) : (
                    <ul className="divide-y divide-border">
                      {recentSales.map((sale) => (
                        <li key={sale.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                          <div className="min-w-0">
                            <div className="font-medium truncate">
                              #{(sale.saleNumber || 0).toString().padStart(4, "0")} · {sale.purchaserName || "—"}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">
                              {toDate(sale.transactionDate).toLocaleString([], {
                                day: "2-digit",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}{" "}
                              · {sale.items.map((item) => `${item.itemName} × ${item.quantity}`).join(", ")}
                            </div>
                          </div>
                          <div className="font-semibold text-primary whitespace-nowrap">{rs(sale.totalAmount || 0)}</div>
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>

                {/* Low stock */}
                <Card className="overflow-hidden">
                  <div className="px-4 py-3 bg-muted/50 border-b border-border">
                    <h2 className="font-semibold">Low Stock</h2>
                    <p className="text-xs text-muted-foreground">{LOW_STOCK} boxes or fewer</p>
                  </div>
                  {lowStock.length === 0 ? (
                    <p className="p-6 text-center text-sm text-muted-foreground">
                      {stock.length === 0 ? "No stock assigned yet." : "All items are well stocked."}
                    </p>
                  ) : (
                    <ul className="divide-y divide-border">
                      {lowStock.map((s) => (
                        <li key={s.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                          <span className="font-medium">{s.itemName}</span>
                          {s.quantity > 0 ? (
                            <span className="font-semibold text-amber-600">{s.quantity} boxes</span>
                          ) : (
                            <span className="text-xs font-medium px-2 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                              Out of stock
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
              </div>
            </>
          )}

          <AddExpenseDialog open={isExpenseOpen} onOpenChange={setIsExpenseOpen} onCreated={fetchData} />
        </main>
      </div>
    </>
  )
}
