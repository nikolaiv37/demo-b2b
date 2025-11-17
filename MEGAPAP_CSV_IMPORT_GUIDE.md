# 🚀 Megapap CSV Import - Complete Setup Guide

## Overview
This guide will help you successfully import the `megapap.csv` file (2,869 products) into your B2B platform.

## ✅ What's Been Fixed

1. **Database Schema** - Updated to use `supplier_id` instead of `company_id`
2. **CSV Parser** - Now correctly handles megapap.csv format with semicolon delimiters
3. **Product Fields** - Matches CSV columns: model, sku, retail_price, weboffer_price, name, category, manufacturer, description, availability, quantity, weight, transportational_weight, date_expected, main_image, images
4. **Dev Mode** - Bypass authentication for development
5. **Queries** - Updated to use correct field names

## 📋 Step-by-Step Setup

### Step 1: Update Your Database

1. **Go to Supabase Dashboard**
   - Open https://supabase.com/dashboard
   - Select your project
   - Click on **SQL Editor**

2. **Run the Migration**
   
   Copy and paste the entire contents of `supabase/migration-update-products-table.sql` and execute it.

   **IMPORTANT:** This will create a new products table structure. If you have existing data, read `DATABASE_MIGRATION_GUIDE.md` first!

3. **Verify Migration**
   
   Run this query to confirm:
   ```sql
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'products' 
   ORDER BY ordinal_position;
   ```

   You should see columns like: `supplier_id`, `model`, `sku`, `weboffer_price`, `manufacturer`, etc.

### Step 2: Enable Dev Mode (Already Done!)

Your `.env` file already has:
```bash
VITE_DEV_MODE=true
```

This bypasses authentication so you can focus on importing products.

### Step 3: Start Development Server

```bash
npm run dev
```

### Step 4: Import Your CSV

1. **Open the app** - Navigate to http://localhost:5173
2. **You'll be auto-logged in** (thanks to dev mode!)
3. **Go to CSV Import** - Click on "CSV Import" in the sidebar OR navigate to http://localhost:5173/dashboard/csv-import
4. **Upload megapap.csv**:
   - Drag and drop the file, or click to browse
   - You'll see a preview of the first 10 rows
   - Verify the data looks correct
5. **Click "Confirm Import"**:
   - Watch the progress bar (imports 500 rows at a time)
   - Status updates show "Importing X of 2,869..."
   - Takes about 10-30 seconds depending on your connection
6. **Success!** - You'll be redirected to the Products page

### Step 5: View Your Products

Navigate to **Dashboard → Products** to see all 2,869 imported products!

## 📊 What Gets Imported

From your megapap.csv:
- ✅ **2,869 products** 
- ✅ Product images (image1-image10)
- ✅ Bulgarian and English descriptions
- ✅ Pricing (retail_price, weboffer_price)
- ✅ Stock quantities
- ✅ Product attributes
- ✅ Categories and manufacturers
- ✅ Weight and shipping info

## 🔍 Expected Data Structure

After import, each product will have:

```javascript
{
  id: 123,                          // Auto-generated
  supplier_id: "dev-user-123",      // Your user ID
  model: "0086733",
  sku: "GP011-0014",
  retail_price: 9.50,
  weboffer_price: 6.90,
  name: "Product name...",
  category: "Category > Subcategory",
  manufacturer: "MEGAPAP",
  description: "Full description...",
  availability: "In Stock",
  quantity: 60,
  weight: 0.32,
  transportational_weight: 0.004,
  date_expected: null,
  main_image: "https://www.megapap.com/...",
  images: [
    "https://www.megapap.com/.../image1.webp",
    "https://www.megapap.com/.../image2.webp",
    "https://www.megapap.com/.../image3.webp"
  ],
  is_visible: true,
  created_at: "2024-11-17...",
  updated_at: "2024-11-17..."
}
```

## 🛠️ Troubleshooting

### Error: "column products.company_id does not exist"
**Solution:** Run the database migration (Step 1 above)

### Error: "permission denied for table products"
**Solution:** Run these SQL commands in Supabase:
```sql
GRANT ALL ON products TO authenticated;
GRANT SELECT ON products TO anon;
```

### Products don't show after import
**Solution:** Check the browser console for errors. Ensure RLS policies are set up correctly.

### CSV preview is empty
**Solution:** 
- Check that the CSV uses semicolon (`;`) delimiter
- Verify the file is not corrupted
- Try with a smaller sample file first

### Import gets stuck at 0%
**Solution:**
- Check your internet connection
- Look at browser console for error messages
- Verify Supabase credentials in `.env`

## 📝 After Import

Once imported, you can:

1. **View Products** - Dashboard → Products (all 2,869 products)
2. **Search & Filter** - Use the search bar to find products
3. **Edit Products** - Click on any product to edit
4. **Create Quotes** - Add products to quotes for customers
5. **Public Catalog** - Share products via public link

## 🎯 Next Steps

After successful import:

1. ✅ Disable dev mode when ready for production:
   ```bash
   # In .env file
   VITE_DEV_MODE=false
   ```

2. ✅ Set up proper authentication

3. ✅ Configure product visibility settings

4. ✅ Set up pricing tiers and discounts

5. ✅ Customize categories and filters

## 🆘 Need Help?

If you encounter issues:

1. Check browser console (F12 → Console tab)
2. Check Supabase logs (Dashboard → Database → Logs)
3. Review `DATABASE_MIGRATION_GUIDE.md`
4. Check `DEV_MODE.md` for auth bypass info

## 🎉 Success Indicators

You'll know it worked when:
- ✅ Progress bar reaches 100%
- ✅ Toast notification says "Imported 2,869 products!"
- ✅ Products page shows 2,869 products
- ✅ Product images are visible
- ✅ Prices and descriptions are correct
- ✅ Categories are populated

---

**Ready? Let's import those 2,869 products! 🚀**

Run:
```bash
npm run dev
```

Then navigate to: http://localhost:5173/dashboard/csv-import

