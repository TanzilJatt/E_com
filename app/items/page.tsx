"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { db, auth } from "@/lib/firebase"
import { collection, getDocs } from "firebase/firestore"
import { onAuthStateChanged } from "firebase/auth"
import { Navbar } from "@/components/navbar"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { addItem, updateItem, deleteItem, type Item } from "@/lib/items"
import { DateFilter, type DatePreset } from "@/components/date-filter"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

function ItemsContent() {
  const [items, setItems] = useState<Item[]>([])
  const [allItems, setAllItems] = useState<Item[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    price: 0,
    quantity: 0,
    description: "",
    vendor: "",
  })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [dateFilter, setDateFilter] = useState<{ start: Date | null; end: Date | null }>({ start: null, end: null })

  // Listen for auth state changes
  useEffect(() => {
    if (!auth) {
      setAuthReady(true)
      return
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUserId(user.uid)
        setAuthReady(true)
      } else {
        setCurrentUserId(null)
        setAuthReady(true)
      }
    })

    return () => unsubscribe()
  }, [])

  // Fetch items when auth is ready and user is logged in
  useEffect(() => {
    if (authReady && currentUserId) {
      fetchItems()
    }
  }, [authReady, currentUserId])

  const fetchItems = async () => {
    try {
      setLoading(true)
      if (!db || !currentUserId) {
        setLoading(false)
        return
      }
      
      console.log("[v0] Fetching items from Firebase for user:", currentUserId)
      console.log("[v0] DB object:", db)
      
      // Import getItems function instead of direct query
      const { getItems } = await import("@/lib/items")
      const itemsList = await getItems(currentUserId)
      
      console.log("[v0] Fetched items:", itemsList.length)
      setAllItems(itemsList)
      setItems(itemsList)
      setError("")
    } catch (error) {
      console.error("Error fetching items:", error)
      setError("Failed to load items")
    } finally {
      setLoading(false)
    }
  }

  const handleDateFilter = (startDate: Date | null, endDate: Date | null, preset: DatePreset) => {
    setDateFilter({ start: startDate, end: endDate })
    
    if (!startDate || !endDate) {
      setItems(allItems)
      return
    }

    const filtered = allItems.filter((item) => {
      const itemDate = item.createdAt?.toDate?.()
      if (!itemDate) return false
      return itemDate >= startDate && itemDate <= endDate
    })
    
    setItems(filtered)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsSubmitting(true)

    try {
      if (!formData.name || formData.price < 0 || formData.quantity < 0) {
        setError("Please fill in all required fields (Name, Price, Quantity)")
        setIsSubmitting(false)
        return
      }


      if (editingId) {
        await updateItem(editingId, formData, auth?.currentUser?.uid || "system")
      } else {
        await addItem(formData, auth?.currentUser?.uid || "system", auth?.currentUser?.displayName || "System")
      }

      setFormData({ name: "", price: 0, quantity: 0, description: "", vendor: "" })
      setEditingId(null)
      setIsAdding(false)
      setError("")
      await fetchItems()
    } catch (err: any) {
      console.error("[v0] Error:", err.message)
        setError(err.message || "Failed to save item")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (item: Item) => {
    setFormData({
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      description: item.description,
      vendor: item.vendor || "",
    })
    setEditingId(item.id)
    setIsAdding(true)
    setError("")
  }

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this item?")) {
      try {
        await deleteItem(id)
        await fetchItems()
      } catch (error) {
        console.error("Error deleting item:", error)
        setError("Failed to delete item")
      }
    }
  }

  const exportItemsToPDF = () => {
    const doc = new jsPDF()
    
    // Add title
    doc.setFontSize(18)
    doc.text("Inventory Report", 14, 22)
    
    // Add date and filter info
    doc.setFontSize(10)
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30)
    
    if (dateFilter.start && dateFilter.end) {
      doc.text(
        `Date Range: ${dateFilter.start.toLocaleDateString()} - ${dateFilter.end.toLocaleDateString()}`,
        14,
        36
      )
    }
    
    if (searchTerm) {
      doc.text(`Search: "${searchTerm}"`, 14, dateFilter.start && dateFilter.end ? 42 : 36)
    }
    
    // Prepare table data
    const tableData = filteredItems.map((item) => {
      const createdDate = item.createdAt?.toDate?.()
        ? new Date(item.createdAt.toDate()).toLocaleDateString()
        : "N/A"
      
      return [
        item.sku,
        item.name,
        item.vendor || "-",
        item.description || "-",
        `RS ${item.price.toFixed(2)}`,
        item.quantity.toString(),
        `RS ${(item.price * item.quantity).toFixed(2)}`
      ]
    })
    
    // Add table
    const startY = searchTerm ? (dateFilter.start && dateFilter.end ? 48 : 42) : (dateFilter.start && dateFilter.end ? 42 : 36)
    autoTable(doc, {
      startY,
      head: [["SKU", "Item Name", "Vendor", "Description", "Price", "Quantity", "Total Value"]],
      body: tableData,
      theme: "grid",
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [59, 130, 246], textColor: 255 },
      columnStyles: {
        0: { cellWidth: 22 },
        1: { cellWidth: 30 },
        2: { cellWidth: 25 },
        3: { cellWidth: 40 },
        4: { cellWidth: 20 },
        5: { cellWidth: 18 },
        6: { cellWidth: 25 }
      }
    })
    
    // Add summary
    const finalY = (doc as any).lastAutoTable.finalY || startY
    doc.setFontSize(12)
    doc.text(`Total Items: ${filteredItems.length}`, 14, finalY + 10)
    const totalQuantity = filteredItems.reduce((sum, item) => sum + item.quantity, 0)
    doc.text(`Total Quantity: ${totalQuantity} units`, 14, finalY + 18)
    const totalValue = filteredItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    doc.text(`Total Inventory Value: RS ${totalValue.toFixed(2)}`, 14, finalY + 26)
    
    // Save PDF
    const fileName = `inventory-report-${new Date().toISOString().split("T")[0]}.pdf`
    doc.save(fileName)
  }

  const filteredItems = items.filter(
    (item) =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.vendor && item.vendor.toLowerCase().includes(searchTerm.toLowerCase())),
  )

  return (
    <>
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Inventory Items</h1>
            <p className="text-muted-foreground mt-2">Manage your product catalog</p>
          </div>
          <Button onClick={() => setIsAdding(!isAdding)}>{isAdding ? "Cancel" : "+ Add Item"}</Button>
        </div>

        {isAdding && (
          <Card className="p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">{editingId ? "Edit Item" : "Add New Item"}</h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Item Name <span className="text-red-500">*</span></label>
                <Input
                  type="text"
                  placeholder={formData.name ? "" : "Product name "}
                  value={formData.name}
                  onChange={(e) => {
                    const value = e.target.value
                    // Only allow letters, numbers, and spaces, max 30 characters
                    if (value.length <= 30 && /^[a-zA-Z0-9\s]*$/.test(value)) {
                      setFormData({ ...formData, name: value })
                    }
                  }}
                  required
                />
                {/* <p className="text-xs text-muted-foreground mt-1">
                  {formData.name.length}/30 characters (letters, numbers, and spaces only)
                </p> */}
              </div>
              {editingId && (
              <div>
                  <label className="block text-sm font-medium mb-1">SKU</label>
                  <div className="px-3 py-2 bg-muted text-muted-foreground rounded-lg border-2 border-border/60">
                    {items.find(i => i.id === editingId)?.sku || "Auto-generated"}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">SKU is auto-generated and cannot be changed</p>
              </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-1">Price (RS) *</label>
                <Input
                  type="number"
                  placeholder={formData.price > 0 ? "" : "0.00"}
                  step="0.01"
                  min="0"
                  value={formData.price || ""}
                  onChange={(e) => setFormData({ ...formData, price: Number.parseFloat(e.target.value) || 0 })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Quantity *</label>
                <Input
                  type="number"
                  placeholder={formData.quantity > 0 ? "" : "0"}
                  min="0"
                  value={formData.quantity || ""}
                  onChange={(e) => setFormData({ ...formData, quantity: Number.parseInt(e.target.value) || 0 })}
                  required
                />
              </div>
              <div >
                <label className="block text-sm font-medium mb-1">Vendor Name <span className="text-red-500">*</span></label>
                <Input
                  type="text"
                  placeholder={formData.vendor ? "" : "Vendor name "}
                  value={formData.vendor}
                  onChange={(e) => {
                    const value = e.target.value
                    // Only allow letters, numbers, and spaces, max 30 characters
                    if (value.length <= 30 && /^[a-zA-Z0-9\s]*$/.test(value)) {
                      setFormData({ ...formData, vendor: value })
                    }
                  }}
                />
                {/* <p className="text-xs text-muted-foreground mt-1">
                  {formData.vendor.length}/30 characters (letters, numbers, and spaces only)
                </p> */}
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Description </label>
                <textarea
                  placeholder={formData.description ? "" : "Item description"}
                  value={formData.description}
                  onChange={(e) => {
                    const value = e.target.value
                    // Allow letters, numbers, spaces, and common punctuation, max 100 characters
                    if (value.length <= 100) {
                      setFormData({ ...formData, description: value })
                    }
                  }}
                  className="w-full border border-input rounded-lg p-2 bg-background text-foreground"
                  rows={3}
                />
                {/* <p className="text-xs text-muted-foreground mt-1">
                  {formData.description.length}/100 characters
                </p> */}
              </div>
              {error && <div className="md:col-span-2 text-red-600 text-sm font-medium">{error}</div>}
             
              <div className="md:col-span-2 flex gap-2">
                <Button type="submit" className="flex-1" disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : editingId ? "Update Item" : "Add Item"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setFormData({ name: "", price: 0, quantity: 0, description: "", vendor: "" })
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

        {/* Date Filter */}
        <DateFilter onFilter={handleDateFilter} />

        {/* Search */}
        <div className="mb-6 flex gap-4 items-center">
          <Input
            type="text"
            placeholder="Search by name, SKU, or vendor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md"
          />
          <Button onClick={exportItemsToPDF} disabled={filteredItems.length === 0}>
            Export PDF
          </Button>
        </div>

        {/* Items Table */}
        {loading ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">Loading items...</p>
          </Card>
        ) : filteredItems.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">
              {items.length === 0
                ? "No items found. Start by adding your first item!"
                : "No items match your search."}
            </p>
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-semibold text-sm">SKU</th>
                    <th className="text-left py-3 px-4 font-semibold text-sm">Item Name</th>
                    <th className="text-left py-3 px-4 font-semibold text-sm">Vendor</th>
                    <th className="text-left py-3 px-4 font-semibold text-sm">Description</th>
                    <th className="text-right py-3 px-4 font-semibold text-sm">Price</th>
                    <th className="text-right py-3 px-4 font-semibold text-sm">Quantity</th>
                    <th className="text-right py-3 px-4 font-semibold text-sm">Total Value</th>
                    <th className="text-left py-3 px-4 font-semibold text-sm">Created</th>
                    <th className="text-left py-3 px-4 font-semibold text-sm">Last Updated</th>
                    <th className="text-center py-3 px-4 font-semibold text-sm">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item, index) => (
                    <tr 
                      key={item.id} 
                      className={`border-b border-border hover:bg-muted/30 transition-colors ${
                        index % 2 === 0 ? 'bg-background' : 'bg-muted/10'
                      }`}
                    >
                      <td className="py-3 px-4">
                        <span className="font-mono text-sm font-medium">{item.sku}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-medium">{item.name}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-muted-foreground">
                          {item.vendor || "—"}
                        </span>
                      </td>
                      <td className="py-3 px-4 max-w-xs">
                        <span className="text-sm text-muted-foreground line-clamp-2">
                          {item.description || "No description"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="font-semibold">RS {item.price.toFixed(2)}</span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className={item.quantity < 10 ? "text-red-600 font-semibold" : ""}>
                          {item.quantity}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="font-semibold text-primary">
                          RS {(item.price * item.quantity).toFixed(2)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-xs text-muted-foreground">
                          <div>{item.createdAt?.toDate?.()?.toLocaleDateString() || "N/A"}</div>
                          <div className="text-[10px]">{item.createdAt?.toDate?.()?.toLocaleTimeString() || ""}</div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-xs text-muted-foreground">
                          <div>{item.updatedAt?.toDate?.()?.toLocaleDateString() || "N/A"}</div>
                          <div className="text-[10px]">{item.updatedAt?.toDate?.()?.toLocaleTimeString() || ""}</div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2 justify-center">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => handleEdit(item)}
                            className="h-8"
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:bg-red-50 dark:hover:bg-red-950 h-8"
                            onClick={() => handleDelete(item.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-muted/30 border-t-2 border-border">
                  <tr>
                    <td colSpan={4} className="py-3 px-4 font-semibold">
                      Total ({filteredItems.length} items)
                    </td>
                    <td className="py-3 px-4 text-right font-semibold">
                      RS {filteredItems.reduce((sum, item) => sum + item.price, 0).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold">
                      {filteredItems.reduce((sum, item) => sum + item.quantity, 0)} units
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-primary text-lg">
                      RS {filteredItems.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2)}
                    </td>
                    <td colSpan={3}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>
        )}
      </main>
    </>
  )
}

export default function Items() {
  return <ItemsContent />
}
