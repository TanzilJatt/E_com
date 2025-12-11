"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { auth } from "@/lib/firebase"
import { Timestamp } from "firebase/firestore"
import { Navbar } from "@/components/navbar"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  addExpense,
  updateExpense,
  deleteExpense,
  getExpenses,
  getTotalExpenses,
  getTotalExpensesByCategory,
  type Expense,
} from "@/lib/expenses"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import { DateFilter, type DatePreset } from "@/components/date-filter"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

const EXPENSE_CATEGORIES = ["Rent", "Utilities", "Supplies", "Marketing", "Salaries", "Shipping", "Equipment", "Other"]
const COLORS = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#14b8a6", "#64748b"]

function ExpensesContent() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [allExpenses, setAllExpenses] = useState<Expense[]>([])
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("All")
  const [totalExpenses, setTotalExpenses] = useState(0)
  const [categoryBreakdown, setCategoryBreakdown] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [dateFilter, setDateFilter] = useState<{ start: Date | null; end: Date | null }>({ start: null, end: null })
  const [formData, setFormData] = useState({
    name: "",
    category: "Other",
    amount: 0,
    description: "",
    date: new Date().toISOString().split("T")[0],
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const userId = auth?.currentUser?.uid
      if (!userId) {
        setError("Please log in to view expenses")
        setLoading(false)
        return
      }
      
      const expensesList = await getExpenses(userId)
      setAllExpenses(expensesList)
      setExpenses(expensesList)

      const total = await getTotalExpenses(userId)
      setTotalExpenses(total)

      const breakdown = await getTotalExpensesByCategory(userId)
      setCategoryBreakdown(breakdown)

      setError("")
    } catch (err: any) {
      console.error("Error fetching data:", err)
      setError("Failed to load expenses")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsSubmitting(true)

    try {
      if (!formData.name || formData.amount <= 0) {
        setError("Please fill in all required fields")
        setIsSubmitting(false)
        return
      }

      const expenseData = {
        name: formData.name,
        category: formData.category,
        amount: Number.parseFloat(formData.amount.toString()),
        description: formData.description,
        date: Timestamp.fromDate(new Date(formData.date)),
      }

      if (editingId) {
        await updateExpense(editingId, expenseData, auth?.currentUser?.uid || "system", auth?.currentUser?.displayName || "System")
      } else {
        await addExpense(expenseData, auth?.currentUser?.uid || "system", auth?.currentUser?.displayName || "System")
      }

      setFormData({
        name: "",
        category: "Other",
        amount: 0,
        description: "",
        date: new Date().toISOString().split("T")[0],
      })
      setEditingId(null)
      setIsAdding(false)
      await fetchData()
    } catch (err: any) {
      setError(err.message || "Failed to save expense")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (expense: Expense) => {
    setFormData({
      name: expense.name,
      category: expense.category,
      amount: expense.amount,
      description: expense.description,
      date: expense.date?.toDate?.().toISOString().split("T")[0] || "",
    })
    setEditingId(expense.id)
    setIsAdding(true)
    setError("")
  }

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm("Are you sure you want to delete this expense?")) {
      try {
        await deleteExpense(id, auth?.currentUser?.uid || "system", auth?.currentUser?.displayName || "System", name)
        await fetchData()
      } catch (err: any) {
        setError("Failed to delete expense")
      }
    }
  }

  const handleDateFilter = (startDate: Date | null, endDate: Date | null, preset: DatePreset) => {
    setDateFilter({ start: startDate, end: endDate })
    
    if (!startDate || !endDate) {
      setExpenses(allExpenses)
      return
    }

    const filtered = allExpenses.filter((expense) => {
      const expenseDate = expense.createdAt?.toDate?.()
      if (!expenseDate) return false
      return expenseDate >= startDate && expenseDate <= endDate
    })
    
    setExpenses(filtered)
  }

  const filteredExpenses = expenses.filter((expense) => {
    const matchesSearch =
      expense.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === "All" || expense.category === selectedCategory

    return matchesSearch && matchesCategory
  })

  const exportExpensesToPDF = () => {
    const doc = new jsPDF()
    
    // Add title
    doc.setFontSize(18)
    doc.text("Expenses Report", 14, 22)
    
    // Add date range and filters
    doc.setFontSize(10)
    if (dateFilter.start && dateFilter.end) {
      doc.text(
        `Date Range: ${dateFilter.start.toLocaleDateString()} - ${dateFilter.end.toLocaleDateString()}`,
        14,
        30
      )
    } else {
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30)
    }
    
    // Add filter info
    let filterInfo = []
    if (selectedCategory !== "All") filterInfo.push(`Category: ${selectedCategory}`)
    if (searchTerm) filterInfo.push(`Search: "${searchTerm}"`)
    if (filterInfo.length > 0) {
      doc.text(`Filters: ${filterInfo.join(", ")}`, 14, dateFilter.start && dateFilter.end ? 36 : 36)
    }
    
    // Prepare table data
    const tableData = filteredExpenses.map((expense) => {
      const date = expense.date?.toDate 
        ? new Date(expense.date.toDate()).toLocaleDateString()
        : new Date(expense.date).toLocaleDateString()
      
      return [
        date,
        expense.name,
        expense.category,
        expense.description || "-",
        `RS ${expense.amount.toFixed(2)}`
      ]
    })
    
    // Add table
    const startY = filterInfo.length > 0 ? 42 : (dateFilter.start && dateFilter.end ? 36 : 36)
    autoTable(doc, {
      startY,
      head: [["Date", "Name", "Category", "Description", "Amount"]],
      body: tableData,
      theme: "grid",
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [59, 130, 246], textColor: 255 },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 35 },
        2: { cellWidth: 30 },
        3: { cellWidth: 60 },
        4: { cellWidth: 25 }
      }
    })
    
    // Add summary with category breakdown
    const finalY = (doc as any).lastAutoTable.finalY || startY
    doc.setFontSize(12)
    doc.text(`Total Expenses: ${filteredExpenses.length}`, 14, finalY + 10)
    const totalAmount = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0)
    doc.text(`Total Amount: RS ${totalAmount.toFixed(2)}`, 14, finalY + 18)
    
    // Add category breakdown
    doc.setFontSize(10)
    doc.text("Category Breakdown:", 14, finalY + 28)
    const categoryTotals: Record<string, number> = {}
    filteredExpenses.forEach((expense) => {
      categoryTotals[expense.category] = (categoryTotals[expense.category] || 0) + expense.amount
    })
    
    let yPos = finalY + 34
    Object.entries(categoryTotals).forEach(([category, amount]) => {
      doc.text(`${category}: RS ${amount.toFixed(2)}`, 20, yPos)
      yPos += 6
    })
    
    // Save PDF
    const fileName = `expenses-report-${new Date().toISOString().split("T")[0]}.pdf`
    doc.save(fileName)
  }

  const chartData = EXPENSE_CATEGORIES.map((cat) => ({
    name: cat,
    value: categoryBreakdown[cat] || 0,
  })).filter((item) => item.value > 0)

  return (
    <>
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Expenses</h1>
            <p className="text-muted-foreground mt-2">Track and manage your business expenses</p>
          </div>
          <Button onClick={() => setIsAdding(!isAdding)}>{isAdding ? "Cancel" : "+ Add Expense"}</Button>
        </div>

        {/* Date Filter */}
        <DateFilter onFilter={handleDateFilter} />

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <Card className="p-6">
            <div className="text-sm font-medium text-muted-foreground">Total Expenses</div>
            <div className="text-3xl font-bold text-primary mt-2">RS {totalExpenses.toFixed(2)}</div>
          </Card>
          <Card className="p-6">
            <div className="text-sm font-medium text-muted-foreground">Total Transactions</div>
            <div className="text-3xl font-bold text-primary mt-2">{expenses.length}</div>
          </Card>
          <Card className="p-6">
            <div className="text-sm font-medium text-muted-foreground">Categories</div>
            <div className="text-3xl font-bold text-primary mt-2">{Object.keys(categoryBreakdown).length}</div>
          </Card>
        </div>

        {isAdding && (
          <Card className="p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">{editingId ? "Edit Expense" : "Add New Expense"}</h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Expense Name *</label>
                <Input
                  type="text"
                  placeholder={formData.name ? "" : "e.g., Office Rent"}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Category *</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full border border-input rounded-lg p-2 bg-background text-foreground"
                  required
                >
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Amount (RS) *</label>
                <Input
                  type="number"
                  placeholder={formData.amount > 0 ? "" : "0.00"}
                  step="0.01"
                  min="0"
                  value={formData.amount || ""}
                  onChange={(e) => setFormData({ ...formData, amount: Number.parseFloat(e.target.value) || 0 })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Date *</label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  placeholder={formData.description ? "" : "Additional notes..."}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full border border-input rounded-lg p-2 bg-background text-foreground"
                  rows={3}
                />
              </div>
              {error && <div className="md:col-span-2 text-red-600 text-sm font-medium">{error}</div>}
              <div className="md:col-span-2 flex gap-2">
                <Button type="submit" className="flex-1" disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : editingId ? "Update Expense" : "Add Expense"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setFormData({
                      name: "",
                      category: "Other",
                      amount: 0,
                      description: "",
                      date: new Date().toISOString().split("T")[0],
                    })
                    setEditingId(null)
                    setIsAdding(false)
                    setError("")
                  }}
                  className="flex-1"
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {chartData.length > 0 && (
            <>
              <Card className="p-6">
                <h2 className="text-lg font-semibold mb-4">Expenses by Category</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                    <XAxis dataKey="name" stroke="var(--muted-foreground)" angle={-45} textAnchor="end" height={80} />
                    <YAxis stroke="var(--muted-foreground)" />
                    <Tooltip />
                    <Bar dataKey="value" fill="var(--primary)" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>

              <Card className="p-6">
                <h2 className="text-lg font-semibold mb-4">Distribution</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: RS ${value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Card>
            </>
          )}
        </div>

        {/* Filters */}
        <div className="flex gap-4 mb-6 flex-wrap items-center">
          <Input
            type="text"
            placeholder="Search by name or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md"
          />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="border border-input rounded-lg p-2 bg-background text-foreground"
          >
            <option value="All">All Categories</option>
            {EXPENSE_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
          <Button onClick={exportExpensesToPDF} disabled={filteredExpenses.length === 0}>
            Export PDF
          </Button>
        </div>

        {/* Expenses List */}
        {loading ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">Loading expenses...</p>
          </Card>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4">Expense</th>
                    <th className="text-left py-3 px-4">Category</th>
                    <th className="text-left py-3 px-4">Date & Time</th>
                    <th className="text-right py-3 px-4">Amount</th>
                    <th className="text-left py-3 px-4">Description</th>
                    <th className="text-center py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExpenses.map((expense) => (
                    <tr key={expense.id} className="border-b border-border hover:bg-muted">
                      <td className="py-3 px-4 font-medium">{expense.name}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                          {expense.category}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-xs text-muted-foreground">
                          <div>{expense.date?.toDate?.().toLocaleDateString() || "N/A"}</div>
                          <div className="text-[10px]">{expense.createdAt?.toDate?.()?.toLocaleTimeString() || ""}</div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-semibold">RS {expense.amount.toFixed(2)}</td>
                      <td className="py-3 px-4 text-xs text-muted-foreground line-clamp-1">{expense.description}</td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex gap-1 justify-center">
                          <Button size="sm" variant="outline" onClick={() => handleEdit(expense)}>
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 bg-transparent"
                            onClick={() => handleDelete(expense.id, expense.name)}
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredExpenses.length === 0 && (
              <Card className="p-12 text-center">
                <p className="text-muted-foreground">
                  {expenses.length === 0
                    ? "No expenses recorded yet. Start by adding your first expense!"
                    : "No expenses match your filters."}
                </p>
              </Card>
            )}
          </>
        )}
      </main>
    </>
  )
}

export default function Expenses() {
  return <ExpensesContent />
}
