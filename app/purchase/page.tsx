"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Navbar } from "@/components/navbar"
import { createPurchase, getPurchases, updatePurchase, deletePurchase, type Purchase, type PurchaseItem } from "@/lib/purchases"
import { getItems, addItem, updateItem, type Item } from "@/lib/items"
import { auth } from "@/lib/firebase"
import { onAuthStateChanged } from "firebase/auth"
import { useRouter } from "next/navigation"
import { DateFilter, type DatePreset } from "@/components/date-filter"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

type PurchaseMode = "existing" | "new"
type PricingType = "unit" | "bulk"

interface CartItem extends PurchaseItem {
  pricingType?: PricingType
  bulkPrice?: number
  isNewItem?: boolean // Flag to indicate if this is a new item not yet in inventory
  newItemData?: {
    price: number
    description: string
    vendor: string
  }
}

interface NewItemForm {
  itemName: string
  quantity: string
  unitCost: string
  bulkPrice: string
  description: string
  vendor: string
  pricingType: PricingType
}

function PurchaseContent() {
  const router = useRouter()
  const [mode, setMode] = useState<PurchaseMode>("existing")
  const [items, setItems] = useState<Item[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [filteredPurchases, setFilteredPurchases] = useState<Purchase[]>([])
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [activeView, setActiveView] = useState<"record" | "view">("view")

  // Filter states
  const [searchTerm, setSearchTerm] = useState("")
  const [pricingTypeFilter, setPricingTypeFilter] = useState<"all" | "unit" | "bulk">("all")
  const [dateFilter, setDateFilter] = useState<{ start: Date | null; end: Date | null }>({ start: null, end: null })

  // Purchase details
  const [notes, setNotes] = useState("")

  // Existing item purchase
  const [selectedItem, setSelectedItem] = useState<string>("")
  const [quantity, setQuantity] = useState("")
  const [unitCost, setUnitCost] = useState("")
  const [bulkPrice, setBulkPrice] = useState("")
  const [existingItemPricingType, setExistingItemPricingType] = useState<PricingType>("unit")

  // New item form
  const [newItem, setNewItem] = useState<NewItemForm>({
    itemName: "",
    quantity: "",
    unitCost: "",
    bulkPrice: "",
    description: "",
    vendor: "",
    pricingType: "unit",
  })

  const [userId, setUserId] = useState<string | null>(null)
  
  // Edit and Delete states
  const [editingPurchaseId, setEditingPurchaseId] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  
  // Add to cart loading states
  const [isAddingToCart, setIsAddingToCart] = useState(false)

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
      fetchItems()
      fetchPurchases()
    }
  }, [userId])

  const fetchItems = async () => {
    if (!userId) return
    try {
      const fetchedItems = await getItems(userId)
      setItems(fetchedItems)
      setLoading(false)
    } catch (err) {
      console.error("Error fetching items:", err)
      setError("Failed to load items")
      setLoading(false)
    }
  }

  const fetchPurchases = async () => {
    if (!userId) return
    try {
      const fetchedPurchases = await getPurchases(userId)
      setPurchases(fetchedPurchases)
      setFilteredPurchases(fetchedPurchases)
    } catch (err) {
      console.error("Error fetching purchases:", err)
    }
  }

  // Filter purchases
  useEffect(() => {
    let filtered = [...purchases]

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter((purchase) =>
        (purchase.notes && purchase.notes.toLowerCase().includes(searchTerm.toLowerCase())) ||
        purchase.items.some(item => item.itemName.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    // Pricing type filter
    if (pricingTypeFilter !== "all") {
      filtered = filtered.filter((purchase) =>
        purchase.items.some(item => item.pricingType === pricingTypeFilter)
      )
    }

    // Date filter
    if (dateFilter.start && dateFilter.end) {
      filtered = filtered.filter((purchase) => {
        const purchaseDate = purchase.purchaseDate?.toDate
          ? purchase.purchaseDate.toDate()
          : new Date(purchase.purchaseDate)
        return purchaseDate >= dateFilter.start! && purchaseDate <= dateFilter.end!
      })
    }

    setFilteredPurchases(filtered)
  }, [purchases, searchTerm, pricingTypeFilter, dateFilter])

  const handleDateFilter = (preset: DatePreset | null, start: Date | null, end: Date | null) => {
    setDateFilter({ start, end })
  }

  const handleAddExistingItem = () => {
    if (!selectedItem || !quantity) {
      setError("Please fill all fields")
      return
    }

    if (existingItemPricingType === "unit" && !unitCost) {
      setError("Please enter unit cost")
      return
    }

    if (existingItemPricingType === "bulk" && !bulkPrice) {
      setError("Please enter box price (12 items)")
      return
    }

    const item = items.find((i) => i.id === selectedItem)
    if (!item) {
      setError("Item not found")
      return
    }

    setIsAddingToCart(true)

    try {
      let qty = parseInt(quantity)
      let cost: number
      let totalCost: number

      if (existingItemPricingType === "unit") {
        cost = parseFloat(unitCost)
        totalCost = qty * cost
      } else {
        // Bulk pricing - multiply quantity by 12
        const bulk = parseFloat(bulkPrice)
        const actualQuantity = qty * 12 // Multiply by 12 for bulk
        cost = bulk / 12 // Calculate per unit cost
        totalCost = qty * bulk // Total cost = number of bulk units * bulk price
        qty = actualQuantity // Update qty to actual quantity
      }

      const cartItem: CartItem = {
        itemId: item.id,
        itemName: item.name,
        sku: item.sku,
        quantity: qty,
        unitCost: cost,
        totalCost: totalCost,
        pricingType: existingItemPricingType,
      }
      
      // Only add bulkPrice if it's defined
      if (existingItemPricingType === "bulk" && bulkPrice) {
        cartItem.bulkPrice = parseFloat(bulkPrice)
      }

      // Small delay to show loading state
      setTimeout(() => {
        setCart([...cart, cartItem])
        setSelectedItem("")
        setQuantity("")
        setUnitCost("")
        setBulkPrice("")
        setError("")
        setIsAddingToCart(false)
      }, 300)
    } catch (err) {
      setError("Failed to add item to cart")
      setIsAddingToCart(false)
    }
  }

  const handleAddNewItem = async () => {
    if (!userId) return

    const qty = parseFloat(newItem.quantity)
    const unitCostValue = parseFloat(newItem.unitCost)
    const bulkPriceValue = parseFloat(newItem.bulkPrice)

    if (!newItem.itemName || !newItem.quantity || qty <= 0 || !newItem.vendor.trim()) {
      setError("Please fill all required fields (item name, quantity, and vendor)")
      return
    }

    if (newItem.pricingType === "unit" && (!newItem.unitCost || unitCostValue <= 0)) {
      setError("Please enter unit cost")
      return
    }

    if (newItem.pricingType === "bulk" && (!newItem.bulkPrice || bulkPriceValue <= 0)) {
      setError("Please enter box price (12 items)")
      return
    }

    setIsAddingToCart(true)

    try {
      // Calculate cost based on pricing type for the selling price
      let sellingPrice: number
      if (newItem.pricingType === "unit") {
        sellingPrice = unitCostValue // 20% markup as default
      } else {
        sellingPrice = (bulkPriceValue / 12) // 20% markup on per-unit cost
      }

      // Calculate cost based on pricing type
      let cost: number
      let totalCost: number
      let finalQuantity: number

      if (newItem.pricingType === "unit") {
        cost = unitCostValue
        totalCost = qty * cost
        finalQuantity = qty
      } else {
        // Bulk pricing - multiply quantity by 12
        const actualQuantity = qty * 12 // Multiply by 12 for bulk
        cost = bulkPriceValue / 12 // Calculate per unit cost
        totalCost = qty * bulkPriceValue // Total cost = number of bulk units * bulk price
        finalQuantity = actualQuantity
      }

      // Add to cart WITHOUT creating in inventory yet
      // Item will be created when "Complete Purchase" is clicked
      const cartItem: CartItem = {
        itemId: `temp-${Date.now()}`, // Temporary ID
        itemName: newItem.itemName,
        sku: "Will be auto-generated", // Will be replaced with actual SKU
        quantity: finalQuantity,
        unitCost: cost,
        totalCost: totalCost,
        pricingType: newItem.pricingType,
        isNewItem: true, // Flag to indicate this is a new item
        newItemData: {
          price: sellingPrice,
          description: newItem.description,
          vendor: newItem.vendor,
        }
      }
      
      // Only add bulkPrice if it's defined
      if (newItem.pricingType === "bulk" && bulkPriceValue) {
        cartItem.bulkPrice = bulkPriceValue
      }

      setCart([...cart, cartItem])

      // Reset form
      setNewItem({
        itemName: "",
        quantity: "",
        unitCost: "",
        bulkPrice: "",
        description: "",
        vendor: "",
        pricingType: "unit",
      })

      setSuccess("New item added to cart! It will be created in inventory when you complete the purchase.")
      setError("")

      setTimeout(() => {
        setSuccess("")
        setIsAddingToCart(false)
      }, 300)
    } catch (err) {
      console.error("Error adding new item:", err)
      setError("Failed to add new item")
      setIsAddingToCart(false)
    }
  }

  const handleRemoveFromCart = (index: number) => {
    setCart(cart.filter((_, i) => i !== index))
  }

  const calculateTotal = () => {
    return cart.reduce((sum, item) => sum + item.totalCost, 0)
  }

  const handleSubmitPurchase = async () => {
    if (!userId) return

    // Prevent multiple submissions
    if (isSubmitting) return

    if (cart.length === 0) {
      setError("Please add items to purchase")
      return
    }

    try {
      setIsSubmitting(true)
      setError("")
      
      // First, create any new items in inventory and update existing items
      const userName = auth.currentUser?.displayName || auth.currentUser?.email || "User"
      const updatedCart = await Promise.all(
        cart.map(async (item) => {
          if (item.isNewItem && item.newItemData) {
            // Create the item in inventory first
            const itemId = await addItem(
              {
                name: item.itemName,
                price: item.newItemData.price,
                quantity: 0, // Initial quantity is 0, will be updated after purchase
                description: item.newItemData.description,
                vendor: item.newItemData.vendor,
              },
              userId,
              userName
            )

            if (!itemId) {
              throw new Error(`Failed to create item: ${item.itemName}`)
            }

            // Return updated item with real itemId and remove temporary fields
            const { isNewItem, newItemData, ...itemWithoutNewFlags } = item
            return {
              ...itemWithoutNewFlags,
              itemId: itemId,
            }
          } else {
            // Update existing item with new purchase price
            const newSellingPrice = item.unitCost  // 20% markup
            await updateItem(
              item.itemId,
              {
                price: newSellingPrice,
              },
              userId
            )
          }
          // Return existing item as-is
          return item
        })
      )
      
      await createPurchase(userId, {
        supplierName: "",
        supplierContact: "",
        items: updatedCart,
        totalAmount: calculateTotal(),
        notes,
      })

      setSuccess("Purchase recorded successfully!")
      
      // Reset form
      setCart([])
      setNotes("")

      // Refresh purchases and items lists
      await Promise.all([fetchPurchases(), fetchItems()])

      setTimeout(() => {
        setSuccess("")
        setActiveView("view")
      }, 2000)
    } catch (err) {
      console.error("Error recording purchase:", err)
      setError("Failed to record purchase")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditPurchase = (purchase: Purchase) => {
    // Load purchase data into form
    setNotes(purchase.notes || "")
    setCart(purchase.items as CartItem[])
    setEditingPurchaseId(purchase.id)
    setActiveView("record")
    setError("")
    setSuccess("")
  }

  const handleUpdatePurchase = async () => {
    if (!userId || !editingPurchaseId) return

    // Prevent multiple submissions
    if (isSubmitting) return

    if (cart.length === 0) {
      setError("Please add items to purchase")
      return
    }

    try {
      setIsSubmitting(true)
      setError("")
      
      // First, create any new items in inventory and update existing items
      const userName = auth.currentUser?.displayName || auth.currentUser?.email || "User"
      const updatedCart = await Promise.all(
        cart.map(async (item) => {
          if (item.isNewItem && item.newItemData) {
            // Create the item in inventory first
            const itemId = await addItem(
              {
                name: item.itemName,
                price: item.newItemData.price,
                quantity: 0, // Initial quantity is 0, will be updated after purchase
                description: item.newItemData.description,
                vendor: item.newItemData.vendor,
              },
              userId,
              userName
            )

            if (!itemId) {
              throw new Error(`Failed to create item: ${item.itemName}`)
            }

            // Return updated item with real itemId and remove temporary fields
            const { isNewItem, newItemData, ...itemWithoutNewFlags } = item
            return {
              ...itemWithoutNewFlags,
              itemId: itemId,
            }
          } else {
            // Update existing item with new purchase price
            const newSellingPrice = item.unitCost  // 20% markup
            await updateItem(
              item.itemId,
              {
                price: newSellingPrice,
              },
              userId
            )
          }
          // Return existing item as-is
          return item
        })
      )
      
      await updatePurchase(editingPurchaseId, {
        supplierName: "",
        supplierContact: "",
        items: updatedCart,
        totalAmount: calculateTotal(),
        notes,
      }, userId)

      setSuccess("Purchase updated successfully!")
      
      // Reset form
      setCart([])
      setNotes("")
      setEditingPurchaseId(null)

      // Refresh purchases and items lists
      await Promise.all([fetchPurchases(), fetchItems()])

      setTimeout(() => {
        setSuccess("")
        setActiveView("view")
      }, 2000)
    } catch (err) {
      console.error("Error updating purchase:", err)
      setError("Failed to update purchase")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancelEdit = () => {
    setEditingPurchaseId(null)
    setCart([])
    setNotes("")
    setError("")
    setSuccess("")
  }

  const handleDeletePurchase = async (purchaseId: string) => {
    if (!userId) return

    try {
      await deletePurchase(purchaseId, userId)
      setSuccess("Purchase deleted successfully!")
      setDeleteConfirmId(null)
      
      // Refresh purchases and items lists
      await Promise.all([fetchPurchases(), fetchItems()])

      setTimeout(() => setSuccess(""), 3000)
    } catch (err) {
      console.error("Error deleting purchase:", err)
      setError("Failed to delete purchase")
      setTimeout(() => setError(""), 3000)
    }
  }

  const exportPurchasesToPDF = () => {
    const doc = new jsPDF()
    
    // Add title
    doc.setFontSize(18)
    doc.text("Purchase Report", 14, 22)
    
    // Add date range if filtered
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
    if (pricingTypeFilter !== "all") filterInfo.push(`Pricing: ${pricingTypeFilter}`)
    if (searchTerm) filterInfo.push(`Search: "${searchTerm}"`)
    if (filterInfo.length > 0) {
      doc.text(`Filters: ${filterInfo.join(", ")}`, 14, 36)
    }
    
    // Prepare table data
    const tableData = filteredPurchases.map((purchase) => {
      const purchaseDate = purchase.purchaseDate?.toDate
        ? purchase.purchaseDate.toDate()
        : new Date()
      
      const itemsList = purchase.items.map((item) =>
        `${item.itemName} (${item.sku}) x${item.quantity} @ RS ${item.unitCost.toFixed(2)}`
      ).join("\n")
      
      return [
        `#${purchase.id?.slice(0, 8) || "N/A"}`,
        purchaseDate.toLocaleDateString(),
        itemsList,
        `RS ${purchase.totalAmount.toFixed(2)}`
      ]
    })
    
    // Add table
    autoTable(doc, {
      startY: filterInfo.length > 0 ? 42 : 36,
      head: [["ID", "Date", "Items", "Total"]],
      body: tableData,
      theme: "grid",
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [59, 130, 246], textColor: 255 },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 30 },
        2: { cellWidth: 90 },
        3: { cellWidth: 35 }
      }
    })
    
    // Add summary
    const finalY = (doc as any).lastAutoTable.finalY || 36
    doc.setFontSize(12)
    doc.text(`Total Purchases: ${filteredPurchases.length}`, 14, finalY + 10)
    const totalAmount = filteredPurchases.reduce((sum, purchase) => sum + purchase.totalAmount, 0)
    doc.text(`Grand Total: RS ${totalAmount.toFixed(2)}`, 14, finalY + 18)
    
    // Save PDF
    const fileName = `purchases-report-${new Date().toISOString().split("T")[0]}.pdf`
    doc.save(fileName)
  }

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </>
    )
  }

  return (
    <>
      <Navbar />
      <main className="container mx-auto p-3 sm:p-6 max-w-7xl">
        {/* Header */}
        <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Purchase Management</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-2">Record purchases and add new inventory items</p>
          </div>
          {activeView === "view" && !editingPurchaseId && (
            <Button
              onClick={() => setActiveView("record")}
              size="lg"
              className="w-full sm:w-auto"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Purchase
            </Button>
          )}
        </div>

        {activeView === "record" || editingPurchaseId ? (
          <>
            {/* Back Button */}
            {!editingPurchaseId && (
              <div className="mb-4 sm:mb-6">
                <Button
                  variant="ghost"
                  onClick={() => setActiveView("view")}
                  className="gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Back to Purchases
                </Button>
              </div>
            )}

            {/* Edit Mode Indicator */}
            {editingPurchaseId && (
              <Card className="p-3 sm:p-4 mb-4 sm:mb-6 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-blue-800 dark:text-blue-300">Editing Purchase</h3>
                    <p className="text-xs sm:text-sm text-blue-600 dark:text-blue-400">
                      You are currently editing an existing purchase. Click "Update Purchase" to save changes or "Cancel Edit" to discard.
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleCancelEdit}
                    className="w-full sm:w-auto"
                  >
                    Cancel
                  </Button>
                </div>
              </Card>
            )}
            
            {/* Purchase Mode Selector */}
            <Card className="p-4 sm:p-6 mb-4 sm:mb-6">
              <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Purchase Type</h2>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                <Button
                  variant={mode === "existing" ? "default" : "outline"}
                  onClick={() => setMode("existing")}
                  disabled={isSubmitting}
                  className="w-full sm:w-auto"
                >
                  Purchase Existing Items
                </Button>
                <Button
                  variant={mode === "new" ? "default" : "outline"}
                  onClick={() => setMode("new")}
                  disabled={isSubmitting}
                  className="w-full sm:w-auto"
                >
                  Add New Items
                </Button>
              </div>
            </Card>

            {/* Add Items Section */}
            {mode === "existing" ? (
              <Card className="p-4 sm:p-6 mb-4 sm:mb-6">
                <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Add Existing Items to Purchase</h2>
                
                {/* Pricing Type Selector */}
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">Pricing Type</label>
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                    <Button
                      type="button"
                      variant={existingItemPricingType === "unit" ? "default" : "outline"}
                      onClick={() => setExistingItemPricingType("unit")}
                      disabled={isSubmitting}
                      className="w-full sm:w-auto text-xs sm:text-sm"
                    >
                      Unit Price (1 item)
                    </Button>
                    <Button
                      type="button"
                      variant={existingItemPricingType === "bulk" ? "default" : "outline"}
                      onClick={() => setExistingItemPricingType("bulk")}
                      disabled={isSubmitting}
                      className="w-full sm:w-auto text-xs sm:text-sm"
                    >
                      Box Price (12 items)
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="sm:col-span-2 lg:col-span-2">
                    <label className="block text-sm font-medium mb-2">Select Item</label>
                    <select
                      value={selectedItem}
                      onChange={(e) => setSelectedItem(e.target.value)}
                      className="w-full border-2 border-border/60 hover:border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg p-2 bg-background text-foreground transition-colors outline-none text-sm"
                      disabled={isSubmitting}
                    >
                      <option value="">-- Select an item --</option>
                      {items.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name} ({item.sku}) - Current Stock: {item.quantity}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Quantity {existingItemPricingType === "bulk" && "(Number of Bulk Units)"}
                    </label>
                    <Input
                      type="text"
                      value={quantity}
                      onChange={(e) => {
                        const value = e.target.value
                        // Only allow numbers and decimal point
                        if (value === '' || /^\d*\.?\d*$/.test(value)) {
                          setQuantity(value)
                        }
                      }}
                      onFocus={(e) => e.target.select()}
                      placeholder={quantity ? "" : "0.00"}
                      disabled={isSubmitting}
                    />
                    {existingItemPricingType === "bulk" && (
                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                        ℹ️ Will add {quantity ? `${parseInt(quantity) * 12}` : "0"} items (Quantity × 12)
                      </p>
                    )}
                  </div>
                  {existingItemPricingType === "unit" ? (
                    <div>
                      <label className="block text-sm font-medium mb-2">Unit Cost (RS) </label>
                      <Input
                        type="text"
                        value={unitCost}
                        onChange={(e) => {
                          const value = e.target.value
                          // Only allow numbers and decimal point
                          if (value === '' || /^\d*\.?\d*$/.test(value)) {
                            setUnitCost(value)
                          }
                        }}
                        onFocus={(e) => e.target.select()}
                        placeholder={unitCost ? "" : "0.00"}
                        disabled={isSubmitting}
                      />
                      {quantity && unitCost && (
                        <p className="text-xs text-green-600 dark:text-green-400 mt-1 font-semibold">
                          💰 Total: RS {(parseInt(quantity) * parseFloat(unitCost)).toFixed(2)}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium mb-2">Box Price (12 items) (RS)</label>
                      <Input
                        type="text"
                        value={bulkPrice}
                        onChange={(e) => {
                          const value = e.target.value
                          // Only allow numbers and decimal point
                          if (value === '' || /^\d*\.?\d*$/.test(value)) {
                            setBulkPrice(value)
                          }
                        }}
                        onFocus={(e) => e.target.select()}
                        placeholder={bulkPrice ? "" : "0.00"}
                        disabled={isSubmitting}
                      />
                      {quantity && bulkPrice && (
                        <p className="text-xs text-green-600 dark:text-green-400 mt-1 font-semibold">
                          💰 Total: RS {(parseInt(quantity) * parseFloat(bulkPrice)).toFixed(2)}
                        </p>
                      )}
                    </div>
                  )}
                </div>
                
                {/* {existingItemPricingType === "bulk" && (
                  <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p className="text-xs sm:text-sm text-blue-800 dark:text-blue-300">
                      ℹ️ <strong>Bulk Pricing:</strong> Enter the number of bulk units (e.g., 5 = 60 items). Bulk price is for 12 items. The quantity will be automatically multiplied by 12.
                    </p>
                  </div>
                )} */}

                <Button onClick={handleAddExistingItem} className="mt-4 w-full sm:w-auto" disabled={isSubmitting || isAddingToCart}>
                  {isAddingToCart ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Adding...
                    </>
                  ) : (
                    "Add to Cart"
                  )}
                </Button>
              </Card>
            ) : (
              <Card className="p-4 sm:p-6 mb-4 sm:mb-6">
                <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Add New Item to Inventory</h2>
                <div className="space-y-4">
                  {/* Pricing Type Selector */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Pricing Type</label>
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                      <Button
                        type="button"
                        variant={newItem.pricingType === "unit" ? "default" : "outline"}
                        onClick={() => setNewItem({ ...newItem, pricingType: "unit" })}
                        disabled={isSubmitting}
                        className="w-full sm:w-auto text-xs sm:text-sm"
                      >
                        Unit Price (1 item)
                      </Button>
                      <Button
                        type="button"
                        variant={newItem.pricingType === "bulk" ? "default" : "outline"}
                        onClick={() => setNewItem({ ...newItem, pricingType: "bulk" })}
                        disabled={isSubmitting}
                        className="w-full sm:w-auto text-xs sm:text-sm"
                      >
                        Box Price (12 items)
                      </Button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Item Name <span className="text-red-500">*</span></label>
                    <Input
                      value={newItem.itemName}
                      onChange={(e) => {
                        const value = e.target.value
                        // Only allow letters, numbers, and spaces, max 30 characters
                        if (value.length <= 30 && /^[a-zA-Z0-9\s]*$/.test(value)) {
                          setNewItem({ ...newItem, itemName: value })
                        }
                      }}
                      placeholder={newItem.itemName ? "" : "Enter item name"}
                      disabled={isSubmitting}
                    />
                    {/* <p className="text-xs text-muted-foreground mt-1">
                      {newItem.itemName.length}/30 characters (letters, numbers, and spaces only)
                    </p> */}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Purchase Quantity <span className="text-red-500">*</span> 
                      </label>
                      <Input
                        type="text"
                        value={newItem.quantity}
                        onChange={(e) => {
                          const value = e.target.value
                          // Only allow numbers and decimal point
                          if (value === '' || /^\d*\.?\d*$/.test(value)) {
                            setNewItem({ ...newItem, quantity: value })
                          }
                        }}
                        onFocus={(e) => e.target.select()}
                        placeholder={newItem.quantity ? "" : "0.00"}
                        disabled={isSubmitting}
                      />
                      {newItem.pricingType === "bulk" && (
                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                          ℹ️ Will add {newItem.quantity ? `${parseFloat(newItem.quantity) * 12}` : "0"} items (Quantity × 12)
                        </p>
                      )}
                    </div>
                    {newItem.pricingType === "unit" ? (
                      <div>
                        <label className="block text-sm font-medium mb-2">Unit Cost (RS) <span className="text-red-500">*</span></label>  
                        <Input
                          type="text"
                          value={newItem.unitCost}
                          onChange={(e) => {
                            const value = e.target.value
                            // Only allow numbers and decimal point
                            if (value === '' || /^\d*\.?\d*$/.test(value)) {
                              setNewItem({ ...newItem, unitCost: value })
                            }
                          }}
                          onFocus={(e) => e.target.select()}
                          placeholder={newItem.unitCost ? "" : "0.00"}
                          disabled={isSubmitting}
                        />
                        {newItem.quantity && newItem.unitCost && (
                          <p className="text-xs text-green-600 dark:text-green-400 mt-1 font-semibold">
                            💰 Total: RS {(parseFloat(newItem.quantity) * parseFloat(newItem.unitCost)).toFixed(2)}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div>
                        <label className="block text-sm font-medium mb-2">Box Price (12 items) (RS) <span className="text-red-500">*</span></label>
                        <Input
                          type="text"
                          value={newItem.bulkPrice}
                          onChange={(e) => {
                            const value = e.target.value
                            // Only allow numbers and decimal point
                            if (value === '' || /^\d*\.?\d*$/.test(value)) {
                              setNewItem({ ...newItem, bulkPrice: value })
                            }
                          }}
                          onFocus={(e) => e.target.select()}
                          placeholder={newItem.bulkPrice ? "" : "0.00"}
                          disabled={isSubmitting}
                        />
                        {newItem.quantity && newItem.bulkPrice && (
                          <p className="text-xs text-green-600 dark:text-green-400 mt-1 font-semibold">
                            💰 Total: RS {(parseFloat(newItem.quantity) * parseFloat(newItem.bulkPrice)).toFixed(2)}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* {newItem.pricingType === "bulk" && (
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <p className="text-sm text-blue-800 dark:text-blue-300">
                        ℹ️ <strong>Bulk Pricing:</strong> Enter the number of bulk units (e.g., 5 = 60 items). Bulk price is for 12 items. The quantity will be automatically multiplied by 12.
                      </p>
                    </div>
                  )} */}

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Vendor Name <span className="text-red-500">*</span>
                    </label>
                    <Input
                      value={newItem.vendor}
                      onChange={(e) => {
                        const value = e.target.value
                        // Only allow letters, numbers, and spaces, max 30 characters
                        if (value.length <= 30 && /^[a-zA-Z0-9\s]*$/.test(value)) {
                          setNewItem({ ...newItem, vendor: value })
                        }
                      }}
                      placeholder={newItem.vendor ? "" : "Enter vendor name"}
                      disabled={isSubmitting}
                      required
                    />
                    {/* <p className="text-xs text-muted-foreground mt-1">
                      {newItem.vendor.length}/30 characters (letters, numbers, and spaces only)
                    </p> */}
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Description </label>
                    <Textarea
                      value={newItem.description}
                      onChange={(e) => {
                        const value = e.target.value
                        // Allow letters, numbers, spaces, and common punctuation, max 100 characters
                        if (value.length <= 100) {
                          setNewItem({ ...newItem, description: value })
                        }
                      }}
                      placeholder={newItem.description ? "" : "Enter item description..."}
                      rows={3}
                      disabled={isSubmitting}
                    />
                    {/* <p className="text-xs text-muted-foreground mt-1">
                      {newItem.description.length}/100 characters
                    </p> */}
                  </div>

                  {/* <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                    <p className="text-sm text-blue-800 dark:text-blue-300">
                      ℹ️ <strong>Note:</strong> SKU will be auto-generated. This item will be automatically added to your inventory.
                    </p>
                  </div> */}
                </div>
                <Button onClick={handleAddNewItem} className="mt-4 w-full sm:w-auto" disabled={isSubmitting || isAddingToCart}>
                  {isAddingToCart ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Adding...
                    </>
                  ) : (
                    "Add to Cart & Inventory"
                  )}
                </Button>
              </Card>
            )}

            {/* Cart */}
            {cart.length > 0 && (
              <Card className="p-4 sm:p-6 mb-4 sm:mb-6">
                <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Purchase Cart</h2>
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <table className="w-full text-xs sm:text-sm min-w-[600px]">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 px-1 sm:px-2">Item</th>
                        <th className="text-left py-2 px-1 sm:px-2 hidden sm:table-cell">SKU</th>
                        <th className="text-center py-2 px-1 sm:px-2">Type</th>
                        <th className="text-right py-2 px-1 sm:px-2">Qty</th>
                        <th className="text-right py-2 px-1 sm:px-2">Cost</th>
                        <th className="text-right py-2 px-1 sm:px-2">Total</th>
                        <th className="text-right py-2 px-1 sm:px-2">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cart.map((item, index) => (
                        <tr key={index} className="border-b border-border">
                          <td className="py-2 px-1 sm:px-2">
                            <div className="min-w-[100px]">
                              {item.itemName}
                              {item.isNewItem && (
                                <span className="ml-1 px-1 sm:px-2 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 text-xs rounded font-medium">
                                  NEW
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2 px-1 sm:px-2 text-xs font-mono hidden sm:table-cell">{item.sku}</td>
                          <td className="py-2 px-1 sm:px-2 text-center">
                            <span className={`px-1 sm:px-2 py-0.5 sm:py-1 rounded text-xs font-medium ${
                              item.pricingType === "bulk"
                                ? "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300"
                                : "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                            }`}>
                              {item.pricingType === "bulk" ? "Bulk" : "Unit"}
                            </span>
                            {item.pricingType === "bulk" && item.bulkPrice && (
                              <div className="text-xs text-muted-foreground mt-1 hidden sm:block">
                                RS {item.bulkPrice.toFixed(2)}/12
                              </div>
                            )}
                          </td>
                          <td className="py-2 px-1 sm:px-2 text-right">{item.quantity}</td>
                          <td className="py-2 px-1 sm:px-2 text-right">RS {item.unitCost.toFixed(2)}</td>
                          <td className="py-2 px-1 sm:px-2 text-right font-semibold">RS {item.totalCost.toFixed(2)}</td>
                          <td className="py-2 px-1 sm:px-2 text-right">
                            <Button variant="destructive" size="sm" onClick={() => handleRemoveFromCart(index)} disabled={isSubmitting} className="text-xs px-2">
                              <span className="hidden sm:inline">Remove</span>
                              <span className="sm:hidden">×</span>
                            </Button>
                          </td>
                        </tr>
                      ))}
                      <tr className="font-bold">
                        <td colSpan={4} className="py-3 px-1 sm:px-2 text-right hidden sm:table-cell">
                          Total Amount:
                        </td>
                        <td className="py-3 px-1 sm:px-2 text-right sm:hidden">Total:</td>
                        <td colSpan={2} className="py-3 px-1 sm:px-2 text-right text-base sm:text-lg">RS {calculateTotal().toFixed(2)}</td>
                        <td></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {/* Notes */}
            <Card className="p-4 sm:p-6 mb-4 sm:mb-6">
              <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Additional Notes (Optional)</h2>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={notes ? "" : "Add any notes about this purchase..."}
                rows={3}
                disabled={isSubmitting}
                className="text-sm"
              />
            </Card>

            {/* Messages */}
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 p-3 sm:p-4 rounded-lg mb-4 text-sm">
                {error}
              </div>
            )}
            {success && (
              <div className="bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 p-3 sm:p-4 rounded-lg mb-4 text-sm">
                {success}
              </div>
            )}

            {/* Submit Button */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <Button 
                onClick={editingPurchaseId ? handleUpdatePurchase : handleSubmitPurchase} 
                className="flex-1" 
              size="lg" 
              disabled={cart.length === 0 || isSubmitting}
            >
                {isSubmitting 
                  ? (editingPurchaseId ? "Updating..." : "Processing...") 
                  : (editingPurchaseId ? "Update Purchase" : "Complete Purchase")
                }
            </Button>
              {editingPurchaseId && (
                <Button 
                  onClick={handleCancelEdit} 
                  variant="outline"
                  size="lg" 
                  disabled={isSubmitting}
                  className="w-full sm:w-auto"
                >
                  Cancel Edit
                </Button>
              )}
            </div>
          </>
        ) : (
          /* Purchase History */
          <div className="space-y-4 sm:space-y-6">
            {/* Date Filter */}
            <DateFilter onFilter={handleDateFilter} />

            {/* Filters */}
            <Card className="p-4 sm:p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Search */}
                <div>
                  <label className="block text-sm font-medium mb-2">Search</label>
                  <Input
                    type="text"
                    placeholder="Search by item or notes..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="text-sm"
                  />
                </div>

                {/* Pricing Type Filter */}
                <div>
                  <label className="block text-sm font-medium mb-2">Pricing Type</label>
                  <select
                    value={pricingTypeFilter}
                    onChange={(e) => setPricingTypeFilter(e.target.value as any)}
                    className="w-full border-2 border-border/60 hover:border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg p-2 bg-background text-foreground transition-colors outline-none text-sm"
                  >
                    <option value="all">All Types</option>
                    <option value="unit">Unit</option>
                    <option value="bulk">Bulk</option>
                  </select>
                </div>
              </div>
            </Card>

            <Card className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
                <div>
                  <h2 className="text-base sm:text-lg font-semibold">Purchase History</h2>
                  <div className="text-xs sm:text-sm text-muted-foreground mt-1">
                    Showing {filteredPurchases.length} of {purchases.length} purchases
                  </div>
                </div>
                <Button onClick={exportPurchasesToPDF} disabled={filteredPurchases.length === 0} className="w-full sm:w-auto text-sm" size="sm">
                  Export PDF
                </Button>
              </div>
              {filteredPurchases.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No purchases found</div>
              ) : (
                <div className="space-y-4">
                  {filteredPurchases.map((purchase) => {
                  const purchaseDate = purchase.purchaseDate?.toDate
                    ? purchase.purchaseDate.toDate()
                    : new Date()

                  return (
                    <Card key={purchase.id} className="p-3 sm:p-4 border-2">
                      <div className="flex flex-col sm:flex-row justify-between items-start mb-3 gap-3">
                        <div className="flex-1">
                          <h3 className="font-semibold text-base sm:text-lg">Purchase #{purchase.id.slice(0, 8)}</h3>
                          <p className="text-xs sm:text-sm text-muted-foreground">
                            {purchaseDate.toLocaleDateString("en-GB", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </p>
                        </div>
                        <div className="w-full sm:w-auto text-left sm:text-right flex flex-row sm:flex-col items-center sm:items-end gap-3 sm:gap-2">
                          <div className="flex-1 sm:flex-none">
                          <div className="text-xl sm:text-2xl font-bold text-primary">RS {purchase.totalAmount.toFixed(2)}</div>
                          <div className="text-xs sm:text-sm text-muted-foreground">{purchase.items.length} items</div>
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleEditPurchase(purchase)}
                              className="text-xs px-2 sm:px-3"
                            >
                              Edit
                            </Button>
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={() => setDeleteConfirmId(purchase.id)}
                              className="text-xs px-2 sm:px-3"
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                      </div>

                      <div className="border-t pt-3">
                        <h4 className="font-medium text-xs sm:text-sm mb-2">Items:</h4>
                        <div className="space-y-2">
                          {purchase.items.map((item, idx) => (
                            <div key={idx} className="flex flex-col sm:flex-row justify-between items-start sm:items-center text-xs sm:text-sm gap-1 sm:gap-2">
                              <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                                <span>
                                  {item.itemName} <span className="text-muted-foreground text-xs">({item.sku})</span> x {item.quantity}
                                </span>
                                {item.pricingType && (
                                  <span className={`px-1.5 sm:px-2 py-0.5 rounded text-xs font-medium ${
                                    item.pricingType === "bulk"
                                      ? "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300"
                                      : "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                                  }`}>
                                    {item.pricingType === "bulk" ? "Bulk" : "Unit"}
                                  </span>
                                )}
                              </div>
                              <span className="font-medium whitespace-nowrap">RS {item.totalCost.toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {purchase.notes && (
                        <div className="border-t pt-3 mt-3">
                          <p className="text-xs sm:text-sm text-muted-foreground">
                            <strong>Notes:</strong> {purchase.notes}
                          </p>
                        </div>
                      )}

                      {/* Delete Confirmation Dialog */}
                      {deleteConfirmId === purchase.id && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                          <Card className="p-4 sm:p-6 max-w-md w-full">
                            <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Confirm Delete</h3>
                            <p className="text-xs sm:text-sm text-muted-foreground mb-4 sm:mb-6">
                              Are you sure you want to delete this purchase? 
                              This will also adjust the inventory quantities. This action cannot be undone.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                              <Button 
                                variant="destructive" 
                                onClick={() => handleDeletePurchase(purchase.id)}
                                className="flex-1"
                              >
                                Delete
                              </Button>
                              <Button 
                                variant="outline" 
                                onClick={() => setDeleteConfirmId(null)}
                                className="flex-1"
                              >
                                Cancel
                              </Button>
                            </div>
                          </Card>
                        </div>
                      )}
                    </Card>
                  )
                })}
              </div>
            )}
          </Card>
          </div>
        )}
      </main>
    </>
  )
}

export default function Purchase() {
  return <PurchaseContent />
}

