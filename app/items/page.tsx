"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { db, auth } from "@/lib/firebase"
import { collection, getDocs } from "firebase/firestore"
import { Navbar } from "@/components/navbar"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { addItem, updateItem, deleteItem, type Item } from "@/lib/items"

function ItemsContent() {
  const [items, setItems] = useState<Item[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    price: 0,
    quantity: 0,
    sku: "",
    description: "",
  })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    fetchItems()
  }, [])

  const fetchItems = async () => {
    try {
      setLoading(true)
      console.log("[v0] Fetching items from Firebase...")
      const snapshot = await getDocs(collection(db, "items"))
      const itemsList = snapshot.docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data(),
          }) as Item,
      )
      console.log("[v0] Fetched items:", itemsList.length)
      setItems(itemsList)
      setError("")
    } catch (error) {
      console.error("Error fetching items:", error)
      setError("Failed to load items")
    } finally {
      setLoading(false)
    }
  }

  const skuExists = (sku: string, excludeId?: string) => {
    return items.some((item) => item.sku.toUpperCase() === sku.toUpperCase() && item.id !== excludeId)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsSubmitting(true)

    try {
      if (!formData.name || !formData.sku || formData.price < 0 || formData.quantity < 0) {
        setError("Please fill in all required fields (Name, SKU, Price, Quantity)")
        setIsSubmitting(false)
        return
      }

      if (skuExists(formData.sku, editingId ?? undefined)) {
        setError(`SKU "${formData.sku}" already exists. Please use a different SKU.`)
        setIsSubmitting(false)
        return
      }

      if (editingId) {
        await updateItem(editingId, formData, auth.currentUser?.uid || "system")
      } else {
        await addItem(formData, auth.currentUser?.uid || "system", auth.currentUser?.displayName || "System")
      }

      setFormData({ name: "", price: 0, quantity: 0, sku: "", description: "" })
      setEditingId(null)
      setIsAdding(false)
      setError("")
      await fetchItems()
    } catch (err: any) {
      console.error("[v0] Error:", err.message)
      if (err.name === "DuplicateSKU" || err.message?.includes("SKU already exists")) {
        setError(`SKU "${formData.sku}" already exists in the database. Please use a different SKU.`)
      } else {
        setError(err.message || "Failed to save item")
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (item: Item) => {
    setFormData({
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      sku: item.sku,
      description: item.description,
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

  const filteredItems = items.filter(
    (item) =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchTerm.toLowerCase()),
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
                <label className="block text-sm font-medium mb-1">Item Name *</label>
                <Input
                  type="text"
                  placeholder="Product name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">SKU *</label>
                <Input
                  type="text"
                  placeholder="SKU-001"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
                  required
                />
                {formData.sku && skuExists(formData.sku, editingId ?? undefined) && (
                  <p className="text-red-600 text-xs mt-1">This SKU already exists</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Price ($) *</label>
                <Input
                  type="number"
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: Number.parseFloat(e.target.value) || 0 })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Quantity *</label>
                <Input
                  type="number"
                  placeholder="0"
                  min="0"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: Number.parseInt(e.target.value) || 0 })}
                  required
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  placeholder="Item description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full border border-input rounded-lg p-2 bg-background text-foreground"
                  rows={3}
                />
              </div>
              {error && <div className="md:col-span-2 text-red-600 text-sm font-medium">{error}</div>}
              <div className="md:col-span-2 flex gap-2">
                <Button type="submit" className="flex-1" disabled={skuExists(formData.sku, editingId ?? undefined) || isSubmitting}>
                  {isSubmitting ? "Saving..." : editingId ? "Update Item" : "Add Item"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setFormData({ name: "", price: 0, quantity: 0, sku: "", description: "" })
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

        {/* Search */}
        <div className="mb-6">
          <Input
            type="text"
            placeholder="Search by name or SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md"
          />
        </div>

        {/* Items Grid */}
        {loading ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">Loading items...</p>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredItems.map((item) => (
                <Card key={item.id} className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-semibold text-foreground">{item.name}</h3>
                      <p className="text-sm text-muted-foreground">SKU: {item.sku}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => handleEdit(item)}>
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 bg-transparent"
                        onClick={() => handleDelete(item.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Price:</span>
                      <span className="font-semibold">${item.price.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Quantity:</span>
                      <span className="font-semibold">{item.quantity} units</span>
                    </div>
                    <div className="pt-2 border-t border-border">
                      <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {filteredItems.length === 0 && (
              <Card className="p-12 text-center">
                <p className="text-muted-foreground">
                  {items.length === 0
                    ? "No items found. Start by adding your first item!"
                    : "No items match your search."}
                </p>
              </Card>
            )}
          </>
        )}
      </main>
    </>
  )
}

export default function Items() {
  return <ItemsContent />
}
