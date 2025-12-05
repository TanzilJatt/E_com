"use client"

import { useEffect, useState } from "react"
import { db } from "@/lib/firebase"
import { collection, getDocs, query, orderBy } from "firebase/firestore"
import { Navbar } from "@/components/navbar"
import { Card } from "@/components/ui/card"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { DateFilter, type DatePreset } from "@/components/date-filter"
import { Input } from "@/components/ui/input"

function DashboardContent() {
  const [stats, setStats] = useState({
    totalItems: 0,
    totalSales: 0,
    totalRevenue: 0,
    retailSales: 0,
    wholesaleSales: 0,
  })
  const [allSales, setAllSales] = useState<any[]>([])
  const [recentSales, setRecentSales] = useState<any[]>([])
  const [filteredSales, setFilteredSales] = useState<any[]>([])
  const [chartData, setChartData] = useState<any[]>([])
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState("")
  const [saleTypeFilter, setSaleTypeFilter] = useState<"all" | "retail" | "wholesale">("all")
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<"all" | "cash" | "credit" | "both">("all")
  const [dateFilter, setDateFilter] = useState<{ start: Date | null; end: Date | null }>({ start: null, end: null })

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!db) {
          console.error("Database is not available. Please check your Firebase configuration.")
          return
        }
        // Get items
        const itemsSnapshot = await getDocs(collection(db, "items"))
        const items = itemsSnapshot.docs.map((d) => d.data())

        // Get sales
        const salesSnapshot = await getDocs(query(collection(db, "sales"), orderBy("createdAt", "desc")))
        const sales = salesSnapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }))

        // Calculate stats
        const totalRevenue = sales.reduce((sum, sale) => sum + (sale.totalAmount || 0), 0)
        const retailCount = sales.filter((s) => s.type === "retail").length
        const wholesaleCount = sales.filter((s) => s.type === "wholesale").length

        setStats({
          totalItems: items.length,
          totalSales: sales.length,
          totalRevenue,
          retailSales: retailCount,
          wholesaleSales: wholesaleCount,
        })

        setAllSales(sales)
        setRecentSales(sales.slice(0, 10))
        setFilteredSales(sales.slice(0, 10))

        // Create chart data
        const last7Days = Array.from({ length: 7 }, (_, i) => {
          const date = new Date()
          date.setDate(date.getDate() - i)
          return date.toISOString().split("T")[0]
        }).reverse()

        const chartData = last7Days.map((date) => {
          const daySales = sales.filter((s) => s.createdAt?.toDate?.()?.toISOString().split("T")[0] === date)
          return {
            date: new Date(date).toLocaleDateString("en-US", { weekday: "short" }),
            revenue: daySales.reduce((sum, s) => sum + (s.totalAmount || 0), 0),
            count: daySales.length,
          }
        })

        setChartData(chartData)
      } catch (error) {
        console.error("Error fetching dashboard data:", error)
      }
    }

    fetchData()
  }, [])

  // Apply filters to recent sales
  useEffect(() => {
    let filtered = [...recentSales]

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter((sale) =>
        sale.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sale.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sale.items?.some((item: any) => item.itemName?.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    // Sale type filter
    if (saleTypeFilter !== "all") {
      filtered = filtered.filter((sale) => sale.type === saleTypeFilter)
    }

    // Payment method filter
    if (paymentMethodFilter !== "all") {
      filtered = filtered.filter((sale) => {
        if (!sale.paymentMethod) return false
        
        if (paymentMethodFilter === "both") {
          return sale.paymentMethod.cash && sale.paymentMethod.credit
        } else if (paymentMethodFilter === "cash") {
          return sale.paymentMethod.cash && !sale.paymentMethod.credit
        } else if (paymentMethodFilter === "credit") {
          return sale.paymentMethod.credit && !sale.paymentMethod.cash
        }
        return true
      })
    }

    // Date filter
    if (dateFilter.start && dateFilter.end) {
      filtered = filtered.filter((sale) => {
        const saleDate = sale.transactionDate?.toDate ? sale.transactionDate.toDate() : new Date(sale.transactionDate)
        return saleDate >= dateFilter.start! && saleDate <= dateFilter.end!
      })
    }

    setFilteredSales(filtered)
  }, [recentSales, searchTerm, saleTypeFilter, paymentMethodFilter, dateFilter])

  const handleDateFilter = (start: Date | null, end: Date | null, preset: DatePreset) => {
    setDateFilter({ start, end })
  }

  return (
    <>
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-2">Welcome back! Here's your inventory overview.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <Card className="p-6">
            <div className="text-sm font-medium text-muted-foreground">Total Items</div>
            <div className="text-3xl font-bold text-primary mt-2">{stats.totalItems}</div>
          </Card>
          <Card className="p-6">
            <div className="text-sm font-medium text-muted-foreground">Total Sales</div>
            <div className="text-3xl font-bold text-primary mt-2">{stats.totalSales}</div>
          </Card>
          <Card className="p-6">
            <div className="text-sm font-medium text-muted-foreground">Total Revenue</div>
            <div className="text-3xl font-bold text-primary mt-2">RS {stats.totalRevenue.toFixed(2)}</div>
          </Card>
          <Card className="p-6">
            <div className="text-sm font-medium text-muted-foreground">Retail Sales</div>
            <div className="text-3xl font-bold text-primary mt-2">{stats.retailSales}</div>
          </Card>
          <Card className="p-6">
            <div className="text-sm font-medium text-muted-foreground">Wholesale Sales</div>
            <div className="text-3xl font-bold text-primary mt-2">{stats.wholesaleSales}</div>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          <Card className="col-span-1 lg:col-span-2 p-6">
            <h2 className="text-lg font-semibold mb-4">Revenue Trend</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis stroke="var(--muted-foreground)" />
                <YAxis stroke="var(--muted-foreground)" />
                <Tooltip />
                <Line type="monotone" dataKey="revenue" stroke="var(--primary)" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Sales Distribution</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={[
                  { name: "Retail", value: stats.retailSales },
                  { name: "Wholesale", value: stats.wholesaleSales },
                ]}
              >
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis stroke="var(--muted-foreground)" />
                <YAxis stroke="var(--muted-foreground)" />
                <Tooltip />
                <Bar dataKey="value" fill="var(--primary)" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Recent Sales & Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="col-span-1 lg:col-span-2 space-y-6">
            {/* Filters */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Filter Recent Sales</h2>
              
              {/* Date Filter */}
              <div className="mb-4">
                <DateFilter onFilter={handleDateFilter} />
              </div>

              {/* Other Filters */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Search */}
                <div>
                  <label className="block text-sm font-medium mb-2">Search</label>
                  <Input
                    type="text"
                    placeholder="Search by ID or item..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                {/* Sale Type Filter */}
                <div>
                  <label className="block text-sm font-medium mb-2">Sale Type</label>
                  <select
                    value={saleTypeFilter}
                    onChange={(e) => setSaleTypeFilter(e.target.value as any)}
                    className="w-full border-2 border-border/60 hover:border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg p-2 bg-background text-foreground transition-colors outline-none"
                  >
                    <option value="all">All Types</option>
                    <option value="retail">Retail</option>
                    <option value="wholesale">Wholesale</option>
                  </select>
                </div>

                {/* Payment Method Filter */}
                <div>
                  <label className="block text-sm font-medium mb-2">Payment Method</label>
                  <select
                    value={paymentMethodFilter}
                    onChange={(e) => setPaymentMethodFilter(e.target.value as any)}
                    className="w-full border-2 border-border/60 hover:border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg p-2 bg-background text-foreground transition-colors outline-none"
                  >
                    <option value="all">All Methods</option>
                    <option value="cash">Cash Only</option>
                    <option value="credit">Credit Only</option>
                    <option value="both">Both (Cash + Credit)</option>
                  </select>
                </div>
              </div>

              {/* Filter Summary */}
              <div className="mt-4 text-sm text-muted-foreground">
                Showing {filteredSales.length} of {recentSales.length} sales
              </div>
            </Card>

            {/* Recent Sales Table */}
            <Card className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Recent Sales</h2>
                <Link href="/sales">
                  <Button variant="outline" size="sm">View All</Button>
                </Link>
              </div>
              {filteredSales.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No sales found matching filters</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 px-2">Transaction ID</th>
                        <th className="text-left py-2 px-2">Type</th>
                        <th className="text-left py-2 px-2">Payment</th>
                        <th className="text-left py-2 px-2">Items</th>
                        <th className="text-right py-2 px-2">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSales.map((sale) => (
                        <tr key={sale.id} className="border-b border-border hover:bg-muted">
                          <td className="py-2 px-2 font-mono text-xs">{sale.id.slice(0, 8)}...</td>
                          <td className="py-2 px-2">
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${sale.type === "wholesale"
                                  ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                                  : "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                                }`}
                            >
                              {sale.type}
                            </span>
                          </td>
                          <td className="py-2 px-2">
                            {sale.paymentMethod ? (
                              sale.paymentMethod.cash && sale.paymentMethod.credit ? (
                                <span className="text-xs text-purple-600 dark:text-purple-400">Both</span>
                              ) : sale.paymentMethod.cash ? (
                                <span className="text-xs text-green-600 dark:text-green-400">Cash</span>
                              ) : (
                                <span className="text-xs text-blue-600 dark:text-blue-400">Credit</span>
                              )
                            ) : (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className="py-2 px-2">{sale.items?.length || 0}</td>
                          <td className="py-2 px-2 text-right font-semibold">RS {(sale.totalAmount || 0).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>

          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
            <div className="space-y-2">
              <Link href="/items" className="block">
                <Button className="w-full justify-start bg-transparent" variant="outline">
                  <span className="mr-2">+</span> Add Item
                </Button>
              </Link>
              <Link href="/sales" className="block">
                <Button className="w-full justify-start bg-transparent" variant="outline">
                  <span className="mr-2">📊</span> Record Sale
                </Button>
              </Link>
              <Link href="/reports" className="block">
                <Button className="w-full justify-start bg-transparent" variant="outline">
                  <span className="mr-2">📈</span> View Reports
                </Button>
              </Link>
              {/* <Link href="/logs" className="block">
                <Button className="w-full justify-start bg-transparent" variant="outline">
                  <span className="mr-2">📝</span> Activity Logs
                </Button>
              </Link> */}
            </div>
          </Card>
        </div>
      </main>
    </>
  )
}

export default function Dashboard() {
  return <DashboardContent />
}
