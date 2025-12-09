"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Navbar } from "@/components/navbar"
import { createPurchase, getPurchases, type Purchase, type PurchaseItem } from "@/lib/purchases"
import { getItems, addItem, type Item } from "@/lib/items"
import { auth } from "@/lib/firebase"
import { onAuthStateChanged } from "firebase/auth"
import { useRouter } from "next/navigation"

type PurchaseMode = "existing" | "new"

interface CartItem extends PurchaseItem {}

interface NewItemForm {
  itemName: string
  quantity: number
  unitCost: number
  price: number
  description: string
}

function PurchaseContent() {
  const router = useRouter()
  const [mode, setMode] = useState<PurchaseMode>("existing")
  const [items, setItems] = useState<Item[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [activeView, setActiveView] = useState<"record" | "view">("record")

  // Supplier details
  const [supplierName, setSupplierName] = useState("")
  const [supplierContact, setSupplierContact] = useState("")
  const [notes, setNotes] = useState("")

  // Existing item purchase
  const [selectedItem, setSelectedItem] = useState<string>("")
  const [quantity, setQuantity] = useState("")
  const [unitCost, setUnitCost] = useState("")

  // New item form
  const [newItem, setNewItem] = useState<NewItemForm>({
    itemName: "",
    quantity: 1,
    unitCost: 0,
    price: 0,
    description: "",
  })

  const [userId, setUserId] = useState<string | null>(null)

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
    } catch (err) {
      console.error("Error fetching purchases:", err)
    }
  }

  const handleAddExistingItem = () => {
    if (!selectedItem || !quantity || !unitCost) {
      setError("Please fill all fields")
      return
    }

    const item = items.find((i) => i.id === selectedItem)
    if (!item) {
      setError("Item not found")
      return
    }

    const qty = parseInt(quantity)
    const cost = parseFloat(unitCost)

    const cartItem: CartItem = {
      itemId: item.id,
      itemName: item.name,
      sku: item.sku,
      quantity: qty,
      unitCost: cost,
      totalCost: qty * cost,
    }

    setCart([...cart, cartItem])
    setSelectedItem("")
    setQuantity("")
    setUnitCost("")
    setError("")
  }

  const handleAddNewItem = async () => {
    if (!userId) return

    if (!newItem.itemName || newItem.quantity <= 0 || newItem.unitCost <= 0 || newItem.price <= 0) {
      setError("Please fill all required fields")
      return
    }

    try {
      // Create the new item in inventory
      const userName = auth.currentUser?.displayName || auth.currentUser?.email || "User"
      const itemId = await addItem(
        {
          name: newItem.itemName,
          price: newItem.price,
          quantity: 0, // Initial quantity is 0, will be updated after purchase
          description: newItem.description,
        },
        userId,
        userName
      )

      if (!itemId) {
        throw new Error("Failed to create item")
      }

      // Add to cart with auto-generated SKU
      const cartItem: CartItem = {
        itemId: itemId,
        itemName: newItem.itemName,
        sku: "Auto-generated", // Will be replaced with actual SKU
        quantity: newItem.quantity,
        unitCost: newItem.unitCost,
        totalCost: newItem.quantity * newItem.unitCost,
      }

      setCart([...cart, cartItem])

      // Reset form
      setNewItem({
        itemName: "",
        quantity: 1,
        unitCost: 0,
        price: 0,
        description: "",
      })

      setSuccess("New item added to cart and inventory!")
      setError("")

      // Refresh items list
      await fetchItems()

      setTimeout(() => setSuccess(""), 3000)
    } catch (err) {
      console.error("Error adding new item:", err)
      setError("Failed to add new item")
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

    if (!supplierName) {
      setError("Please enter supplier name")
      return
    }

    if (cart.length === 0) {
      setError("Please add items to purchase")
      return
    }

    try {
      await createPurchase(userId, {
        supplierName,
        supplierContact,
        items: cart,
        totalAmount: calculateTotal(),
        notes,
      })

      setSuccess("Purchase recorded successfully!")
      
      // Reset form
      setCart([])
      setSupplierName("")
      setSupplierContact("")
      setNotes("")
      setError("")

      // Refresh purchases list
      await fetchPurchases()

      setTimeout(() => {
        setSuccess("")
        setActiveView("view")
      }, 2000)
    } catch (err) {
      console.error("Error recording purchase:", err)
      setError("Failed to record purchase")
    }
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
      <main className="container mx-auto p-6 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Purchase Management</h1>
          <p className="text-muted-foreground mt-2">Record purchases and add new inventory items</p>
        </div>

        {/* View Toggle */}
        <Card className="p-4 mb-6">
          <div className="flex gap-4">
            <Button
              variant={activeView === "record" ? "default" : "outline"}
              onClick={() => setActiveView("record")}
            >
              Record Purchase
            </Button>
            <Button
              variant={activeView === "view" ? "default" : "outline"}
              onClick={() => setActiveView("view")}
            >
              View All Purchases
            </Button>
          </div>
        </Card>

        {activeView === "record" ? (
          <>
            {/* Purchase Mode Selector */}
            <Card className="p-6 mb-6">
              <h2 className="text-lg font-semibold mb-4">Purchase Type</h2>
              <div className="flex gap-4">
                <Button
                  variant={mode === "existing" ? "default" : "outline"}
                  onClick={() => setMode("existing")}
                >
                  Purchase Existing Items
                </Button>
                <Button
                  variant={mode === "new" ? "default" : "outline"}
                  onClick={() => setMode("new")}
                >
                  Add New Items
                </Button>
              </div>
            </Card>

            {/* Supplier Details */}
            <Card className="p-6 mb-6">
              <h2 className="text-lg font-semibold mb-4">Supplier Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Supplier Name *</label>
                  <Input
                    value={supplierName}
                    onChange={(e) => setSupplierName(e.target.value)}
                    placeholder="Enter supplier name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Contact (Optional)</label>
                  <Input
                    value={supplierContact}
                    onChange={(e) => setSupplierContact(e.target.value)}
                    placeholder="Phone or email"
                  />
                </div>
              </div>
            </Card>

            {/* Add Items Section */}
            {mode === "existing" ? (
              <Card className="p-6 mb-6">
                <h2 className="text-lg font-semibold mb-4">Add Existing Items to Purchase</h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-2">Select Item</label>
                    <select
                      value={selectedItem}
                      onChange={(e) => setSelectedItem(e.target.value)}
                      className="w-full border-2 border-border/60 hover:border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg p-2 bg-background text-foreground transition-colors outline-none"
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
                    <label className="block text-sm font-medium mb-2">Quantity</label>
                    <Input
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      placeholder="1"
                      min="1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Unit Cost (RS)</label>
                    <Input
                      type="number"
                      value={unitCost}
                      onChange={(e) => setUnitCost(e.target.value)}
                      placeholder="00.0"
                      step="0.01"
                    />
                  </div>
                </div>
                <Button onClick={handleAddExistingItem} className="mt-4">
                  Add to Cart
                </Button>
              </Card>
            ) : (
              <Card className="p-6 mb-6">
                <h2 className="text-lg font-semibold mb-4">Add New Item to Inventory</h2>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Item Name *</label>
                      <Input
                        value={newItem.itemName}
                        onChange={(e) => setNewItem({ ...newItem, itemName: e.target.value })}
                        placeholder="Enter item name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Selling Price (RS) *</label>
                      <Input
                        type="number"
                        value={newItem.price}
                        onChange={(e) => setNewItem({ ...newItem, price: parseFloat(e.target.value) || 0 })}
                        placeholder="00.0"
                        step="0.01"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Purchase Quantity *</label>
                      <Input
                        type="number"
                        value={newItem.quantity}
                        onChange={(e) => setNewItem({ ...newItem, quantity: parseInt(e.target.value) || 0 })}
                        placeholder="1"
                        min="1"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Unit Cost (RS) *</label>
                      <Input
                        type="number"
                        value={newItem.unitCost}
                        onChange={(e) => setNewItem({ ...newItem, unitCost: parseFloat(e.target.value) || 0 })}
                        placeholder="00.0"
                        step="0.01"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Description (Optional)</label>
                    <Textarea
                      value={newItem.description}
                      onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                      placeholder="Enter item description..."
                      rows={3}
                    />
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                    <p className="text-sm text-blue-800 dark:text-blue-300">
                      ℹ️ <strong>Note:</strong> SKU will be auto-generated. This item will be automatically added to your inventory.
                    </p>
                  </div>
                </div>
                <Button onClick={handleAddNewItem} className="mt-4">
                  Add to Cart & Inventory
                </Button>
              </Card>
            )}

            {/* Cart */}
            {cart.length > 0 && (
              <Card className="p-6 mb-6">
                <h2 className="text-lg font-semibold mb-4">Purchase Cart</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 px-2">Item</th>
                        <th className="text-left py-2 px-2">SKU</th>
                        <th className="text-right py-2 px-2">Qty</th>
                        <th className="text-right py-2 px-2">Unit Cost</th>
                        <th className="text-right py-2 px-2">Total</th>
                        <th className="text-right py-2 px-2">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cart.map((item, index) => (
                        <tr key={index} className="border-b border-border">
                          <td className="py-2 px-2">{item.itemName}</td>
                          <td className="py-2 px-2 text-xs font-mono">{item.sku}</td>
                          <td className="py-2 px-2 text-right">{item.quantity}</td>
                          <td className="py-2 px-2 text-right">RS {item.unitCost.toFixed(2)}</td>
                          <td className="py-2 px-2 text-right font-semibold">RS {item.totalCost.toFixed(2)}</td>
                          <td className="py-2 px-2 text-right">
                            <Button variant="destructive" size="sm" onClick={() => handleRemoveFromCart(index)}>
                              Remove
                            </Button>
                          </td>
                        </tr>
                      ))}
                      <tr className="font-bold">
                        <td colSpan={4} className="py-3 px-2 text-right">
                          Total Amount:
                        </td>
                        <td className="py-3 px-2 text-right text-lg">RS {calculateTotal().toFixed(2)}</td>
                        <td></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {/* Notes */}
            <Card className="p-6 mb-6">
              <h2 className="text-lg font-semibold mb-4">Additional Notes (Optional)</h2>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes about this purchase..."
                rows={3}
              />
            </Card>

            {/* Messages */}
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 p-4 rounded-lg mb-4">
                {error}
              </div>
            )}
            {success && (
              <div className="bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 p-4 rounded-lg mb-4">
                {success}
              </div>
            )}

            {/* Submit Button */}
            <Button onClick={handleSubmitPurchase} className="w-full" size="lg" disabled={cart.length === 0}>
              Complete Purchase
            </Button>
          </>
        ) : (
          /* Purchase History */
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Purchase History</h2>
            {purchases.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No purchases recorded yet</div>
            ) : (
              <div className="space-y-4">
                {purchases.map((purchase) => {
                  const purchaseDate = purchase.purchaseDate?.toDate
                    ? purchase.purchaseDate.toDate()
                    : new Date()

                  return (
                    <Card key={purchase.id} className="p-4 border-2">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-semibold text-lg">{purchase.supplierName}</h3>
                          <p className="text-sm text-muted-foreground">
                            {purchaseDate.toLocaleDateString("en-GB", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </p>
                          {purchase.supplierContact && (
                            <p className="text-sm text-muted-foreground">Contact: {purchase.supplierContact}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-primary">RS {purchase.totalAmount.toFixed(2)}</div>
                          <div className="text-sm text-muted-foreground">{purchase.items.length} items</div>
                        </div>
                      </div>

                      <div className="border-t pt-3">
                        <h4 className="font-medium text-sm mb-2">Items:</h4>
                        <div className="space-y-1">
                          {purchase.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between text-sm">
                              <span>
                                {item.itemName} ({item.sku}) x {item.quantity}
                              </span>
                              <span className="font-medium">RS {item.totalCost.toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {purchase.notes && (
                        <div className="border-t pt-3 mt-3">
                          <p className="text-sm text-muted-foreground">
                            <strong>Notes:</strong> {purchase.notes}
                          </p>
                        </div>
                      )}
                    </Card>
                  )
                })}
              </div>
            )}
          </Card>
        )}
      </main>
    </>
  )
}

export default function Purchase() {
  return <PurchaseContent />
}

