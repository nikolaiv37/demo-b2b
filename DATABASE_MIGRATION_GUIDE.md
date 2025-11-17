# 🗄️ Database Migration Guide - Products Table Update

## Problem
The original schema used `company_id`, but the actual CSV import needs `supplier_id` to match the megapap.csv format.

## Solution
Run the migration to update your products table structure.

## Steps to Migrate

### 1. Backup Your Data (IMPORTANT!)
If you have existing products, export them first:
```sql
-- Run this in Supabase SQL Editor to backup
SELECT * FROM products;
```
Download the results as CSV if needed.

### 2. Run the Migration

Go to your **Supabase Dashboard** → **SQL Editor** and run:

```sql
-- Option A: If starting fresh (DELETES ALL PRODUCTS!)
DROP TABLE IF EXISTS products CASCADE;
```

Then run the entire `supabase/migration-update-products-table.sql` file.

**OR**

```sql
-- Option B: If you want to keep existing data and just add columns
-- Add new columns if they don't exist
ALTER TABLE products ADD COLUMN IF NOT EXISTS supplier_id TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS model TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS weboffer_price DECIMAL(10, 2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS manufacturer TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS availability TEXT DEFAULT 'In Stock';
ALTER TABLE products ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS weight DECIMAL(10, 4);
ALTER TABLE products ADD COLUMN IF NOT EXISTS transportational_weight DECIMAL(10, 4);
ALTER TABLE products ADD COLUMN IF NOT EXISTS date_expected TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS main_image TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_visible BOOLEAN DEFAULT true;

-- If you have company_id, migrate it to supplier_id
UPDATE products SET supplier_id = company_id WHERE supplier_id IS NULL;

-- Make supplier_id NOT NULL after migration
ALTER TABLE products ALTER COLUMN supplier_id SET NOT NULL;

-- Update SKU unique constraint
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_company_id_sku_key;
ALTER TABLE products ADD CONSTRAINT products_sku_unique UNIQUE (sku);
```

### 3. Update Row Level Security

Run these policies (they're included in the migration file):

```sql
-- Drop old policies if they exist
DROP POLICY IF EXISTS "Anyone can view products" ON products;
DROP POLICY IF EXISTS "Users can insert products in their company" ON products;
DROP POLICY IF EXISTS "Users can update products in their company" ON products;
DROP POLICY IF EXISTS "Users can delete products in their company" ON products;

-- Create new policies
CREATE POLICY "Anyone can view visible products"
    ON products FOR SELECT
    USING (is_visible = true OR supplier_id = auth.uid()::text);

CREATE POLICY "Authenticated users can insert products"
    ON products FOR INSERT
    WITH CHECK (auth.uid()::text = supplier_id);

CREATE POLICY "Suppliers can update their own products"
    ON products FOR UPDATE
    USING (auth.uid()::text = supplier_id);

CREATE POLICY "Suppliers can delete their own products"
    ON products FOR DELETE
    USING (auth.uid()::text = supplier_id);
```

### 4. Verify the Migration

Check that the table structure is correct:

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'products'
ORDER BY ordinal_position;
```

You should see columns like: `supplier_id`, `model`, `sku`, `weboffer_price`, `manufacturer`, etc.

### 5. Test CSV Import

1. Start your dev server: `npm run dev`
2. Navigate to `/dashboard/csv-import`
3. Upload the `megapap.csv` file
4. Click "Confirm Import"
5. Products should import successfully!

## Expected Table Structure After Migration

```
products
├── id (SERIAL PRIMARY KEY)
├── supplier_id (TEXT NOT NULL)
├── model (TEXT)
├── sku (TEXT NOT NULL UNIQUE)
├── retail_price (DECIMAL)
├── weboffer_price (DECIMAL NOT NULL)
├── name (TEXT NOT NULL)
├── name_bg (TEXT)
├── category (TEXT)
├── manufacturer (TEXT)
├── description (TEXT)
├── description_bg (TEXT)
├── availability (TEXT)
├── quantity (INTEGER)
├── weight (DECIMAL)
├── transportational_weight (DECIMAL)
├── date_expected (TEXT)
├── main_image (TEXT)
├── images (TEXT[])
├── is_visible (BOOLEAN)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)
```

## Troubleshooting

### Error: "column products.company_id does not exist"
✅ **Fixed!** The migration changes `company_id` to `supplier_id`.

### Error: "permission denied for table products"
Run the grant permissions:
```sql
GRANT ALL ON products TO authenticated;
GRANT SELECT ON products TO anon;
```

### CSV Import shows errors
1. Check that `VITE_DEV_MODE=true` in your `.env`
2. Restart your dev server after setting it
3. Check browser console for detailed errors

## Next Steps After Migration

1. ✅ Products table is updated
2. ✅ CSV import will work with megapap.csv
3. ✅ Dev mode allows testing without auth
4. 🎯 Ready to import your 2,869 products!

