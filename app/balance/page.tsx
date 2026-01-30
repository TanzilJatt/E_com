"use client"

import { useState, useEffect } from "react"
import { Navbar } from "@/components/navbar"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { getItems, type Item } from "@/lib/items"
import { getPurchases, type Purchase } from "@/lib/purchases"
import { getSales, type Sale } from "@/lib/sales"
import { auth } from "@/lib/firebase"
import { onAuthStateChanged } from "firebase/auth"
import { useRouter } from "next/navigation"
import { ArrowLeft, TrendingUp, TrendingDown, DollarSign, Package } from "lucide-react"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

interface BalanceEntry {
  date: Date
  type: "purchase" | "sale"
  itemName: string
  sku: string
  quantityChange: number
  moneyFlow: number
  balance: number
  description: string
}

function BalanceContent() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [items, setItems] = useState<Item[]>([])
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [sales, setSales] = useState<Sale[]>([])
  const [balanceEntries, setBalanceEntries] = useState<BalanceEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")

  // Summary stats
  const [totalPurchases, setTotalPurchases] = useState(0)
  const [totalSales, setTotalSales] = useState(0)
  const [netFlow, setNetFlow] = useState(0)
  const [totalInventoryValue, setTotalInventoryValue] = useState(0)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid)
      } else {
        router.push("/login")
      }
    })

    return () => unsubscribe()
  }, [router])

  useEffect(() => {
    if (userId) {
      fetchData()
    }
  }, [userId])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // Fetch all data
      const [itemsData, purchasesData, salesData] = await Promise.all([
        getItems(userId || undefined),
        getPurchases(userId || ""),
        getSales(userId || ""),
      ])

      setItems(itemsData)
      setPurchases(purchasesData)
      setSales(salesData)

      // Calculate balance entries
      calculateBalanceEntries(itemsData, purchasesData, salesData)
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }

  const calculateBalanceEntries = (
    itemsData: Item[],
    purchasesData: Purchase[],
    salesData: Sale[]
  ) => {
    const entries: BalanceEntry[] = []
    let runningBalance = 0

    // Process purchases (money out, inventory in)
    purchasesData.forEach((purchase) => {
      purchase.items.forEach((item) => {
        const date = purchase.purchaseDate?.toDate?.() || new Date()
        const moneyFlow = -item.totalCost // Negative because money goes out
        runningBalance += moneyFlow

        entries.push({
          date,
          type: "purchase",
          itemName: item.itemName,
          sku: item.sku,
          quantityChange: item.quantity, // Positive (inventory increases)
          moneyFlow,
          balance: runningBalance,
          description: `Purchased ${item.quantity} units @ RS ${item.unitCost}`,
        })
      })
    })

    // Process sales (money in, inventory out)
    salesData.forEach((sale) => {
      sale.items.forEach((item) => {
        const date = sale.transactionDate?.toDate?.() || sale.createdAt?.toDate?.() || new Date()
        const moneyFlow = item.totalPrice // Positive because money comes in
        runningBalance += moneyFlow

        entries.push({
          date,
          type: "sale",
          itemName: item.itemName,
          sku: "N/A", // Sales might not have SKU in the data
          quantityChange: -item.quantity, // Negative (inventory decreases)
          moneyFlow,
          balance: runningBalance,
          description: `Sold ${item.quantity} units @ RS ${item.pricePerUnit}`,
        })
      })
    })

    // Sort by date (newest first)
    entries.sort((a, b) => b.date.getTime() - a.date.getTime())

    setBalanceEntries(entries)

    // Calculate summary
    const purchaseTotal = purchasesData.reduce((sum, p) => sum + p.totalAmount, 0)
    const salesTotal = salesData.reduce((sum, s) => sum + s.totalAmount, 0)
    const inventoryValue = itemsData.reduce((sum, i) => sum + i.price * i.quantity, 0)

    setTotalPurchases(purchaseTotal)
    setTotalSales(salesTotal)
    setNetFlow(salesTotal - purchaseTotal)
    setTotalInventoryValue(inventoryValue)
  }

  const filteredEntries = balanceEntries.filter((entry) => {
    const matchesSearch =
      entry.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.description.toLowerCase().includes(searchTerm.toLowerCase())

    const entryDate = entry.date
    const matchesDateRange =
      (!startDate || entryDate >= new Date(startDate)) &&
      (!endDate || entryDate <= new Date(endDate))

    return matchesSearch && matchesDateRange
  })

  const exportToPDF = () => {
    const doc = new jsPDF()

    // Title
    doc.setFontSize(18)
    doc.text("Balance Sheet Report", 14, 22)

    // Summary
    doc.setFontSize(12)
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 32)
    doc.text(`Total Purchases: RS ${totalPurchases.toFixed(2)}`, 14, 40)
    doc.text(`Total Sales: RS ${totalSales.toFixed(2)}`, 14, 48)
    doc.text(`Net Flow: RS ${netFlow.toFixed(2)}`, 14, 56)
    doc.text(`Inventory Value: RS ${totalInventoryValue.toFixed(2)}`, 14, 64)

    // Table
    const tableData = filteredEntries.map((entry) => [
      entry.date.toLocaleDateString(),
      entry.type.toUpperCase(),
      entry.itemName,
      entry.sku,
      entry.quantityChange > 0 ? `+${entry.quantityChange}` : entry.quantityChange,
      entry.moneyFlow > 0 ? `+RS ${entry.moneyFlow.toFixed(2)}` : `RS ${entry.moneyFlow.toFixed(2)}`,
      `RS ${entry.balance.toFixed(2)}`,
    ])

    autoTable(doc, {
      startY: 72,
      head: [["Date", "Type", "Item", "SKU", "Qty Change", "Money Flow", "Balance"]],
      body: tableData,
      theme: "grid",
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] },
    })

    doc.save(`balance-sheet-${new Date().toISOString().split("T")[0]}.pdf`)
  }

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">Loading balance sheet...</p>
          </Card>
        </main>
      </>
    )
  }

  return (
    <>
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => router.push("/items")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Items
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Balance Sheet</h1>
              <p className="text-muted-foreground mt-2">Track inventory movements and financial flows</p>
            </div>
          </div>
          <Button onClick={exportToPDF}>Export PDF</Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Purchases</p>
                <p className="text-2xl font-bold text-red-600">RS {totalPurchases.toFixed(2)}</p>
              </div>
              <TrendingDown className="h-8 w-8 text-red-600" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Sales</p>
                <p className="text-2xl font-bold text-green-600">RS {totalSales.toFixed(2)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Net Flow</p>
                <p className={`text-2xl font-bold ${netFlow >= 0 ? "text-green-600" : "text-red-600"}`}>
                  RS {netFlow.toFixed(2)}
                </p>
              </div>
              <DollarSign className="h-8 w-8" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Inventory Value</p>
                <p className="text-2xl font-bold text-blue-600">RS {totalInventoryValue.toFixed(2)}</p>
              </div>
              <Package className="h-8 w-8 text-blue-600" />
            </div>
          </Card>
        </div>

        {/* Filters */}
        <Card className="p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Search</label>
              <Input
                type="text"
                placeholder="Search by item, SKU, or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Start Date</label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">End Date</label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
        </Card>

        {/* Balance Entries Table */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-semibold text-sm">Date</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Type</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Item</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">SKU</th>
                  <th className="text-right py-3 px-4 font-semibold text-sm">Qty Change</th>
                  <th className="text-right py-3 px-4 font-semibold text-sm">Money Flow</th>
                  <th className="text-right py-3 px-4 font-semibold text-sm">Running Balance</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Description</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-muted-foreground">
                      No transactions found
                    </td>
                  </tr>
                ) : (
                  filteredEntries.map((entry, index) => (
                    <tr key={index} className="border-b border-border hover:bg-muted/30">
                      <td className="py-3 px-4 text-sm">
                        <div>{entry.date.toLocaleDateString()}</div>
                        <div className="text-xs text-muted-foreground">{entry.date.toLocaleTimeString()}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                            entry.type === "purchase"
                              ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
                              : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                          }`}
                        >
                          {entry.type.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-medium">{entry.itemName}</td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">{entry.sku}</td>
                      <td
                        className={`py-3 px-4 text-right font-semibold ${
                          entry.quantityChange > 0 ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {entry.quantityChange > 0 ? "+" : ""}
                        {entry.quantityChange}
                      </td>
                      <td
                        className={`py-3 px-4 text-right font-semibold ${
                          entry.moneyFlow > 0 ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {entry.moneyFlow > 0 ? "+" : ""}
                        RS {entry.moneyFlow.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold">RS {entry.balance.toFixed(2)}</td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">{entry.description}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </main>
    </>
  )
}

export default function BalancePage() {
  return <BalanceContent />
}
