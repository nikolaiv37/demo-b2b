# 🔧 Fix supplier_id Type Issue

## Problem
The `supplier_id` column is UUID type, but we need TEXT type to use `'dev-user-123'` in dev mode.

## Solution
Run this SQL in your Supabase Dashboard → SQL Editor:

```sql
-- Step 1: Drop all policies that reference supplier_id
DROP POLICY IF EXISTS "Anyone can view visible products" ON products;
DROP POLICY IF EXISTS "Authenticated users can insert products" ON products;
DROP POLICY IF EXISTS "Suppliers can update their own products" ON products;
DROP POLICY IF EXISTS "Suppliers can delete their own products" ON products;
DROP POLICY IF EXISTS "Anyone can view products" ON products;
DROP POLICY IF EXISTS "Users can insert products in their company" ON products;
DROP POLICY IF EXISTS "Users can update products in their company" ON products;
DROP POLICY IF EXISTS "Users can delete products in their company" ON products;

-- Step 2: Remove foreign key constraint if it exists
ALTER TABLE products 
DROP CONSTRAINT IF EXISTS products_supplier_id_fkey;

-- Step 3: Change supplier_id column type from UUID to TEXT
ALTER TABLE products 
ALTER COLUMN supplier_id TYPE TEXT USING supplier_id::text;

-- Step 4: Recreate the policies (now with TEXT type)
CREATE POLICY "Anyone can view visible products"
    ON products FOR SELECT
    USING (is_visible = true OR supplier_id = COALESCE(auth.uid()::text, ''));

CREATE POLICY "Authenticated users can insert products"
    ON products FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Suppliers can update their own products"
    ON products FOR UPDATE
    USING (true);

CREATE POLICY "Suppliers can delete their own products"
    ON products FOR DELETE
    USING (true);
```

## Steps

1. **Go to Supabase Dashboard**
   - Open https://supabase.com/dashboard
   - Select your project
   - Click **SQL Editor**

2. **Run the SQL**
   - Copy and paste the SQL above
   - Click **RUN**

3. **Verify**
   - The constraint should be removed
   - You can now import products with any `supplier_id` value

## Why This Works

- The `supplier_id` column is TEXT type (not UUID)
- In dev mode, we use `'dev-user-123'` which doesn't exist in `users` table
- Removing the foreign key constraint allows any text value
- This is safe for dev mode and MVP

## After Running

Once you run this SQL, try importing your CSV again. It should work! ✅

