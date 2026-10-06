"use client"

import { Suspense, useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { auth } from "@/lib/firebase"
import { onAuthStateChanged } from "firebase/auth"
import { Navbar } from "@/components/navbar"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { DateFilter, type DatePreset } from "@/components/date-filter"
import { ReceivePaymentDialog } from "@/components/receive-payment-dialog"
import { getCustomers, type Customer } from "@/lib/customers"
import { getSales, type Sale } from "@/lib/sales"
import { getCustomerPayments, deleteCustomerPayment, type CustomerPayment } from "@/lib/customer-payments"
import { buildLedger, getCustomerBalances, type LedgerEntry } from "@/lib/ledger"
import { toast } from "sonner"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

const rs = (value: number) => `RS ${value.toFixed(2)}`
const dayKey = (date: Date) => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`

function LedgerContent() {
  const searchParams = useSearchParams()
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [sales, setSales] = useState<Sale[]>([])
  const [payments, setPayments] = useState<CustomerPayment[]>([])
  const [loading, setLoading] = useState(true)
  const [customerFilter, setCustomerFilter] = useState(searchParams.get("customer") || "all")
  const [dateFilter, setDateFilter] = useState<{ start: Date | null; end: Date | null }>({ start: null, end: null })
  const [isPaymentOpen, setIsPaymentOpen] = useState(false)

  useEffect(() => {
    if (!auth) return
    const unsubscribe = onAuthStateChanged(auth, (user) => setCurrentUserId(user ? user.uid : null))
    return () => unsubscribe()
  }, [])

  useEffect(() => {
    if (currentUserId) fetchData()
  }, [currentUserId])

  const fetchData = async () => {
    if (!currentUserId) return
    try {
      setLoading(true)
      const [customerList, saleList, paymentList] = await Promise.all([
        getCustomers(currentUserId),
        getSales(currentUserId),
        getCustomerPayments(currentUserId),
      ])
      setCustomers(customerList)
      setSales(saleList)
      setPayments(paymentList)
    } catch (err: any) {
      console.error("Error loading ledger:", err)
      toast.error(err.message || "Failed to load ledger")
    } finally {
      setLoading(false)
    }
  }

  const ledger = useMemo(() => buildLedger(sales, payments), [sales, payments])
  const balances = useMemo(() => getCustomerBalances(sales, payments), [sales, payments])

  const filteredEntries = useMemo(
    () =>
      ledger.filter((entry) => {
        if (customerFilter !== "all" && entry.customerId !== customerFilter) return false
        if (dateFilter.start && dateFilter.end) {
          return entry.date >= dateFilter.start && entry.date <= dateFilter.end
        }
        return true
      }),
    [ledger, customerFilter, dateFilter]
  )

  // Newest day first; entries within a day in time order
  const days = useMemo(() => {
    const groups: { key: string; date: Date; entries: LedgerEntry[] }[] = []
    const byKey: Record<string, (typeof groups)[number]> = {}
    for (const entry of filteredEntries) {
      const key = dayKey(entry.date)
      if (!byKey[key]) {
        byKey[key] = { key, date: entry.date, entries: [] }
        groups.push(byKey[key])
      }
      byKey[key].entries.push(entry)
    }
    return groups.reverse()
  }, [filteredEntries])

  const sum = (entries: LedgerEntry[], field: "cash" | "credit" | "paymentReceived" | "total") =>
    entries.reduce((total, entry) => total + entry[field], 0)

  // Opening balance = everything owed before the period starts; closing = opening + credit - payments in the period
  const customerSummary = useMemo(() => {
    const rows: Record<
      string,
      { customerId: string; customerName: string; opening: number; cash: number; credit: number; received: number; closing: number }
    > = {}
    for (const entry of ledger) {
      if (customerFilter !== "all" && entry.customerId !== customerFilter) continue
      if (dateFilter.end && entry.date > dateFilter.end) continue
      const row = (rows[entry.customerId] ||= {
        customerId: entry.customerId,
        customerName: customers.find((c) => c.id === entry.customerId)?.name || entry.customerName,
        opening: 0,
        cash: 0,
        credit: 0,
        received: 0,
        closing: 0,
      })
      if (dateFilter.start && entry.date < dateFilter.start) {
        row.opening += entry.credit - entry.paymentReceived
      } else {
        row.cash += entry.cash
        row.credit += entry.credit
        row.received += entry.paymentReceived
      }
    }
    const list = Object.values(rows)
      .map((row) => ({ ...row, closing: row.opening + row.credit - row.received }))
      .filter((row) => row.opening || row.cash || row.credit || row.received || row.closing)
      .sort((a, b) => a.customerName.localeCompare(b.customerName))
    const totals = list.reduce(
      (t, row) => ({
        opening: t.opening + row.opening,
        cash: t.cash + row.cash,
        credit: t.credit + row.credit,
        received: t.received + row.received,
        closing: t.closing + row.closing,
      }),
      { opening: 0, cash: 0, credit: 0, received: 0, closing: 0 }
    )
    return { rows: list, totals }
  }, [ledger, customers, customerFilter, dateFilter])

  const balanceColor = (value: number) => (value > 0 ? "text-red-600" : value < 0 ? "text-green-600" : "text-primary")

  const handleDeletePayment = async (entry: LedgerEntry) => {
    if (!confirm(`Delete payment of ${rs(entry.paymentReceived)} from ${entry.customerName}?`)) return
    try {
      await deleteCustomerPayment(entry.id.replace(/^payment-/, ""))
      toast.success("Payment deleted")
      await fetchData()
    } catch (err: any) {
      toast.error(err.message || "Failed to delete payment")
    }
  }

  const exportLedgerToPDF = () => {
    const doc = new jsPDF({ orientation: "landscape" })
    const pageWidth = doc.internal.pageSize.getWidth()
    const customerName =
      customerFilter === "all" ? "All Customers" : customers.find((c) => c.id === customerFilter)?.name || "Unknown"

    doc.setFontSize(18)
    doc.text("Customer Ledger", pageWidth / 2, 16, { align: "center" })
    doc.setFontSize(10)
    doc.text(`Customer: ${customerName}`, 14, 26)
    doc.text(
      dateFilter.start && dateFilter.end
        ? `Period: ${dateFilter.start.toLocaleDateString()} - ${dateFilter.end.toLocaleDateString()}`
        : "Period: All dates",
      14,
      31
    )
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 36)
    doc.setFontSize(11)
    doc.text(`Opening Balance: ${rs(customerSummary.totals.opening)}`, pageWidth - 14, 26, { align: "right" })
    doc.text(`Closing Balance: ${rs(customerSummary.totals.closing)}`, pageWidth - 14, 32, { align: "right" })

    // One row per entry, with a bold total row after each day
    const body: string[][] = []
    const dayTotalRows = new Set<number>()
    for (const day of days) {
      for (const entry of day.entries) {
        body.push([
          entry.date.toLocaleDateString(),
          entry.date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          entry.customerName,
          entry.reference,
          entry.details,
          entry.kind === "sale" ? rs(entry.total) : "-",
          entry.cash ? rs(entry.cash) : "-",
          entry.credit ? rs(entry.credit) : "-",
          entry.paymentReceived ? rs(entry.paymentReceived) : "-",
          rs(entry.balance),
        ])
      }
      dayTotalRows.add(body.length)
      body.push([
        `${day.date.toLocaleDateString()} total`,
        "",
        "",
        "",
        "",
        rs(sum(day.entries, "total")),
        rs(sum(day.entries, "cash")),
        rs(sum(day.entries, "credit")),
        rs(sum(day.entries, "paymentReceived")),
        "",
      ])
    }

    autoTable(doc, {
      startY: 42,
      head: [["Date", "Time", "Customer", "Entry", "Details", "Sale Total", "Cash", "Credit", "Received", "Balance"]],
      body,
      theme: "grid",
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [13, 58, 74], textColor: 255 },
      columnStyles: {
        0: { cellWidth: 22 },
        1: { cellWidth: 16 },
        2: { cellWidth: 34 },
        3: { cellWidth: 22 },
        4: { cellWidth: "auto" },
        5: { cellWidth: 24, halign: "right" },
        6: { cellWidth: 24, halign: "right" },
        7: { cellWidth: 24, halign: "right" },
        8: { cellWidth: 24, halign: "right" },
        9: { cellWidth: 26, halign: "right" },
      },
      didParseCell: (data) => {
        if (data.section === "body" && dayTotalRows.has(data.row.index)) {
          data.cell.styles.fontStyle = "bold"
          data.cell.styles.fillColor = [241, 245, 249]
        }
      },
    })

    // Opening / closing balance per customer, with a total row
    const summaryRows = customerSummary.rows.map((row) => [
      row.customerName,
      rs(row.opening),
      rs(row.cash),
      rs(row.credit),
      rs(row.received),
      rs(row.closing),
    ])
    const { totals } = customerSummary
    summaryRows.push(["Total", rs(totals.opening), rs(totals.cash), rs(totals.credit), rs(totals.received), rs(totals.closing)])
    autoTable(doc, {
      startY: ((doc as any).lastAutoTable.finalY || 42) + 10,
      head: [["Customer", "Opening Balance", "Cash Sales", "Credit Sales", "Received", "Closing Balance"]],
      body: summaryRows,
      theme: "grid",
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [13, 58, 74], textColor: 255 },
      columnStyles: {
        1: { halign: "right" },
        2: { halign: "right" },
        3: { halign: "right" },
        4: { halign: "right" },
        5: { halign: "right" },
      },
      didParseCell: (data) => {
        if (data.section === "body" && data.row.index === summaryRows.length - 1) {
          data.cell.styles.fontStyle = "bold"
          data.cell.styles.fillColor = [241, 245, 249]
        }
      },
    })

    const fileSlug = customerFilter === "all" ? "all-customers" : customerName.replace(/\s+/g, "-").toLowerCase()
    doc.save(`ledger-${fileSlug}-${new Date().toISOString().split("T")[0]}.pdf`)
  }

  const handleDateFilter = (start: Date | null, end: Date | null, _preset: DatePreset) => {
    setDateFilter({ start, end })
  }

  return (
    <>
      <Navbar />
      <div className="md:pl-64">
        <main className="w-full px-4 sm:px-6 lg:px-10 py-4 sm:py-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-6 sm:mb-8">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Customer Ledger</h1>
              <p className="text-muted-foreground mt-1 sm:mt-2 text-sm sm:text-base">
                Daily customer sales with cash, credit and running balances
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Button variant="outline" onClick={exportLedgerToPDF} disabled={filteredEntries.length === 0}>
                Export PDF
              </Button>
              <Button onClick={() => setIsPaymentOpen(true)}>+ Receive Payment</Button>
            </div>
          </div>

          <div className="mb-6">
            <DateFilter compact onFilter={handleDateFilter}>
              <select
                value={customerFilter}
                onChange={(e) => setCustomerFilter(e.target.value)}
                className="h-9 border border-border/60 hover:border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-md px-2 text-sm bg-background text-foreground transition-colors outline-none max-w-[200px]"
              >
                <option value="all">All Customers</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
            </DateFilter>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-6">
            <Card className="p-4 sm:p-6">
              <div className="text-xs sm:text-sm font-medium text-muted-foreground">Opening Balance</div>
              <div className={`text-xl sm:text-2xl font-bold mt-1 sm:mt-2 ${balanceColor(customerSummary.totals.opening)}`}>
                {rs(customerSummary.totals.opening)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {dateFilter.start ? `Before ${dateFilter.start.toLocaleDateString()}` : "Start of records"}
              </div>
            </Card>
            <Card className="p-4 sm:p-6">
              <div className="text-xs sm:text-sm font-medium text-muted-foreground">Cash Sales</div>
              <div className="text-xl sm:text-2xl font-bold text-green-600 mt-1 sm:mt-2">{rs(customerSummary.totals.cash)}</div>
            </Card>
            <Card className="p-4 sm:p-6">
              <div className="text-xs sm:text-sm font-medium text-muted-foreground">Credit Sales</div>
              <div className="text-xl sm:text-2xl font-bold text-amber-600 mt-1 sm:mt-2">{rs(customerSummary.totals.credit)}</div>
            </Card>
            <Card className="p-4 sm:p-6">
              <div className="text-xs sm:text-sm font-medium text-muted-foreground">Payments Received</div>
              <div className="text-xl sm:text-2xl font-bold text-blue-600 mt-1 sm:mt-2">{rs(customerSummary.totals.received)}</div>
            </Card>
            <Card className="p-4 sm:p-6 col-span-2 lg:col-span-1">
              <div className="text-xs sm:text-sm font-medium text-muted-foreground">Closing Balance</div>
              <div className={`text-xl sm:text-2xl font-bold mt-1 sm:mt-2 ${balanceColor(customerSummary.totals.closing)}`}>
                {rs(customerSummary.totals.closing)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {dateFilter.end ? `As of ${dateFilter.end.toLocaleDateString()}` : "As of now"}
              </div>
            </Card>
          </div>

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
                  {/* Day header with daily totals */}
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 px-4 py-3 bg-muted/50 border-b border-border">
                    <h2 className="font-semibold">
                      {day.date.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                    </h2>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                      <span>
                        Sales: <span className="font-semibold">{rs(sum(day.entries, "total"))}</span>
                      </span>
                      <span className="text-green-600">
                        Cash: <span className="font-semibold">{rs(sum(day.entries, "cash"))}</span>
                      </span>
                      <span className="text-amber-600">
                        Credit: <span className="font-semibold">{rs(sum(day.entries, "credit"))}</span>
                      </span>
                      <span className="text-blue-600">
                        Received: <span className="font-semibold">{rs(sum(day.entries, "paymentReceived"))}</span>
                      </span>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[900px]">
                      <thead>
                        <tr className="border-b border-border text-sm">
                          <th className="text-left py-2 px-4 font-semibold">Time</th>
                          <th className="text-left py-2 px-4 font-semibold">Customer</th>
                          <th className="text-left py-2 px-4 font-semibold">Entry</th>
                          <th className="text-left py-2 px-4 font-semibold">Details</th>
                          <th className="text-right py-2 px-4 font-semibold">Sale Total</th>
                          <th className="text-right py-2 px-4 font-semibold">Cash</th>
                          <th className="text-right py-2 px-4 font-semibold">Credit</th>
                          <th className="text-right py-2 px-4 font-semibold">Received</th>
                          <th className="text-right py-2 px-4 font-semibold">Balance</th>
                          <th className="py-2 px-4"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {day.entries.map((entry) => (
                          <tr key={entry.id} className="border-b border-border last:border-0 text-sm hover:bg-muted/30">
                            <td className="py-2 px-4 text-muted-foreground whitespace-nowrap">
                              {entry.date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </td>
                            <td className="py-2 px-4 font-medium">{entry.customerName}</td>
                            <td className="py-2 px-4">
                              <span
                                className={`px-2 py-0.5 rounded text-xs font-medium ${
                                  entry.kind === "sale"
                                    ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                                    : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                                }`}
                              >
                                {entry.reference}
                              </span>
                            </td>
                            <td className="py-2 px-4 text-muted-foreground max-w-xs">
                              <span className="line-clamp-2">{entry.details}</span>
                            </td>
                            <td className="py-2 px-4 text-right">{entry.kind === "sale" ? rs(entry.total) : "—"}</td>
                            <td className="py-2 px-4 text-right text-green-600">{entry.cash ? rs(entry.cash) : "—"}</td>
                            <td className="py-2 px-4 text-right text-amber-600">{entry.credit ? rs(entry.credit) : "—"}</td>
                            <td className="py-2 px-4 text-right text-blue-600">
                              {entry.paymentReceived ? rs(entry.paymentReceived) : "—"}
                            </td>
                            <td className={`py-2 px-4 text-right font-semibold ${entry.balance > 0 ? "text-red-600" : ""}`}>
                              {rs(entry.balance)}
                            </td>
                            <td className="py-2 px-4 text-right">
                              {entry.kind === "payment" && (
                                <button
                                  onClick={() => handleDeletePayment(entry)}
                                  className="text-xs text-red-600 hover:underline"
                                >
                                  Delete
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              ))}
            </div>
          )}

          <ReceivePaymentDialog
            open={isPaymentOpen}
            onOpenChange={setIsPaymentOpen}
            customers={customers}
            balances={balances}
            defaultCustomerId={customerFilter !== "all" ? customerFilter : undefined}
            onSaved={fetchData}
          />
        </main>
      </div>
    </>
  )
}

export default function Ledger() {
  return (
    <Suspense>
      <LedgerContent />
    </Suspense>
  )
}
