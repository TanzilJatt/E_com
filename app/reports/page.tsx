"use client"

import { useEffect, useState } from "react"
import { db, auth } from "@/lib/firebase"
import { collection, getDocs, query, orderBy } from "firebase/firestore"
import { Navbar } from "@/components/navbar"
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
import { DateFilter, type DatePreset } from "@/components/date-filter"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

function ReportsContent() {
  const [sales, setSales] = useState<any[]>([])
  const [allSales, setAllSales] = useState<any[]>([])
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
  )
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0])
  const [filterType, setFilterType] = useState<"all" | "wholesale" | "retail">("all")
  const [dateFilter, setDateFilter] = useState<{ start: Date | null; end: Date | null }>({ start: null, end: null })

  useEffect(() => {
    fetchSales()
  }, [])

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
      setSales(salesList)
    } catch (error) {
      console.error("Error fetching sales:", error)
    }
  }

  const handleDateFilter = (startDateFilter: Date | null, endDateFilter: Date | null, preset: DatePreset) => {
    setDateFilter({ start: startDateFilter, end: endDateFilter })
    
    if (!startDateFilter || !endDateFilter) {
      setSales(allSales)
      return
    }

    const filtered = allSales.filter((sale) => {
      const saleDate = sale.createdAt?.toDate?.()
      if (!saleDate) return false
      return saleDate >= startDateFilter && saleDate <= endDateFilter
    })
    
    setSales(filtered)
  }

  const filteredSales = sales.filter((sale) => {
    const saleDate = sale.createdAt?.toDate?.()?.toISOString().split("T")[0] || ""
    const inDateRange = saleDate >= startDate && saleDate <= endDate
    const typeMatch = filterType === "all" || sale.type === filterType
    return inDateRange && typeMatch
  })

  // Calculate stats
  const totalRevenue = filteredSales.reduce((sum, sale) => sum + (sale.totalAmount || 0), 0)
  const totalTransactions = filteredSales.length
  const avgTransaction = totalTransactions > 0 ? totalRevenue / totalTransactions : 0
  const wholesaleCount = filteredSales.filter((s) => s.type === "wholesale").length
  const retailCount = filteredSales.filter((s) => s.type === "retail").length

  // Chart data - daily revenue
  const dailyData: { [key: string]: number } = {}
  filteredSales.forEach((sale) => {
    const date = sale.createdAt?.toDate?.()?.toISOString().split("T")[0] || ""
    dailyData[date] = (dailyData[date] || 0) + (sale.totalAmount || 0)
  })

  const chartData = Object.entries(dailyData)
    .map(([date, revenue]) => ({
      date: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      revenue,
    }))
    .sort((a, b) => a.date.localeCompare(b.date))

  // Sales by type
  const saleTypeData = [
    { name: "Retail", value: retailCount, fill: "#10b981" },
    { name: "Wholesale", value: wholesaleCount, fill: "#3b82f6" },
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
      doc.text(
        `Report Period: ${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`,
        14,
        30
      )
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
    doc.text(`Wholesale Sales: ${wholesaleCount} (${((wholesaleCount / totalTransactions) * 100 || 0).toFixed(1)}%)`, 14, statsY + 32)
    
    // Add sales table
    doc.setFontSize(12)
    doc.text("Sales Transactions", 14, statsY + 42)
    
    const tableData = filteredSales.map((sale) => {
      const date = sale.createdAt?.toDate?.()?.toLocaleDateString() || "N/A"
      
      const itemsList = sale.items?.map((item: any) => 
        `${item.name} (x${item.quantity})`
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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Sales Reports</h1>
          <p className="text-muted-foreground mt-2">Analyze your sales performance</p>
        </div>

        {/* Date Filter */}
        <DateFilter onFilter={handleDateFilter} />

        {/* Additional Filters */}
        <Card className="p-4 mb-6">
          <div className="flex  gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-2">Sale Type</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as "all" | "wholesale" | "retail")}
                className="w-full border border-input rounded-lg p-2 bg-background text-foreground"
              >
                <option value="all">All Sales</option>
                <option value="retail">Retail Only</option>
                <option value="wholesale">Wholesale Only</option>
              </select>
            </div>
            <div className="flex items-end">
              <Button onClick={exportReportToPDF} disabled={filteredSales.length === 0}>
                Export PDF
              </Button>
            </div>
          </div>
        </Card>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="p-6">
            <div className="text-sm font-medium text-muted-foreground">Total Revenue</div>
            <div className="text-3xl font-bold text-primary mt-2">RS {totalRevenue.toFixed(2)}</div>
          </Card>
          <Card className="p-6">
            <div className="text-sm font-medium text-muted-foreground">Transactions</div>
            <div className="text-3xl font-bold text-primary mt-2">{totalTransactions}</div>
          </Card>
          <Card className="p-6">
            <div className="text-sm font-medium text-muted-foreground">Avg Transaction</div>
            <div className="text-3xl font-bold text-primary mt-2">RS {avgTransaction.toFixed(2)}</div>
          </Card>
          <Card className="p-6">
            <div className="text-sm font-medium text-muted-foreground">Retail / Wholesale</div>
            <div className="text-lg font-bold text-primary mt-2">
              {retailCount} / {wholesaleCount}
            </div>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          <Card className="col-span-1 lg:col-span-2 p-6">
            <h2 className="text-lg font-semibold mb-4">Daily Revenue</h2>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                  <XAxis stroke="var(--muted-foreground)" />
                  <YAxis stroke="var(--muted-foreground)" />
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
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={saleTypeData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {saleTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
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
                {filteredSales.slice(0, 10).map((sale) => (
                  <tr key={sale.id} className="border-b border-border hover:bg-muted">
                    <td className="py-3 px-2 text-xs">{sale.createdAt?.toDate?.()?.toLocaleDateString() || "N/A"}</td>
                    <td className="py-3 px-2">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${sale.type === "wholesale"
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
    </>
  )
}

export default function Reports() {
  return <ReportsContent />
}
