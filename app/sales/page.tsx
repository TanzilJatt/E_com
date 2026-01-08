"use client"

import { useEffect, useState } from "react"
import { db, auth } from "@/lib/firebase"
import { collection, getDocs } from "firebase/firestore"
import { onAuthStateChanged } from "firebase/auth"
import { Navbar } from "@/components/navbar"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createSale, getSales, type SaleItem, type Sale } from "@/lib/sales"
import type { Item } from "@/lib/items"
import { DateFilter, type DatePreset } from "@/components/date-filter"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

function SalesContent() {
  // View state
  const [activeView, setActiveView] = useState<"record" | "list">("record")
  const [authReady, setAuthReady] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  
  // Record Sale State
  const [items, setItems] = useState<Item[]>([])
  const [saleType, setSaleType] = useState<"wholesale" | "retail">("retail")
  const [cart, setCart] = useState<SaleItem[]>([])
  const [selectedItemId, setSelectedItemId] = useState("")
  const [quantity, setQuantity] = useState<number | "">("")
  const [pricePerItem, setPricePerItem] = useState<number | "">("")
  const [cashPrice, setCashPrice] = useState<number | "">("")
  const [creditPrice, setCreditPrice] = useState<number | "">("")
  const [paymentCash, setPaymentCash] = useState(true)
  const [paymentCredit, setPaymentCredit] = useState(false)
  const [cashAmount, setCashAmount] = useState<number | "">("")
  const [creditAmount, setCreditAmount] = useState<number | "">("")
  const [purchaserName, setPurchaserName] = useState("")
  const [description, setDescription] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  // Sales List State
  const [sales, setSales] = useState<Sale[]>([])
  const [filteredSales, setFilteredSales] = useState<Sale[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [saleTypeFilter, setSaleTypeFilter] = useState<"all" | "retail" | "wholesale">("all")
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<"all" | "cash" | "credit" | "both">("all")
  const [dateFilter, setDateFilter] = useState<{ start: Date | null; end: Date | null }>({ start: null, end: null })
  const [loading, setLoading] = useState(false)

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

  // Fetch data when auth is ready and user is logged in
  useEffect(() => {
    if (authReady && currentUserId) {
      fetchItems()
      fetchSales()
    }
  }, [authReady, currentUserId])

  const fetchItems = async () => {
    try {
      if (!db || !currentUserId) {
        return
      }
      
      // Import getItems function to use user filtering
      const { getItems } = await import("@/lib/items")
      const itemsList = await getItems(currentUserId)
      
      // Filter items with quantity > 0
      const availableItems = itemsList.filter((item) => item.quantity > 0)
      setItems(availableItems)
    } catch (error) {
      console.error("Error fetching items:", error)
    }
  }

  const fetchSales = async () => {
    try {
      if (!currentUserId) {
        return
      }
      setLoading(true)
      const salesList = await getSales(currentUserId)
      setSales(salesList)
      setFilteredSales(salesList)
    } catch (error) {
      console.error("Error fetching sales:", error)
    } finally {
      setLoading(false)
    }
  }

  // Filter sales whenever filters change
  useEffect(() => {
    let filtered = [...sales]

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter((sale) =>
        sale.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sale.items.some(item => item.itemName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (sale.purchaserName && sale.purchaserName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (sale.description && sale.description.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    // Sale type filter
    if (saleTypeFilter !== "all") {
      filtered = filtered.filter((sale) => sale.type === saleTypeFilter)
    }

    // Payment method filter
    if (paymentMethodFilter !== "all") {
      filtered = filtered.filter((sale) => {
        // Skip sales without payment method data
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
  }, [sales, searchTerm, saleTypeFilter, paymentMethodFilter, dateFilter])

  const handleAddToCart = () => {
    setError("")
    if (!selectedItemId || quantity <= 0) {
      setError("Please select an item and enter a valid quantity")
      return
    }

    // Validate that price per item is entered
    if (pricePerItem === "" || pricePerItem <= 0) {
      setError("Please enter a valid price per item")
      return
    }

    const item = items.find((i) => i.id === selectedItemId)
    if (!item) {
      setError("Item not found")
      return
    }

    if (quantity && quantity > item.quantity) {
      setError("Not enough stock available")
      return
    }

    // Ensure quantity is a valid number
    const qty = typeof quantity === 'number' ? quantity : 0
    const price = typeof pricePerItem === 'number' ? pricePerItem : 0
    const totalPrice = qty * price

    const existingItem = cart.find((c) => c.itemId === selectedItemId)
    if (existingItem) {
      if (existingItem.quantity + qty > item.quantity) {
        setError("Not enough stock available")
        return
      }
      // For simplicity, replace the existing item with new pricing
      setError("Item already in cart. Please remove it first to change pricing.")
      return
    } else {
      setCart([
        ...cart,
        {
          itemId: selectedItemId,
          itemName: item.name,
          quantity: qty,
          pricePerUnit: price,
          cashPrice: undefined,
          creditPrice: undefined,
          totalPrice,
        },
      ])
    }

    setSelectedItemId("")
    setQuantity("")
    setPricePerItem("")
  }

  const handleRemoveFromCart = (itemId: string) => {
    const newCart = cart.filter((c) => c.itemId !== itemId)
    setCart(newCart)
    
    // Update payment method selections based on remaining items
    const hasCash = newCart.some(c => c.cashPrice !== undefined)
    const hasCredit = newCart.some(c => c.creditPrice !== undefined)
    setPaymentCash(hasCash)
    setPaymentCredit(hasCredit)
  }

  const handleCompleteSale = async () => {
    setError("")
    setSuccess("")

    if (cart.length === 0) {
      setError("Cart is empty")
      return
    }

    const totalQuantity = cart.reduce((sum, item) => sum + item.quantity, 0)
    // No quantity restrictions - users can select any number of items

    // Validate payment method is selected
    if (!paymentCash && !paymentCredit) {
      setError("Please select at least one payment method")
      return
    }

    // Calculate final amounts based on what's entered
    const finalCashAmount = (paymentCash && cashAmount !== "" && typeof cashAmount === 'number') ? cashAmount : 0
    const finalCreditAmount = (paymentCredit && creditAmount !== "" && typeof creditAmount === 'number') ? creditAmount : 0
    const totalAmount = finalCashAmount + finalCreditAmount
    
    // Validate that payment equals grand total
    if (Math.abs(totalAmount - grandTotal) > 0.01) {
      setError(`Total payment (RS ${totalAmount.toFixed(2)}) must equal grand total (RS ${grandTotal.toFixed(2)})`)
      return
    }

    setIsLoading(true)

    try {
      const saleId = await createSale(
        {
          type: saleType,
          items: cart,
          totalAmount,
          paymentMethod: {
            cash: paymentCash,
            credit: paymentCredit,
            cashAmount: finalCashAmount,
            creditAmount: finalCreditAmount,
          },
          purchaserName: purchaserName || undefined,
          description: description || undefined,
          userId: "",
          userName: "",
        },
        auth?.currentUser?.uid || "system",
        auth?.currentUser?.displayName || "System",
      )

      if (saleId) {
        setSuccess(`Sale completed successfully! Transaction ID: ${saleId}`)
        setCart([])
        setSelectedItemId("")
        setQuantity("")
        setPricePerItem("")
        setPaymentCash(true)
        setPaymentCredit(false)
        setCashAmount("")
        setCreditAmount("")
        setPurchaserName("")
        setDescription("")
        fetchItems()
        fetchSales() // Refresh sales list
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const totalQuantity = cart.reduce((sum, item) => sum + item.quantity, 0)
  
  // Calculate grand total from cart items
  const grandTotal = cart.reduce((sum, item) => sum + item.totalPrice, 0)

  // Auto-fill cash amount with grand total when cart changes
  useEffect(() => {
    if (cart.length > 0 && grandTotal > 0) {
      setCashAmount(grandTotal)
      setPaymentCash(true)
      // Reset credit if cash equals total
      if (grandTotal === cashAmount) {
        setCreditAmount("")
        setPaymentCredit(false)
      }
    } else {
      setCashAmount("")
      setCreditAmount("")
      setPaymentCash(true)
      setPaymentCredit(false)
    }
  }, [grandTotal, cart.length])

  // Auto-calculate credit amount when cash amount changes
  useEffect(() => {
    if (grandTotal > 0 && cashAmount !== "" && typeof cashAmount === 'number') {
      const remaining = grandTotal - cashAmount
      if (remaining > 0.01) {
        // There's a remaining amount - set credit
        setCreditAmount(remaining)
        setPaymentCredit(true)
      } else if (remaining < -0.01) {
        // Cash amount exceeds total - reset to total
        setCashAmount(grandTotal)
        setCreditAmount("")
        setPaymentCredit(false)
      } else {
        // Cash equals total (within tolerance)
        setCreditAmount("")
        setPaymentCredit(false)
      }
    } else if (cashAmount === "") {
      // Cash cleared - reset
      setCreditAmount("")
      setPaymentCredit(false)
    }
  }, [cashAmount, grandTotal])

  const handleDateFilter = (start: Date | null, end: Date | null, preset: DatePreset) => {
    setDateFilter({ start, end })
  }

  const exportSalesToPDF = () => {
    const doc = new jsPDF()
    
    // Add title
    doc.setFontSize(18)
    doc.text("Sales Report", 14, 22)
    
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
    if (saleTypeFilter !== "all") filterInfo.push(`Type: ${saleTypeFilter}`)
    if (paymentMethodFilter !== "all") filterInfo.push(`Payment: ${paymentMethodFilter}`)
    if (searchTerm) filterInfo.push(`Search: "${searchTerm}"`)
    if (filterInfo.length > 0) {
      doc.text(`Filters: ${filterInfo.join(", ")}`, 14, 36)
    }
    
    // Prepare table data
    const tableData = filteredSales.map((sale, index) => {
      const date = sale.transactionDate?.toDate 
        ? new Date(sale.transactionDate.toDate()).toLocaleDateString()
        : new Date(sale.transactionDate).toLocaleDateString()
      
      const itemsList = sale.items.map((item) => {
        const prices = []
        if (item.cashPrice) prices.push(`Cash: RS ${item.cashPrice.toFixed(2)}`)
        if (item.creditPrice) prices.push(`Credit: RS ${item.creditPrice.toFixed(2)}`)
        return `${item.name} (x${item.quantity}) - ${prices.join(", ")}`
      }).join("\n")
      
      let paymentInfo = ""
      if (sale.paymentMethod) {
        if (sale.paymentMethod.cash && sale.paymentMethod.credit) {
          paymentInfo = `Cash: RS ${(sale.paymentMethod.cashAmount || 0).toFixed(2)}\nCredit: RS ${(sale.paymentMethod.creditAmount || 0).toFixed(2)}`
        } else if (sale.paymentMethod.cash) {
          paymentInfo = "Cash"
        } else if (sale.paymentMethod.credit) {
          paymentInfo = "Credit"
        }
      }
      
      return [
        `#${(index + 1).toString().padStart(4, '0')}`,
        date,
        sale.type.toUpperCase(),
        sale.purchaserName || "-",
        sale.description || "-",
        itemsList,
        paymentInfo,
        `RS ${sale.totalAmount.toFixed(2)}`
      ]
    })
    
    // Add table
    autoTable(doc, {
      startY: filterInfo.length > 0 ? 42 : 36,
      head: [["#", "Date", "Type", "Purchaser", "Description", "Items", "Payment", "Total"]],
      body: tableData,
      theme: "grid",
      styles: { fontSize: 7, cellPadding: 1.5 },
      headStyles: { fillColor: [59, 130, 246], textColor: 255 },
      columnStyles: {
        0: { cellWidth: 12 },
        1: { cellWidth: 22 },
        2: { cellWidth: 15 },
        3: { cellWidth: 22 },
        4: { cellWidth: 25 },
        5: { cellWidth: 45 },
        6: { cellWidth: 25 },
        7: { cellWidth: 22 }
      }
    })
    
    // Add summary
    const finalY = (doc as any).lastAutoTable.finalY || 42
    doc.setFontSize(12)
    doc.text(`Total Sales: ${filteredSales.length}`, 14, finalY + 10)
    const totalAmount = filteredSales.reduce((sum, sale) => sum + sale.totalAmount, 0)
    doc.text(`Grand Total: RS ${totalAmount.toFixed(2)}`, 14, finalY + 18)
    
    // Save PDF
    const fileName = `sales-report-${new Date().toISOString().split("T")[0]}.pdf`
    doc.save(fileName)
  }

  if (!authReady) {
    return (
      <>
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        </main>
      </>
    )
  }

  if (!currentUserId) {
    return (
      <>
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-8">
            <p className="text-muted-foreground">Please log in to access sales.</p>
          </div>
        </main>
      </>
    )
  }

  return (
    <>
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Sales Management</h1>
          <p className="text-muted-foreground mt-2">Record and view sales transactions</p>
        </div>

        {/* View Toggle */}
        <div className="mb-6 flex gap-2">
          <Button
            onClick={() => setActiveView("record")}
            variant={activeView === "record" ? "default" : "outline"}
          >
            Record Sale
          </Button>
          <Button
            onClick={() => setActiveView("list")}
            variant={activeView === "list" ? "default" : "outline"}
          >
            View All Sales
          </Button>
        </div>

        {/* Record Sale View */}
        {activeView === "record" && (
          <div>

        {/* Sale Type Selector */}
        <Card className="p-6 mb-8">
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                value="retail"
                checked={saleType === "retail"}
                onChange={(e) => setSaleType(e.target.value as "retail" | "wholesale")}
              />
              <span>Retail</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                value="wholesale"
                checked={saleType === "wholesale"}
                onChange={(e) => setSaleType(e.target.value as "retail" | "wholesale")}
              />
              <span>Wholesale</span>
            </label>
          </div>
        </Card>

        {/* Purchaser Information */}
        <Card className="p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">Purchaser Information (Optional)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Purchaser Name (Max 30 characters)</label>
              <Input
                value={purchaserName}
                onChange={(e) => {
                  const value = e.target.value
                  // Only allow letters and spaces, max 30 characters
                  if (value.length <= 30 && /^[a-zA-Z\s]*$/.test(value)) {
                    setPurchaserName(value)
                  }
                }}
                placeholder={purchaserName ? "" : "Enter purchaser name (letters and spaces only)"}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {purchaserName.length}/30 characters (letters and spaces only)
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Description (Max 100 characters)</label>
              <Input
                value={description}
                onChange={(e) => {
                  const value = e.target.value
                  // Allow letters, numbers, spaces, and common punctuation, max 100 characters
                  if (value.length <= 100) {
                    setDescription(value)
                  }
                }}
                placeholder={description ? "" : "Enter sale description"}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {description.length}/100 characters
              </p>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Items Selection */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Add Items to Sale</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Select Item</label>
                  <select
                    value={selectedItemId}
                    onChange={(e) => setSelectedItemId(e.target.value)}
                    className="w-full border-2 border-border/60 hover:border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg p-2 bg-background text-foreground transition-colors outline-none"
                  >
                    <option value="">Choose an item...</option>
                    {items.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} - RS {item.price} ({item.quantity} available)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Quantity *</label>
                  <Input
                    type="text"
                    value={quantity}
                    placeholder="Enter quantity"
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => {
                      const val = e.target.value
                      // Allow only numbers
                      if (val === "" || /^\d+$/.test(val)) {
                        setQuantity(val === "" ? "" : Number.parseInt(val))
                      }
                    }}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Price Per Item (RS) *</label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Enter price per item"
                    value={pricePerItem === "" ? "" : pricePerItem}
                    onChange={(e) => setPricePerItem(e.target.value === "" ? "" : Number.parseFloat(e.target.value))}
                    className="font-semibold"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Total Amount</label>
                  <div className="w-full border-2 border-primary/30 bg-primary/5 rounded-lg p-3">
                    <p className="text-2xl font-bold text-primary">
                      RS {
                        (pricePerItem !== "" && quantity !== "" && typeof quantity === 'number' && typeof pricePerItem === 'number')
                          ? (pricePerItem * quantity).toFixed(2)
                          : "0.00"
                      }
                    </p>
                    {pricePerItem !== "" && quantity !== "" && typeof quantity === 'number' && typeof pricePerItem === 'number' && (
                      <p className="text-xs text-muted-foreground mt-1">
                        RS {pricePerItem.toFixed(2)} × {quantity} units
                      </p>
                    )}
                  </div>
                </div>
                {error && <div className="text-red-600 text-sm">{error}</div>}
                {success && <div className="text-green-600 text-sm">{success}</div>}
                <Button onClick={handleAddToCart} className="w-full">
                  Add to Cart
                </Button>
              </div>
            </Card>

            {/* Cart Items */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Cart Items</h2>
              {cart.length === 0 ? (
                <p className="text-muted-foreground">No items in cart</p>
              ) : (
                <div className="space-y-3">
                  {cart.map((item) => (
                    <div key={item.itemId} className="flex justify-between items-center p-4 bg-muted/30 rounded-lg border border-border">
                      <div className="flex-1">
                        <p className="font-semibold text-lg">{item.itemName}</p>
                        <div className="flex items-center gap-3 mt-2 text-sm">
                          <span className="text-muted-foreground">
                            Qty: <span className="font-semibold text-foreground">{item.quantity}</span>
                          </span>
                          <span className="text-muted-foreground">×</span>
                          <span className="text-muted-foreground">
                            Price: <span className="font-semibold text-foreground">RS {item.pricePerUnit.toFixed(2)}</span>
                          </span>
                          <span className="text-muted-foreground">=</span>
                          <span className="text-primary font-bold">
                            RS {item.totalPrice.toFixed(2)}
                          </span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                        onClick={() => handleRemoveFromCart(item.itemId)}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Order Summary */}
          <div>
            <Card className="p-6 sticky top-20">
              <h2 className="text-lg font-semibold mb-4">Order Summary</h2>
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm p-2 bg-muted/50 rounded">
                  <span className="text-muted-foreground">Items:</span>
                  <span className="font-semibold">{cart.length}</span>
                </div>
                <div className="flex justify-between text-sm p-2 bg-muted/50 rounded">
                  <span className="text-muted-foreground">Total Quantity:</span>
                  <span className="font-semibold">{totalQuantity}</span>
                </div>
                <div className="border-t-2 border-primary/30 pt-3 mt-3">
                  <div className="flex justify-between items-center p-3 bg-primary/10 rounded-lg">
                    <span className="font-semibold">Grand Total:</span>
                    <span className="text-3xl font-bold text-primary">RS {grandTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Payment Method Selection */}
              <div className="mb-6 p-4 bg-muted/30 rounded-lg border border-border">
                <h3 className="text-sm font-semibold mb-3">💰 Payment Method</h3>
                <p className="text-xs text-muted-foreground mb-3">
                  Cash is selected by default. Reduce cash amount to split with credit.
                </p>
                <div className="space-y-4">
                  <div>
                    <label className="flex items-center gap-2 cursor-pointer mb-2">
                      <input
                        type="checkbox"
                        checked={paymentCash}
                        onChange={(e) => {
                          setPaymentCash(e.target.checked)
                          if (!e.target.checked) {
                            setCashAmount("")
                            // If unchecking cash, set credit to full amount
                            if (grandTotal > 0) {
                              setCreditAmount(grandTotal)
                              setPaymentCredit(true)
                            }
                          } else {
                            // If checking cash, set to full amount
                            setCashAmount(grandTotal)
                            setCreditAmount("")
                            setPaymentCredit(false)
                          }
                        }}
                        disabled={cart.length === 0}
                        className="w-4 h-4"
                      />
                      <span className="text-sm font-medium">💵 Cash Payment</span>
                    </label>
                    {paymentCash && (
                      <div>
                        <Input
                          type="number"
                          min="0"
                          max={grandTotal}
                          step="0.01"
                          placeholder="Enter cash amount"
                          value={cashAmount === "" ? "" : cashAmount}
                          onChange={(e) => setCashAmount(e.target.value === "" ? "" : Number.parseFloat(e.target.value))}
                          className="mt-2 font-semibold"
                        />
                        {cashAmount !== "" && typeof cashAmount === 'number' && (
                          <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                            Cash: RS {cashAmount.toFixed(2)}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <label className="flex items-center gap-2 cursor-pointer mb-2">
                      <input
                        type="checkbox"
                        checked={paymentCredit}
                        onChange={(e) => {
                          setPaymentCredit(e.target.checked)
                          if (!e.target.checked) setCreditAmount("")
                        }}
                        disabled={cart.length === 0}
                        className="w-4 h-4"
                      />
                      <span className="text-sm font-medium">💳 Credit Payment</span>
                      {creditAmount !== "" && typeof creditAmount === 'number' && creditAmount > 0 && (
                        <span className="text-xs text-blue-600 dark:text-blue-400 ml-2">
                          (Auto-calculated)
                        </span>
                      )}
                    </label>
                    {paymentCredit && (
                      <div>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="Credit amount"
                          value={creditAmount === "" ? "" : creditAmount}
                          onChange={(e) => {
                            const newCreditAmount = e.target.value === "" ? "" : Number.parseFloat(e.target.value)
                            setCreditAmount(newCreditAmount)
                            // Adjust cash amount accordingly
                            if (newCreditAmount !== "" && typeof newCreditAmount === 'number') {
                              const newCashAmount = grandTotal - newCreditAmount
                              if (newCashAmount >= 0) {
                                setCashAmount(newCashAmount)
                              }
                            }
                          }}
                          className="mt-2 font-semibold bg-blue-50 dark:bg-blue-950/20"
                        />
                        {creditAmount !== "" && typeof creditAmount === 'number' && (
                          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                            Credit: RS {creditAmount.toFixed(2)}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                
                {cart.length === 0 && (
                  <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-3">
                    Add items to cart first
                  </p>
                )}
                
                {paymentCash && paymentCredit && cashAmount !== "" && creditAmount !== "" && (
                  <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/30 rounded border border-blue-200 dark:border-blue-800">
                    <p className="text-xs font-semibold text-blue-900 dark:text-blue-100">
                      💡 Split Payment:
                    </p>
                    <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                      Cash: RS {typeof cashAmount === 'number' ? cashAmount.toFixed(2) : '0.00'} + Credit: RS {typeof creditAmount === 'number' ? creditAmount.toFixed(2) : '0.00'} = RS {grandTotal.toFixed(2)}
                    </p>
                  </div>
                )}
              </div>


              <Button onClick={handleCompleteSale} disabled={isLoading || cart.length === 0} className="w-full">
                {isLoading ? "Processing..." : "Complete Sale"}
              </Button>
            </Card>
          </div>
        </div>
        </div>
        )}

        {/* Sales List View */}
        {activeView === "list" && (
          <div className="space-y-6">
            {/* Date Filter */}
            <DateFilter onFilter={handleDateFilter} />

            {/* Filters */}
            <Card className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Search */}
                <div>
                  <label className="block text-sm font-medium mb-2">Search</label>
                  <Input
                    type="text"
                    placeholder="Search by user, item, purchaser, or description..."
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
            </Card>

            {/* Sales List */}
            <Card className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Sales List</h2>
                <div className="flex items-center gap-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {filteredSales.length} of {sales.length} sales
                  </div>
                  <Button onClick={exportSalesToPDF} disabled={filteredSales.length === 0}>
                    Export PDF
                  </Button>
                </div>
              </div>

              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Loading sales...</div>
              ) : filteredSales.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No sales found</div>
              ) : (
                <div className="space-y-4">
                  {filteredSales.map((sale, index) => (
                    <div key={sale.id} className="border border-border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                      <div className="flex flex-wrap justify-between items-start gap-4 mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold">#{(index + 1).toString().padStart(4, '0')}</span>
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                              sale.type === "wholesale" 
                                ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                                : "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                            }`}>
                              {sale.type.toUpperCase()}
                            </span>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {sale.transactionDate?.toDate ? 
                              new Date(sale.transactionDate.toDate()).toLocaleString() :
                              new Date(sale.transactionDate).toLocaleString()
                            }
                          </div>
                          <div className="text-sm text-muted-foreground">
                            By: {sale.userName || "Unknown"}
                          </div>
                          {sale.purchaserName && (
                            <div className="text-sm text-muted-foreground">
                              Purchaser: {sale.purchaserName}
                            </div>
                          )}
                          {sale.description && (
                            <div className="text-sm text-muted-foreground">
                              Description: {sale.description}
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-primary">
                            RS {sale.totalAmount.toFixed(2)}
                          </div>
                          <div className="text-sm">
                            {sale.paymentMethod ? (
                              sale.paymentMethod.cash && sale.paymentMethod.credit ? (
                                <div className="space-y-1">
                                  <div className="text-green-600 dark:text-green-400">
                                    Cash: RS {(sale.paymentMethod.cashAmount || 0).toFixed(2)}
                                  </div>
                                  <div className="text-blue-600 dark:text-blue-400">
                                    Credit: RS {(sale.paymentMethod.creditAmount || 0).toFixed(2)}
                                  </div>
                                </div>
                              ) : sale.paymentMethod.cash ? (
                                <div className="text-green-600 dark:text-green-400">Cash Payment</div>
                              ) : (
                                <div className="text-blue-600 dark:text-blue-400">Credit Payment</div>
                              )
                            ) : (
                              <div className="text-muted-foreground">No payment info</div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Items */}
                      <div className="mt-3 pt-3 border-t border-border">
                        <div className="text-sm font-medium mb-2">Items:</div>
                        <div className="space-y-1">
                          {sale.items.map((item, idx) => (
                            <div key={idx} className="text-sm text-muted-foreground flex justify-between">
                              <span>
                                {item.itemName} × {item.quantity}
                              </span>
                              <span className="flex gap-2">
                                {item.cashPrice !== undefined && (
                                  <span className="text-green-600 dark:text-green-400">
                                    Cash: RS {item.cashPrice.toFixed(2)}
                                  </span>
                                )}
                                {item.creditPrice !== undefined && (
                                  <span className="text-blue-600 dark:text-blue-400">
                                    Credit: RS {item.creditPrice.toFixed(2)}
                                  </span>
                                )}
                                {item.cashPrice === undefined && item.creditPrice === undefined && (
                                  <span>RS {item.pricePerUnit.toFixed(2)}</span>
                                )}
                              </span>
                            </div>
                          ))}
                        </div>
                        <div className="text-sm font-medium mt-2">
                          Total Items: {sale.items.reduce((sum, item) => sum + item.quantity, 0)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}
      </main>
    </>
  )
}

export default function Sales() {
  return <SalesContent />
}
