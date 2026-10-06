"use client"

import type React from "react"
import { Suspense, useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { DateFilter, type DatePreset } from "@/components/date-filter"
import { useCurrentUser } from "@/components/auth-guard"
import { getStaffMembers, type UserProfile } from "@/lib/users"
import { getStaffSales } from "@/lib/sales"
import {
  addStaffPayment,
  buildStaffLedger,
  deleteStaffPayment,
  getStaffExpenses,
  getStaffPayments,
  getStockTransfers,
  type StaffLedgerEntry,
  type StockTransfer,
} from "@/lib/staff-ledger"
import type { Sale } from "@/lib/sales"
import { toast } from "sonner"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

const rs = (value: number) => `RS ${value.toFixed(2)}`
const dayKey = (date: Date) => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
const today = () => new Date().toISOString().split("T")[0]
const sum = (entries: StaffLedgerEntry[], key: keyof StaffLedgerEntry) =>
  entries.reduce((total, e) => total + (e[key] as number), 0)

const ENTRY_STYLES: Record<StaffLedgerEntry["kind"], string> = {
  stock: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300",
  sale: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  expense: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  handover: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
}

function StaffLedgerContent() {
  const searchParams = useSearchParams()
  const { user, isStaff, ownerId, profile } = useCurrentUser()
  const [staff, setStaff] = useState<UserProfile[]>([])
  const [staffId, setStaffId] = useState(searchParams.get("staff") || "")
  const [transfers, setTransfers] = useState<StockTransfer[]>([])
  const [entries, setEntries] = useState<StaffLedgerEntry[]>([])
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [dateFilter, setDateFilter] = useState<{ start: Date | null; end: Date | null }>({ start: null, end: null })

  // Receive cash dialog (admin)
  const [isCashOpen, setIsCashOpen] = useState(false)
  const [cashForm, setCashForm] = useState({ amount: "", note: "", date: today() })
  const [cashError, setCashError] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  // Staff see their own ledger; admins pick one of their staff
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

  const fetchData = async () => {
    if (!staffId) return
    const adminId = isStaff ? undefined : ownerId || undefined
    try {
      setLoading(true)
      const [transferList, saleList, expenseList, paymentList] = await Promise.all([
        getStockTransfers(staffId, adminId),
        getStaffSales(staffId),
        getStaffExpenses(staffId),
        getStaffPayments(staffId, adminId),
      ])
      setTransfers(transferList)
      setSales(saleList)
      setEntries(buildStaffLedger(transferList, saleList, expenseList, paymentList))
    } catch (err: any) {
      console.error("Error loading staff ledger:", err)
      toast.error(err.message || "Failed to load ledger")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [staffId])

  const selectedStaff = isStaff ? profile : staff.find((s) => s.id === staffId)
  const staffName = selectedStaff?.name || "Staff"

  const filteredEntries = useMemo(
    () =>
      entries.filter(
        (e) => !dateFilter.start || !dateFilter.end || (e.date >= dateFilter.start && e.date <= dateFilter.end),
      ),
    [entries, dateFilter],
  )

  // Balances carried in from before the selected period
  const opening = useMemo(() => {
    const before = dateFilter.start ? entries.filter((e) => e.date < dateFilter.start!) : []
    const last = before[before.length - 1]
    return { cash: last?.cashBalance || 0, stock: last?.stockBalance || 0 }
  }, [entries, dateFilter])

  const totals = {
    cashIn: sum(filteredEntries, "cashIn"),
    credit: sum(filteredEntries, "credit"),
    expenses: sum(filteredEntries.filter((e) => e.kind === "expense"), "cashOut"),
    handedOver: sum(filteredEntries.filter((e) => e.kind === "handover"), "cashOut"),
  }
  const lastEntry = filteredEntries[filteredEntries.length - 1]
  const closing = {
    cash: lastEntry ? lastEntry.cashBalance : opening.cash,
    stock: lastEntry ? lastEntry.stockBalance : opening.stock,
  }

  // Stock received, returned, sold and in hand per item (all time)
  const stockSummary = useMemo(() => {
    const rows: Record<string, { name: string; received: number; returned: number; sold: number }> = {}
    const row = (id: string, name: string) => (rows[id] ||= { name, received: 0, returned: 0, sold: 0 })
    for (const t of transfers) {
      if (t.quantity > 0) row(t.itemId, t.itemName).received += t.quantity
      else row(t.itemId, t.itemName).returned -= t.quantity
    }
    for (const sale of sales) {
      for (const item of sale.items) row(item.itemId, item.itemName).sold += item.quantity
    }
    return Object.entries(rows)
      .map(([id, r]) => ({ id, ...r, inHand: r.received - r.returned - r.sold }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [transfers, sales])

  const days = useMemo(() => {
    const groups: { key: string; date: Date; entries: StaffLedgerEntry[] }[] = []
    for (const entry of [...filteredEntries].reverse()) {
      const key = dayKey(entry.date)
      let group = groups.find((g) => g.key === key)
      if (!group) {
        group = { key, date: entry.date, entries: [] }
        groups.push(group)
      }
      group.entries.push(entry)
    }
    return groups
  }, [filteredEntries])

  const handleDateFilter = (start: Date | null, end: Date | null, _preset: DatePreset) => {
    setDateFilter({ start, end })
  }

  const handleReceiveCash = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ownerId || !selectedStaff) return
    setCashError("")
    const amount = Number.parseFloat(cashForm.amount)
    if (!(amount > 0)) {
      setCashError("Enter an amount greater than 0")
      return
    }
    setIsSaving(true)
    try {
      const date = new Date(`${cashForm.date}T${new Date().toTimeString().split(" ")[0]}`)
      await addStaffPayment({
        adminId: ownerId,
        staffId: selectedStaff.id,
        staffName: selectedStaff.name,
        amount,
        note: cashForm.note,
        date,
      })
      toast.success(`Received ${rs(amount)} from ${selectedStaff.name}`)
      setIsCashOpen(false)
      setCashForm({ amount: "", note: "", date: today() })
      fetchData()
    } catch (err: any) {
      setCashError(err.message || "Failed to save")
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteHandover = async (entry: StaffLedgerEntry) => {
    if (!confirm(`Delete cash received of ${rs(entry.cashOut)}?`)) return
    try {
      await deleteStaffPayment(entry.sourceId)
      toast.success("Entry deleted")
      fetchData()
    } catch (err: any) {
      toast.error(err.message || "Failed to delete")
    }
  }

  const exportToPDF = () => {
    const doc = new jsPDF({ orientation: "landscape" })
    doc.setFontSize(18)
    doc.text(`Staff Ledger — ${staffName}`, 14, 18)
    doc.setFontSize(10)
    doc.text(
      dateFilter.start && dateFilter.end
        ? `Period: ${dateFilter.start.toLocaleDateString()} - ${dateFilter.end.toLocaleDateString()}`
        : `Generated: ${new Date().toLocaleString()}`,
      14,
      26,
    )
    doc.text(
      `Opening cash: ${rs(opening.cash)}   Cash sales: ${rs(totals.cashIn)}   Expenses: ${rs(totals.expenses)}   ` +
        `Handed over: ${rs(totals.handedOver)}   Cash in hand: ${rs(closing.cash)}   Stock in hand: ${closing.stock} boxes`,
      14,
      32,
    )
    autoTable(doc, {
      startY: 38,
      head: [["Date", "Entry", "Details", "Boxes In", "Boxes Out", "Cash In", "Credit", "Cash Out", "Cash in Hand"]],
      body: filteredEntries.map((e) => [
        e.date.toLocaleString(),
        e.reference,
        e.details,
        e.boxesIn || "",
        e.boxesOut || "",
        e.cashIn ? rs(e.cashIn) : "",
        e.credit ? rs(e.credit) : "",
        e.cashOut ? rs(e.cashOut) : "",
        rs(e.cashBalance),
      ]),
      theme: "grid",
      styles: { fontSize: 8, cellPadding: 1.5 },
      headStyles: { fillColor: [59, 130, 246], textColor: 255 },
    })
    doc.save(`staff-ledger-${staffName.replace(/\s+/g, "-").toLowerCase()}-${today()}.pdf`)
  }

  const selectClass =
    "h-9 border border-border/60 hover:border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-md px-2 text-sm bg-background text-foreground transition-colors outline-none max-w-[200px]"

  return (
    <>
      <Navbar />
      <div className="md:pl-64">
        <main className="w-full px-4 sm:px-6 lg:px-10 py-4 sm:py-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-6 sm:mb-8">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{isStaff ? "My Ledger" : "Staff Ledger"}</h1>
              <p className="text-muted-foreground mt-1 sm:mt-2 text-sm sm:text-base">
                Stock received and sold, cash collected, expenses and cash handed over
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Button variant="outline" onClick={exportToPDF} disabled={filteredEntries.length === 0}>
                Export PDF
              </Button>
              {!isStaff && (
                <Button onClick={() => setIsCashOpen(true)} disabled={!selectedStaff}>
                  + Receive Cash
                </Button>
              )}
            </div>
          </div>

          <div className="mb-6">
            <DateFilter compact onFilter={handleDateFilter}>
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
            </DateFilter>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4 mb-6">
            <Card className="p-4">
              <div className="text-xs sm:text-sm font-medium text-muted-foreground">Opening Cash</div>
              <div className="text-xl font-bold mt-1">{rs(opening.cash)}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {dateFilter.start ? `Before ${dateFilter.start.toLocaleDateString()}` : "Start of records"}
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-xs sm:text-sm font-medium text-muted-foreground">Cash Sales</div>
              <div className="text-xl font-bold text-green-600 mt-1">{rs(totals.cashIn)}</div>
              <div className="text-xs text-muted-foreground mt-1">Credit: {rs(totals.credit)}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs sm:text-sm font-medium text-muted-foreground">Expenses</div>
              <div className="text-xl font-bold text-red-600 mt-1">{rs(totals.expenses)}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs sm:text-sm font-medium text-muted-foreground">Handed to Admin</div>
              <div className="text-xl font-bold text-blue-600 mt-1">{rs(totals.handedOver)}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs sm:text-sm font-medium text-muted-foreground">Cash in Hand</div>
              <div className={`text-xl font-bold mt-1 ${closing.cash < 0 ? "text-red-600" : "text-primary"}`}>
                {rs(closing.cash)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {dateFilter.end ? `As of ${dateFilter.end.toLocaleDateString()}` : "As of now"}
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-xs sm:text-sm font-medium text-muted-foreground">Stock in Hand</div>
              <div className="text-xl font-bold text-primary mt-1">{closing.stock} boxes</div>
            </Card>
          </div>

          {/* Stock per item */}
          {stockSummary.length > 0 && (
            <Card className="mb-6 overflow-hidden">
              <div className="px-4 py-3 bg-muted/50 border-b border-border font-semibold">Stock by Item (all time)</div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-4 font-semibold">Item</th>
                      <th className="text-right py-2 px-4 font-semibold">Received</th>
                      <th className="text-right py-2 px-4 font-semibold">Returned</th>
                      <th className="text-right py-2 px-4 font-semibold">Sold</th>
                      <th className="text-right py-2 px-4 font-semibold">In Hand</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stockSummary.map((row) => (
                      <tr key={row.id} className="border-b border-border last:border-0">
                        <td className="py-2 px-4 font-medium">{row.name}</td>
                        <td className="py-2 px-4 text-right">{row.received}</td>
                        <td className="py-2 px-4 text-right">{row.returned || "—"}</td>
                        <td className="py-2 px-4 text-right">{row.sold || "—"}</td>
                        <td className="py-2 px-4 text-right font-semibold">{row.inHand}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {loading ? (
            <div className="flex items-center justify-center min-h-[200px]">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : days.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">No ledger entries for this selection.</Card>
          ) : (
            <div className="space-y-6">
              {days.map((day) => (
                <Card key={day.key} className="overflow-hidden">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 px-4 py-3 bg-muted/50 border-b border-border">
                    <h2 className="font-semibold">
                      {day.date.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                    </h2>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                      <span className="text-green-600">
                        Cash in: <span className="font-semibold">{rs(sum(day.entries, "cashIn"))}</span>
                      </span>
                      <span className="text-amber-600">
                        Credit: <span className="font-semibold">{rs(sum(day.entries, "credit"))}</span>
                      </span>
                      <span className="text-red-600">
                        Cash out: <span className="font-semibold">{rs(sum(day.entries, "cashOut"))}</span>
                      </span>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[960px]">
                      <thead>
                        <tr className="border-b border-border text-sm">
                          <th className="text-left py-2 px-4 font-semibold">Time</th>
                          <th className="text-left py-2 px-4 font-semibold">Entry</th>
                          <th className="text-left py-2 px-4 font-semibold">Details</th>
                          <th className="text-right py-2 px-4 font-semibold">Boxes In</th>
                          <th className="text-right py-2 px-4 font-semibold">Boxes Out</th>
                          <th className="text-right py-2 px-4 font-semibold">Cash In</th>
                          <th className="text-right py-2 px-4 font-semibold">Credit</th>
                          <th className="text-right py-2 px-4 font-semibold">Cash Out</th>
                          <th className="text-right py-2 px-4 font-semibold">Cash in Hand</th>
                          {!isStaff && <th className="py-2 px-4"></th>}
                        </tr>
                      </thead>
                      <tbody>
                        {[...day.entries].reverse().map((entry) => (
                          <tr key={entry.id} className="border-b border-border last:border-0 text-sm hover:bg-muted/30">
                            <td className="py-2 px-4 text-muted-foreground whitespace-nowrap">
                              {entry.date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </td>
                            <td className="py-2 px-4 whitespace-nowrap">
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${ENTRY_STYLES[entry.kind]}`}>
                                {entry.reference}
                              </span>
                            </td>
                            <td className="py-2 px-4 text-muted-foreground max-w-xs">
                              <span className="line-clamp-2">{entry.details}</span>
                            </td>
                            <td className="py-2 px-4 text-right">{entry.boxesIn || "—"}</td>
                            <td className="py-2 px-4 text-right">{entry.boxesOut || "—"}</td>
                            <td className="py-2 px-4 text-right text-green-600">{entry.cashIn ? rs(entry.cashIn) : "—"}</td>
                            <td className="py-2 px-4 text-right text-amber-600">{entry.credit ? rs(entry.credit) : "—"}</td>
                            <td className="py-2 px-4 text-right text-red-600">{entry.cashOut ? rs(entry.cashOut) : "—"}</td>
                            <td className={`py-2 px-4 text-right font-semibold ${entry.cashBalance < 0 ? "text-red-600" : ""}`}>
                              {rs(entry.cashBalance)}
                            </td>
                            {!isStaff && (
                              <td className="py-2 px-4 text-right">
                                {entry.kind === "handover" && (
                                  <button
                                    onClick={() => handleDeleteHandover(entry)}
                                    className="text-xs text-red-600 hover:underline"
                                  >
                                    Delete
                                  </button>
                                )}
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Receive cash from staff (admin) */}
          <Dialog open={isCashOpen} onOpenChange={(open) => !isSaving && setIsCashOpen(open)}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Receive Cash from {staffName}</DialogTitle>
                <DialogDescription>
                  Cash in hand with {staffName}: <span className="font-semibold">{rs(closing.cash)}</span>
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleReceiveCash} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Amount (RS) <span className="text-red-500">*</span>
                  </label>
                  <Input
                    autoFocus
                    type="number"
                    min="0"
                    step="0.01"
                    value={cashForm.amount}
                    placeholder="0.00"
                    onChange={(e) => setCashForm({ ...cashForm, amount: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Date</label>
                  <Input
                    type="date"
                    value={cashForm.date}
                    max={today()}
                    onChange={(e) => setCashForm({ ...cashForm, date: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Note</label>
                  <Input
                    value={cashForm.note}
                    placeholder="e.g., Weekly collection"
                    onChange={(e) => e.target.value.length <= 100 && setCashForm({ ...cashForm, note: e.target.value })}
                  />
                </div>
                {cashError && <div className="text-red-600 text-sm font-medium">{cashError}</div>}
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsCashOpen(false)} disabled={isSaving}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? "Saving..." : "Save"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </>
  )
}

export default function StaffLedger() {
  return (
    <Suspense>
      <StaffLedgerContent />
    </Suspense>
  )
}
