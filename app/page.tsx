"use client"

import { useEffect, useState } from "react"
import { db } from "@/lib/firebase"
import { collection, getDocs, query, orderBy } from "firebase/firestore"
import { Navbar } from "@/components/navbar"
import { Card } from "@/components/ui/card"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts"
import Link from "next/link"
import { Button } from "@/components/ui/button"

function DashboardContent() {
  const [stats, setStats] = useState({
    totalItems: 0,
    totalSales: 0,
    totalRevenue: 0,
    retailSales: 0,
    wholesaleSales: 0,
  })
  const [recentSales, setRecentSales] = useState<any[]>([])
  const [chartData, setChartData] = useState<any[]>([])

  useEffect(() => {
    const fetchData = async () => {
      try {
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

        setRecentSales(sales.slice(0, 5))

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
            <div className="text-3xl font-bold text-primary mt-2">${stats.totalRevenue.toFixed(2)}</div>
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
          <Card className="col-span-1 lg:col-span-2 p-6">
            <h2 className="text-lg font-semibold mb-4">Recent Sales</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-2">Transaction ID</th>
                    <th className="text-left py-2 px-2">Type</th>
                    <th className="text-left py-2 px-2">Items</th>
                    <th className="text-right py-2 px-2">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {recentSales.map((sale) => (
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
                      <td className="py-2 px-2">{sale.items?.length || 0}</td>
                      <td className="py-2 px-2 text-right font-semibold">${(sale.totalAmount || 0).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

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
              <Link href="/logs" className="block">
                <Button className="w-full justify-start bg-transparent" variant="outline">
                  <span className="mr-2">📝</span> Activity Logs
                </Button>
              </Link>
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
