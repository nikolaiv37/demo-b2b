# Cart & Quote Request Implementation

## ✅ Completed Features

### 1. Cart System (Logged-in Users Only)
- ✅ **Add to Cart Button** on every product card in `/dashboard/products`
- ✅ **Quantity Input** with up/down arrows (max = stock quantity)
- ✅ **Cart Drawer** (shadcn/ui Sheet, slides from right) with:
  - Product image + name + SKU
  - Quantity controls (+ / – / remove)
  - Line total (weboffer_price × qty)
  - Grand total at bottom
- ✅ **Cart Icon** in top-right header with red badge showing item count
- ✅ **Cart persists in localStorage** (using Zustand persist middleware)

### 2. Request Quote Flow
- ✅ **"Request Quote" Button** in cart drawer
- ✅ **Quote Request Modal** with:
  - Pre-filled company name & email from current user
  - Optional notes textarea
  - List of all cart items with qty + price
  - Total amount
- ✅ **Submit** → creates row in Supabase `quotes` table with:
  - `user_id`, `company_name`, `email`, `phone` (nullable), `notes`, `items` (JSONB), `total`, `status: "new"`, `created_at`
- ✅ **On Success**: Shows toast "Quote sent successfully!", empties cart, closes drawer

### 3. Database
- ✅ **Created `quotes` table** with proper columns + RLS
  - Only owner can view/insert/update their own quotes
  - Supports dev mode with TEXT user_id

### 4. Polish
- ✅ **Disable "Add to Cart"** when stock = 0
- ✅ **"Out of Stock" badge** on product cards
- ✅ **Loading skeletons** while fetching products (already implemented)

## 📁 Files Created/Modified

### New Components
- `src/components/ui/sheet.tsx` - Sheet/Drawer component (Radix UI)
- `src/components/ui/textarea.tsx` - Textarea component
- `src/components/CartDrawer.tsx` - Cart drawer with product list
- `src/components/QuoteRequestModal.tsx` - Quote request form modal

### Modified Components
- `src/components/ProductGridCard.tsx` - Added Add to Cart button, quantity input, out of stock handling
- `src/app/dashboard/layout.tsx` - Added cart icon in header, integrated cart drawer and quote modal
- `src/stores/cartStore.ts` - Updated to use `weboffer_price` instead of tiered pricing

### Database Migration
- `supabase/create-quotes-table.sql` - Creates quotes table with RLS policies

## 🚀 How to Use

### 1. Run Database Migration
```sql
-- In Supabase Dashboard → SQL Editor
-- Run: supabase/create-quotes-table.sql
```

### 2. Start Development Server
```bash
npm run dev
```

### 3. Test the Flow
1. Navigate to `/dashboard/products`
2. Click "Add to Cart" on any product (with stock > 0)
3. Adjust quantity using +/- buttons
4. Click cart icon in top-right header
5. Review cart items in drawer
6. Click "Request Quote"
7. Fill in notes (optional)
8. Click "Submit Quote Request"
9. See success toast and cart empties

## 🎯 Key Features

### Cart Store
- Uses `weboffer_price` (wholesale price) for all calculations
- Validates stock availability before adding/updating
- Persists to localStorage automatically
- Type-safe with TypeScript

### Quote System
- Stores quote requests in `quotes` table
- Items stored as JSONB for flexibility
- Status workflow: `new` → `pending` → `approved`/`rejected`
- Supports dev mode (no auth required)

### UI/UX
- Smooth drawer animations
- Real-time cart badge updates
- Loading states during quote submission
- Clear error messages
- Responsive design

## 📝 Notes

- Cart uses `weboffer_price` field from products table
- Stock validation prevents adding more than available quantity
- Out of stock products show badge and disable Add to Cart button
- Quote requests are stored with full product details in JSONB format
- RLS policies ensure users can only see their own quotes

## 🔄 Next Steps (Future Enhancements)

- Move cart to database (currently localStorage)
- Add quote status management UI
- Email notifications on quote submission
- Quote approval/rejection workflow
- Quote history page
- Bulk quote operations

