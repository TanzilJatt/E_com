"use client"

import type React from "react"

import { useEffect, useState, useRef } from "react"
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
import * as XLSX from "xlsx"
import { toast } from "sonner"
import { FileSpreadsheet, Download, Upload, Info, Scale } from "lucide-react"
import { useRouter } from "next/navigation"

function ItemsContent() {
  const router = useRouter()
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
  const [isImporting, setIsImporting] = useState(false)
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0, errors: [] as string[] })
  const [showImportHelp, setShowImportHelp] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsImporting(true)
    setImportProgress({ current: 0, total: 0, errors: [] })

    try {
      // Read the Excel file
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data, { type: "array" })
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[]

      if (jsonData.length === 0) {
        setError("Excel file is empty")
        setIsImporting(false)
        return
      }

      // Fetch current items to check for duplicates
      const { getItems } = await import("@/lib/items")
      const currentItems = await getItems(currentUserId || undefined)

      setImportProgress({ current: 0, total: jsonData.length, errors: [] })
      const errors: string[] = []
      let successCount = 0
      let updatedCount = 0

      // Process each row
      for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i]
        const rowNum = i + 2 // Excel rows start at 1, plus 1 for header

        try {
          // Validate required fields
          let name = row.name || row.Name || row.item_name || row["Item Name"] || ""
          const price = Number(row.price || row.Price || 0)
          const quantity = Number(row.quantity || row.Quantity || 0)
          const description = row.description || row.Description || ""
          const vendor = row.vendor || row.Vendor || ""

          if (!name) {
            errors.push(`Row ${rowNum}: Item name is required`)
            continue
          }

          if (price < 0) {
            errors.push(`Row ${rowNum}: Price must be positive`)
            continue
          }

          if (quantity < 0) {
            errors.push(`Row ${rowNum}: Quantity must be positive`)
            continue
          }

          if (name.length > 30) {
            errors.push(`Row ${rowNum}: Name must be 30 characters or less`)
            continue
          }

          if (vendor.length > 30) {
            errors.push(`Row ${rowNum}: Vendor name must be 30 characters or less`)
            continue
          }

          if (description.length > 100) {
            errors.push(`Row ${rowNum}: Description must be 100 characters or less`)
            continue
          }

          // Check if item with same name exists
          const trimmedName = name.trim()
          const existingItem = currentItems.find(
            (item) => item.name.toLowerCase() === trimmedName.toLowerCase()
          )

          if (existingItem) {
            // Item exists - check if price matches
            if (existingItem.price === price) {
              // Same name and price - update quantity (add to existing)
              const newQuantity = existingItem.quantity + quantity
              await updateItem(
                existingItem.id,
                { quantity: newQuantity },
                auth?.currentUser?.uid || "system"
              )
              updatedCount++
              successCount++
              
              // Update the currentItems array for subsequent checks
              const itemIndex = currentItems.findIndex((item) => item.id === existingItem.id)
              if (itemIndex !== -1) {
                currentItems[itemIndex].quantity = newQuantity
              }
              
              setImportProgress({ current: i + 1, total: jsonData.length, errors })
              continue
            } else {
              // Same name but different price - create new item with suffix
              let suffix = 1
              let newName = `${trimmedName}_${suffix}`
              
              // Keep incrementing suffix until we find an unused name
              while (
                currentItems.some(
                  (item) => item.name.toLowerCase() === newName.toLowerCase()
                ) &&
                suffix < 100 // Safety limit
              ) {
                suffix++
                newName = `${trimmedName}_${suffix}`
              }
              
              if (suffix >= 100) {
                errors.push(`Row ${rowNum}: Too many items with name "${trimmedName}"`)
                continue
              }
              
              if (newName.length > 30) {
                errors.push(`Row ${rowNum}: Generated name "${newName}" exceeds 30 characters`)
                continue
              }
              
              name = newName
            }
          }

          // Add new item to database
          const itemId = await addItem(
            {
              name: name.trim(),
              price,
              quantity,
              description: description.trim(),
              vendor: vendor.trim(),
            },
            auth?.currentUser?.uid || "system",
            auth?.currentUser?.displayName || "System"
          )

          // Add to currentItems array for subsequent duplicate checks
          if (itemId) {
            currentItems.push({
              id: itemId,
              name: name.trim(),
              price,
              quantity,
              description: description.trim(),
              vendor: vendor.trim(),
              sku: "", // Will be generated by backend
              createdAt: null,
              createdBy: auth?.currentUser?.uid || "system",
              updatedAt: null,
              updatedBy: auth?.currentUser?.uid || "system",
            })
          }

          successCount++
          setImportProgress({ current: i + 1, total: jsonData.length, errors })
        } catch (err: any) {
          errors.push(`Row ${rowNum}: ${err.message || "Failed to add item"}`)
          setImportProgress({ current: i + 1, total: jsonData.length, errors })
        }
      }

      // Refresh items list
      await fetchItems()

      // Show summary
      const addedCount = successCount - updatedCount
      if (errors.length > 0) {
        setError(
          `Import completed: ${addedCount} added, ${updatedCount} updated, ${errors.length} failed. Check console for details.`
        )
        console.error("Import errors:", errors)
        toast.warning(`Import completed with some errors`, {
          description: `${addedCount} added, ${updatedCount} updated, ${errors.length} failed. Check error list for details.`,
        })
      } else {
        setError("")
        if (updatedCount > 0) {
          toast.success(`Successfully processed ${successCount} items!`, {
            description: `${addedCount} new items added, ${updatedCount} quantities updated.`,
          })
        } else {
          toast.success(`Successfully imported ${successCount} items!`, {
            description: "All items have been added to your inventory.",
          })
        }
      }
    } catch (err: any) {
      console.error("Error importing Excel:", err)
      setError(`Failed to import Excel file: ${err.message}`)
      toast.error("Import failed", {
        description: err.message || "An error occurred while importing the Excel file.",
      })
    } finally {
      setIsImporting(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const downloadExcelTemplate = () => {
    // Create a sample Excel template
    const templateData = [
      {
        name: "Sample Item",
        price: 100.00,
        quantity: 50,
        description: "This is a sample item description",
        vendor: "Sample Vendor",
      },
    ]

    const worksheet = XLSX.utils.json_to_sheet(templateData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Items")

    // Set column widths
    worksheet["!cols"] = [
      { wch: 30 }, // name
      { wch: 10 }, // price
      { wch: 10 }, // quantity
      { wch: 50 }, // description
      { wch: 30 }, // vendor
    ]

    XLSX.writeFile(workbook, "items-import-template.xlsx")
    toast.success("Template downloaded!", {
      description: "Fill in your items data and import the Excel file.",
    })
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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Header - Mobile Responsive */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Inventory Items</h1>
            <p className="text-muted-foreground mt-1 sm:mt-2 text-sm sm:text-base">Manage your product catalog</p>
          </div>
          
          {/* Action Buttons - Mobile Responsive */}
          <div className="flex flex-wrap gap-2">
            <Button 
              variant="outline" 
              onClick={() => router.push("/balance")} 
              className="gap-2 flex-1 sm:flex-initial"
            >
              <Scale className="h-4 w-4" />
              <span className="hidden sm:inline">Balance Sheet</span>
              <span className="sm:hidden">Balance</span>
            </Button>
            <Button 
              variant="outline" 
              onClick={downloadExcelTemplate} 
              className="gap-2 flex-1 sm:flex-initial"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Download Template</span>
              <span className="sm:hidden">Download</span>
            </Button>
            <Button 
              variant="outline" 
              onClick={() => fileInputRef.current?.click()} 
              disabled={isImporting} 
              className="gap-2 flex-1 sm:flex-initial"
            >
              <Upload className="h-4 w-4" />
              <span className="hidden sm:inline">{isImporting ? "Importing..." : "Import Excel"}</span>
              <span className="sm:hidden">{isImporting ? "Importing..." : "Import"}</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowImportHelp(!showImportHelp)}
              title="Import Help"
              className="flex-shrink-0"
            >
              <Info className="h-4 w-4" />
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleImportExcel}
              style={{ display: "none" }}
            />
            <Button 
              onClick={() => setIsAdding(!isAdding)} 
              className="w-full sm:w-auto"
            >
              {isAdding ? "Cancel" : "+ Add Item"}
            </Button>
          </div>
        </div>

        {/* Import Help - Mobile Responsive */}
        {showImportHelp && (
          <Card className="p-4 sm:p-6 mb-6 sm:mb-8 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-lg sm:text-xl font-semibold flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5" />
                <span className="hidden sm:inline">How to Import Items from Excel</span>
                <span className="sm:hidden">Import Guide</span>
              </h2>
              <Button variant="ghost" size="sm" onClick={() => setShowImportHelp(false)}>
                ✕
              </Button>
            </div>
            <div className="space-y-4 text-sm">
              <div>
                <h3 className="font-semibold mb-2">Step 1: Download Template</h3>
                <p className="text-muted-foreground">
                  Click "Download Template" to get a sample Excel file with the correct format.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Step 2: Fill Your Data</h3>
                <p className="text-muted-foreground mb-2">Your Excel file must have these columns:</p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
                  <li><strong>name</strong> (required, max 30 chars) - Item name</li>
                  <li><strong>price</strong> (required, positive number) - Item price</li>
                  <li><strong>quantity</strong> (required, positive number) - Stock quantity</li>
                  <li><strong>description</strong> (optional, max 100 chars) - Item description</li>
                  <li><strong>vendor</strong> (optional, max 30 chars) - Vendor name</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Step 3: Import Your File</h3>
                <p className="text-muted-foreground">
                  Click "Import Excel" and select your file. The system will validate each row and import valid items.
                </p>
              </div>
              <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 p-3 rounded-lg">
                <p className="font-semibold mb-1">💡 Tips:</p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2 text-xs">
                  <li>SKU is auto-generated - don't include it in your Excel</li>
                  <li>Only use letters, numbers, and spaces in name and vendor fields</li>
                  <li>Test with a small file first (3-5 items)</li>
                  <li>Check the error list if some items fail to import</li>
                </ul>
              </div>
              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 p-3 rounded-lg">
                <p className="font-semibold mb-1">🔄 Duplicate Handling:</p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2 text-xs">
                  <li><strong>Same name + same price:</strong> Quantity is added to existing item</li>
                  <li><strong>Same name + different price:</strong> New item created as "name_1", "name_2", etc.</li>
                  <li>This prevents accidental overwrites while allowing stock updates</li>
                </ul>
              </div>
            </div>
          </Card>
        )}

        {/* Import Progress - Mobile Responsive */}
        {isImporting && (
          <Card className="p-4 sm:p-6 mb-6 sm:mb-8">
            <h2 className="text-lg sm:text-xl font-semibold mb-4">Importing Items...</h2>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span className="font-medium">
                  {importProgress.current} / {importProgress.total}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2.5">
                <div
                  className="bg-primary h-2.5 rounded-full transition-all duration-300"
                  style={{
                    width: `${(importProgress.current / importProgress.total) * 100}%`,
                  }}
                />
              </div>
              {importProgress.errors.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium text-amber-600 mb-2">
                    {importProgress.errors.length} errors occurred:
                  </p>
                  <div className="max-h-40 overflow-y-auto bg-muted p-3 rounded-lg">
                    {importProgress.errors.map((error, index) => (
                      <p key={index} className="text-xs text-muted-foreground mb-1">
                        {error}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}

        {isAdding && (
          <Card className="p-4 sm:p-6 mb-6 sm:mb-8">
            <h2 className="text-lg sm:text-xl font-semibold mb-4">{editingId ? "Edit Item" : "Add New Item"}</h2>
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
        {/* Search and Export - Mobile Responsive */}
        <div className="mb-6 flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-center">
          <Input
            type="text"
            placeholder="Search by name, SKU, or vendor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:max-w-md"
          />
          <Button 
            onClick={exportItemsToPDF} 
            disabled={filteredItems.length === 0}
            className="w-full sm:w-auto"
          >
            Export PDF
          </Button>
        </div>

        {/* Items Display - Mobile Cards & Desktop Table */}
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
          <>
            {/* Mobile Card View */}
            <div className="block lg:hidden space-y-4">
              {filteredItems.map((item) => (
                <Card key={item.id} className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{item.name}</h3>
                      <p className="text-xs text-muted-foreground font-mono mt-1">{item.sku}</p>
                    </div>
                    <div className={`text-right ${item.quantity < 10 ? "text-red-600" : ""}`}>
                      <div className="text-xs text-muted-foreground">Stock</div>
                      <div className="font-semibold text-lg">{item.quantity}</div>
                    </div>
                  </div>

                  <div className="space-y-2 mb-3">
                    {item.vendor && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Vendor:</span>
                        <span>{item.vendor}</span>
                      </div>
                    )}
                    {item.description && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Description:</span>
                        <p className="text-sm mt-1">{item.description}</p>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Price:</span>
                      <span className="font-semibold">RS {item.price.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm border-t pt-2">
                      <span className="text-muted-foreground">Total Value:</span>
                      <span className="font-bold text-primary">RS {(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Created:</span>
                      <span>{item.createdAt?.toDate?.()?.toLocaleDateString() || "N/A"}</span>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Updated:</span>
                      <span>{item.updatedAt?.toDate?.()?.toLocaleDateString() || "N/A"}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-3 border-t">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => handleEdit(item)}
                      className="flex-1"
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                      onClick={() => handleDelete(item.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </Card>
              ))}

              {/* Mobile Summary */}
              <Card className="p-4 bg-muted/30">
                <div className="space-y-2">
                  <div className="flex justify-between font-semibold">
                    <span>Total Items:</span>
                    <span>{filteredItems.length}</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span>Total Units:</span>
                    <span>{filteredItems.reduce((sum, item) => sum + item.quantity, 0)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-primary text-lg pt-2 border-t">
                    <span>Total Value:</span>
                    <span>RS {filteredItems.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2)}</span>
                  </div>
                </div>
              </Card>
            </div>

            {/* Desktop Table View */}
            <Card className="hidden lg:block overflow-hidden">
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
          </>
        )}
      </main>
    </>
  )
}

export default function Items() {
  return <ItemsContent />
}
