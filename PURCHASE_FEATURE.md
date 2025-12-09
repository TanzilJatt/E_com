# Purchase Management Feature

## Overview
The Purchase Management feature allows users to record purchases of inventory items. This includes both purchasing existing items to restock inventory and adding completely new items that are automatically added to the inventory.

## Features

### 1. Two Purchase Modes

#### Purchase Existing Items
- Select items from your current inventory
- Specify quantity and unit cost
- Update stock levels automatically
- Track purchase history

#### Add New Items
- Create new items directly from purchase page
- Set initial pricing (retail & wholesale)
- Auto-generate SKU
- Automatically add to inventory
- Record purchase in one step

### 2. Supplier Management
- Record supplier name (required)
- Optional supplier contact information
- Track purchases by supplier

### 3. Purchase Cart
- Add multiple items to a purchase order
- Review before submitting
- See total purchase cost
- Remove items if needed

### 4. Purchase History
- View all past purchases
- See purchase date and details
- Track total spend by supplier
- Review item details for each purchase

### 5. Additional Notes
- Add optional notes to purchases
- Record special instructions
- Document payment terms

## User Flow

### Purchasing Existing Items
1. Navigate to Purchase page from navbar
2. Select "Purchase Existing Items"
3. Enter supplier information
4. Select item from dropdown
5. Enter quantity and unit cost
6. Click "Add to Cart"
7. Repeat for multiple items
8. Add optional notes
9. Click "Complete Purchase"

### Adding New Items
1. Navigate to Purchase page
2. Select "Add New Items"
3. Enter supplier information
4. Fill in item details:
   - Item name
   - Category
   - Quantity
   - Unit cost
   - Retail price
   - Wholesale price
   - Description (optional)
5. Click "Add to Cart & Inventory"
6. Item is automatically created in inventory
7. Add optional notes
8. Click "Complete Purchase"

## Data Structure

### Purchase Document
```typescript
{
  id: string
  userId: string
  supplierName: string
  supplierContact?: string
  items: [{
    itemId: string
    itemName: string
    sku: string
    quantity: number
    unitCost: number
    totalCost: number
  }]
  totalAmount: number
  purchaseDate: Timestamp
  notes?: string
  createdAt: Timestamp
}
```

## Security
- Users can only view their own purchases
- Firestore rules enforce user-level data isolation
- All purchase data is protected by authentication

## Integration

### Items Collection
- New items from purchases are automatically added
- SKU is auto-generated
- Initial quantity is set based on purchase

### Activity Logs
- Purchase activities are logged
- Tracks supplier and item count

## Files Modified/Created

### New Files
- `/app/purchase/page.tsx` - Purchase page UI
- `/lib/purchases.ts` - Purchase data management
- `PURCHASE_FEATURE.md` - This documentation

### Modified Files
- `/components/navbar.tsx` - Added Purchase link
- `/firestore.rules` - Added purchases collection rules
- `/firestore.indexes.json` - Added purchases index

## Database Indexes Required
A composite index on the `purchases` collection is required:
- `userId` (Ascending)
- `purchaseDate` (Descending)

Deploy using:
```bash
firebase deploy --only firestore:indexes
```

Or create manually in Firebase Console using the link provided in console errors.

## Notes
- Purchase dates are automatically timestamped
- All monetary values are in RS (Rupees)
- Purchases cannot be edited after creation (for audit purposes)
- Item quantities are updated after purchase completion

