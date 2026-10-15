"use client"

import { useEffect, useMemo, useState } from "react"
import { db, auth } from "@/lib/firebase"
import { collection, getDocs, query, orderBy } from "firebase/firestore"
import { Navbar } from "@/components/navbar"
import { FilterSelect } from "@/components/filter-select"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import { DateFilter, getTodayRange, type DatePreset } from "@/components/date-filter"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

function ReportsContent() {
  const [allSales, setAllSales] = useState<any[]>([])
  const [items, setItems] = useState<any[]>([])
  const [purchases, setPurchases] = useState<any[]>([])
  const [filterType, setFilterType] = useState<"all" | "box" | "retail">("all")
  const [dateFilter, setDateFilter] = useState<{ start: Date | null; end: Date | null }>(getTodayRange)

  useEffect(() => {
    fetchSales()
    fetchItems()
    fetchPurchases()
  }, [])

  const fetchPurchases = async () => {
    try {
      const userId = auth?.currentUser?.uid
      if (!userId) return

      const { getPurchases } = await import("@/lib/purchases")
      const purchasesList = await getPurchases(userId)
      setPurchases(purchasesList)
    } catch (error) {
      console.error("Error fetching purchases:", error)
    }
  }

  const fetchItems = async () => {
    try {
      const userId = auth?.currentUser?.uid
      if (!userId) return

      const { getItems } = await import("@/lib/items")
      const itemsList = await getItems(userId)
      setItems(itemsList)
    } catch (error) {
      console.error("Error fetching items:", error)
    }
  }

  const fetchSales = async () => {
    try {
      if (!db) {
        console.error("Database is not available. Please check your Firebase configuration.")
        return
      }

      const userId = auth?.currentUser?.uid
      if (!userId) {
        console.error("No user logged in")
        return
      }

      // Get user-specific sales
      const { getSales } = await import("@/lib/sales")
      const salesList = await getSales(userId)

      setAllSales(salesList)
    } catch (error) {
      console.error("Error fetching sales:", error)
    }
  }

  const handleDateFilter = (startDateFilter: Date | null, endDateFilter: Date | null, _preset: DatePreset) => {
    setDateFilter({ start: startDateFilter, end: endDateFilter })
  }

  // Sale date as recorded (same date the Sales page and Dashboard filter on)
  const saleDateOf = (sale: any): Date => {
    const value = sale.transactionDate || sale.createdAt
    return value?.toDate ? value.toDate() : new Date(value)
  }

  // Every sale (admin and staff) matching the date and type filters, newest first
  const filteredSales = useMemo(
    () =>
      allSales
        .filter((sale) => {
          if (filterType !== "all" && sale.type !== filterType) return false
          if (dateFilter.start && dateFilter.end) {
            const saleDate = saleDateOf(sale)
            return saleDate >= dateFilter.start && saleDate <= dateFilter.end
          }
          return true
        })
        .sort((a, b) => saleDateOf(b).getTime() - saleDateOf(a).getTime()),
    [allSales, filterType, dateFilter]
  )
  // Calculate stats
  const totalRevenue = filteredSales.reduce((sum, sale) => sum + (sale.totalAmount || 0), 0)
  const totalTransactions = filteredSales.length
  const avgTransaction = totalTransactions > 0 ? totalRevenue / totalTransactions : 0
  const boxCount = filteredSales.filter((s) => s.type === "box").length
  const retailCount = filteredSales.filter((s) => s.type === "retail").length
  const totalAmountSpent = items.reduce((sum, item) => sum + ((item.actualPrice || item.costPrice || 0) * item.quantity), 0)

  // Chart data - daily revenue
  const dailyData: { [key: string]: number } = {}
  filteredSales.forEach((sale) => {
    const d = saleDateOf(sale)
    const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
    dailyData[date] = (dailyData[date] || 0) + (sale.totalAmount || 0)
  })

  // Sorted by the date key before formatting, so days stay in calendar order
  const chartData = Object.entries(dailyData)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, revenue]) => ({
      date: new Date(`${date}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      revenue,
    }))

  // Sales by type
  const saleTypeData = [
    { name: "Retail", value: retailCount, fill: "#10b981" },
    { name: "Box Purchase", value: boxCount, fill: "#3b82f6" },
  ]

  const exportReportToPDF = () => {
    const doc = new jsPDF()

    // Add title
    doc.setFontSize(18)
    doc.text("Sales Report & Analysis", 14, 22)

    // Add date range and filters
    doc.setFontSize(10)
    if (dateFilter.start && dateFilter.end) {
      doc.text(
        `Report Period: ${dateFilter.start.toLocaleDateString()} - ${dateFilter.end.toLocaleDateString()}`,
        14,
        30
      )
    } else {
      doc.text("Report Period: All dates", 14, 30)
    }

    if (filterType !== "all") {
      doc.text(`Sale Type: ${filterType.toUpperCase()}`, 14, 36)
    }

    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, filterType !== "all" ? 42 : 36)

    // Add summary statistics
    doc.setFontSize(14)
    const statsY = filterType !== "all" ? 52 : 46
    doc.text("Summary Statistics", 14, statsY)

    doc.setFontSize(10)
    doc.text(`Total Revenue: RS ${totalRevenue.toFixed(2)}`, 14, statsY + 8)
    doc.text(`Total Transactions: ${totalTransactions}`, 14, statsY + 14)
    doc.text(`Average Transaction: RS ${avgTransaction.toFixed(2)}`, 14, statsY + 20)
    doc.text(`Retail Sales: ${retailCount} (${((retailCount / totalTransactions) * 100 || 0).toFixed(1)}%)`, 14, statsY + 26)
    doc.text(`Box Sales: ${boxCount} (${((boxCount / totalTransactions) * 100 || 0).toFixed(1)}%)`, 14, statsY + 32)
    doc.text(`Total Amount Spent: RS ${totalAmountSpent.toFixed(2)}`, 14, statsY + 38)

    // Add sales table
    doc.setFontSize(12)
    doc.text("Sales Transactions", 14, statsY + 42)

    const tableData = filteredSales.map((sale) => {
      const date = saleDateOf(sale).toLocaleDateString()

      const itemsList = sale.items?.map((item: any) =>
        `${item.itemName || item.name} (x${item.quantity})`
      ).join(", ") || "No items"

      let paymentInfo = ""
      if (sale.paymentMethod) {
        if (sale.paymentMethod.cash && sale.paymentMethod.credit) {
          paymentInfo = `Cash: RS ${(sale.paymentMethod.cashAmount || 0).toFixed(2)}\nCredit: RS ${(sale.paymentMethod.creditAmount || 0).toFixed(2)}`
        } else if (sale.paymentMethod.cash) {
          paymentInfo = "Cash"
        } else if (sale.paymentMethod.credit) {
          paymentInfo = "Credit"
        }
      } else {
        paymentInfo = "N/A"
      }

      return [
        date,
        sale.type?.toUpperCase() || "N/A",
        itemsList,
        paymentInfo,
        `RS ${(sale.totalAmount || 0).toFixed(2)}`
      ]
    })

    autoTable(doc, {
      startY: statsY + 48,
      head: [["Date", "Type", "Items", "Payment", "Amount"]],
      body: tableData,
      theme: "grid",
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [59, 130, 246], textColor: 255 },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 25 },
        2: { cellWidth: 60 },
        3: { cellWidth: 35 },
        4: { cellWidth: 25 }
      }
    })

    // Add daily revenue breakdown
    const finalY = (doc as any).lastAutoTable.finalY || statsY + 48
    if (finalY < 250) {
      doc.setFontSize(12)
      doc.text("Daily Revenue Breakdown", 14, finalY + 10)

      doc.setFontSize(9)
      let yPos = finalY + 16
      chartData.slice(0, 10).forEach((item) => {
        doc.text(`${item.date}: RS ${item.revenue.toFixed(2)}`, 14, yPos)
        yPos += 6
        if (yPos > 280) return // Prevent overflow
      })
    }

    // Save PDF
    const fileName = `sales-report-${new Date().toISOString().split("T")[0]}.pdf`
    doc.save(fileName)
  }

  return (
    <>
      <Navbar />
      <div className="md:pl-64">
      <main className="w-full px-4 sm:px-6 lg:px-10 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Sales Reports</h1>
          <p className="text-muted-foreground mt-2">Analyze your sales performance</p>
        </div>

        {/* Filters */}
        <div className="mb-6 flex items-center gap-2 flex-wrap">
          <FilterSelect
            value={filterType}
            onValueChange={(value) => setFilterType(value as "all" | "box" | "retail")}
            options={[
              { value: "all", label: "All Sales" },
              { value: "retail", label: "Retail Only" },
              { value: "box", label: "Box Purchase Only" },
            ]}
            aria-label="Sale type"
          />
          <DateFilter compact onFilter={handleDateFilter} />
          <Button size="sm" className="h-9 ml-auto" onClick={exportReportToPDF} disabled={filteredSales.length === 0}>
            Export PDF
          </Button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
  <Card className="p-6">
    <div className="text-sm font-medium text-muted-foreground">Total Revenue</div>
    <div className="text-xl font-semibold text-primary mt-2">
      RS {totalRevenue.toFixed(2)}
    </div>
  </Card>

  <Card className="p-6">
    <div className="text-sm font-medium text-muted-foreground">Transactions</div>
    <div className="text-xl font-semibold text-primary mt-2">
      {totalTransactions}
    </div>
  </Card>

  <Card className="p-6">
    <div className="text-sm font-medium text-muted-foreground">Avg Transaction</div>
    <div className="text-xl font-semibold text-primary mt-2">
      RS {avgTransaction.toFixed(2)}
    </div>
  </Card>

  <Card className="p-6">
    <div className="text-sm font-medium text-muted-foreground">Retail / Box Purchase</div>
    <div className="text-xl font-semibold text-primary mt-2">
      {retailCount} / {boxCount}
    </div>
  </Card>

  <Card className="p-6">
    <div className="text-sm font-medium text-muted-foreground">Inventory Cost Value</div>
    <div className="text-xl font-semibold text-orange-600 mt-2">
      RS {totalAmountSpent.toFixed(2)}
    </div>
  </Card>
</div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          <Card className="col-span-1 lg:col-span-2 p-6">
            <h2 className="text-lg font-semibold mb-4">Daily Revenue</h2>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData} margin={{ top: 5, right: 30, left: 80, bottom: 5 }}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                  <XAxis dataKey="date" stroke="var(--muted-foreground)" />
                  <YAxis stroke="var(--muted-foreground)" domain={[0, 'auto']} tickCount={5} allowDecimals={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="revenue" stroke="var(--primary)" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-center py-8">No data for selected period</p>
            )}
          </Card>

          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Sales Distribution</h2>
            {saleTypeData.some((item) => item.value > 0) ? (
              <div className="space-y-4">
                {saleTypeData.map((item) => (
                  <div key={item.name} className="flex items-center justify-between p-4 rounded-lg bg-muted">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: item.fill }}
                      />
                      <span className="font-medium">{item.name}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-lg">{item.value}</div>
                      <div className="text-sm text-muted-foreground">
                        {totalTransactions > 0 ? ((item.value / totalTransactions) * 100).toFixed(1) : 0}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">No sales data</p>
            )}
          </Card>
        </div>

        {/* Sales Table */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Sales Details</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-2">Date</th>
                  <th className="text-left py-3 px-2">Type</th>
                  <th className="text-left py-3 px-2">Items</th>
                  <th className="text-left py-3 px-2">User</th>
                  <th className="text-right py-3 px-2">Amount</th>
                </tr>
              </thead>
              <tbody>
                {filteredSales.map((sale) => (
                  <tr key={sale.id} className="border-b border-border hover:bg-muted">
                    <td className="py-3 px-2 text-xs">{saleDateOf(sale).toLocaleDateString()}</td>
                    <td className="py-3 px-2">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${sale.type === "box"
                            ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                            : "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                          }`}
                      >
                        {sale.type}
                      </span>
                    </td>
                    <td className="py-3 px-2">{sale.items?.length || 0}</td>
                    <td className="py-3 px-2 text-xs">{sale.userName || "Unknown"}</td>
                    <td className="py-3 px-2 text-right font-semibold">RS {(sale.totalAmount || 0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </main>
      </div>
    </>
  )
}

export default function Reports() {
  return <ReportsContent />
}
