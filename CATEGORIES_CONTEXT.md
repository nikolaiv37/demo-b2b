## Categories System – Implementation Context

This document explains how categories are currently implemented in the FurniTrade B2B platform, so another AI (or developer) can reason about changes to the **buyer catalog** and the **admin-only Manage Categories** feature safely.

---

## 1. High-Level Goals

- **Normalize categories** into a dedicated `categories` table instead of free-text strings in `products.category`.
- Provide an **admin-only UI** at `/dashboard/categories/manage` for:
  - Viewing categories in a tree/table hybrid.
  - Creating, renaming, merging, deleting categories.
  - Uploading category images.
- Keep the existing **buyer-facing catalog** under `/dashboard/categories` fully working:
  - Use the normalized categories table where possible.
  - Gracefully fall back to legacy `products.category` strings when needed.
- Ensure **automatic sync behavior**:
  - When products are deleted, categories clear appropriately.
  - When products are imported via CSV, categories are rebuilt automatically from product data.

---

## 2. Database Schema & Migrations

### 2.1 `categories` table

Defined in `supabase/create-categories-table.sql`.

Key columns:
- `id uuid primary key`
- `company_id uuid not null` – multi-tenant support (currently typically one supplier/company).
- `name text not null` – category name (either main category or subcategory).
- `parent_id uuid null` – points to another row in `categories` for subcategories.
- `image_url text null` – optional category image URL (Supabase Storage).
- `slug text` – present if `add-category-slug-to-categories.sql` has been applied.
- `created_at timestamptz default now()`
- `updated_at timestamptz` + trigger `update_categories_updated_at`.

Indexes:
- `idx_categories_company_id`
- `idx_categories_parent_id`
- `idx_categories_name`

RLS (Row-Level Security):
- RLS enabled on `categories`.
- Policy: **Anyone can view categories** (SELECT) – allows buyer-facing catalog to read.
- Policy: **Admins can manage categories in their company** (ALL) – only admins can insert/update/delete for their `company_id`.

### 2.2 `products.category_id` foreign key

Defined in `supabase/add-category-id-to-products.sql`.

- Adds `category_id uuid` to `public.products` (if not already present).
- Adds FK constraint `products_category_id_fkey`:
  - `foreign key (category_id) references public.categories(id) on delete set null`.
- Adds index `idx_products_category_id`.

**Important:** Existing products may still have only `products.category` (text) and no `category_id`. The system supports this via fallbacks (see hooks section).

### 2.3 Category slugs

Defined in `supabase/add-category-slug-to-categories.sql`.

- Adds `slug text` column to `public.categories` (if missing).
- Backfills slugs by transforming `name`:
  - Lowercased.
  - Spaces → `-`.
  - Special chars stripped.

The buyer catalog uses slugs for SEO-friendly and stable URLs.

---

## 3. CSV Import & Automatic Category Rebuild

File: `src/components/csv-import/CSVImportWizard.tsx`

### 3.1 Overview

The CSV Import Wizard:
- Parses arbitrary distributor CSVs.
- Maps columns to the internal `products` schema.
- Imports/upserts products in batches.
- **Rebuilds the `categories` table** from imported products.
- Provides a **"Delete All Products"** action that also clears categories.

Hook dependencies:
- `useSmartMapping` – handles mapping and transformation of CSV data.
- `useAuth` – provides `company` context (for `company.id`).
- `useMutation`, `useQueryClient` – React Query for side effects and cache invalidation.
- `supabase` – direct Supabase client for products/categories operations.

### 3.2 Category string format in products

Legacy field: `products.category` (text).

Format:
- `"Main Category"` for top-level categories.
- `"Main Category > Subcategory"` for nested categories.

Helper in `CSVImportWizard.tsx`:

- `parseCategory(category: string | null | undefined)`:
  - Returns `{ mainCategory: string, subcategory: string | null }`.
  - Splits on `'>'`, trims whitespace.
  - If no `'>'`, treats the whole string as `mainCategory`.
  - If empty/null, returns `mainCategory: 'Uncategorized'`, `subcategory: null`.

### 3.3 Rebuilding `categories` from current products

Helper function in `CSVImportWizard.tsx`:

- `rebuildCategoriesFromProducts`:
  1. Requires `company.id` from `useAuth`. If no company, **does nothing**.
  2. Fetches all rows from `products` with a non-null, non-empty `category`.
  3. **Clears existing categories** for that `company_id`:
     - `delete from categories where company_id = company.id`.
  4. Parses each product’s `category` via `parseCategory`:
     - Accumulates a `Set` of main category names.
     - Accumulates a `Map` of `{ main, sub }` pairs for subcategories.
  5. Inserts all main categories:
     - Rows: `{ company_id, name, parent_id: null }`.
     - Reads back the inserted rows to map `name → id`.
  6. Inserts subcategories:
     - For each `{ main, sub }`, resolves main’s `id` and inserts:
       - `{ company_id, name: sub, parent_id: mainId }`.
  7. Does **not** currently assign `products.category_id` (this can be extended later if needed).

React Query invalidation on success (after import):
- `queryClient.invalidateQueries({ queryKey: ['categories'] })`
- `queryClient.invalidateQueries({ queryKey: ['category-hierarchy'] })`
- `queryClient.invalidateQueries({ queryKey: ['products'] })`

**Result:** After every successful CSV import:
- `products` reflect the new catalog.
- `categories` is a clean rebuild from the current `products.category` strings.
- Buyer catalog and Manage Categories react to updated data.

### 3.4 Delete All Products behavior

`deleteAllMutation` in `CSVImportWizard.tsx`:

1. Deletes all rows from `products`:
   - `.from('products').delete().gte('id', 0)`.
2. If `company.id` exists:
   - Deletes all categories for that company:
     - `.from('categories').delete().eq('company_id', company.id)`.
3. Invalidates:
   - `['products']`
   - `['categories']`
   - `['category-hierarchy']`

**Result:** After “Delete All Products”:
- `/dashboard/products` is empty.
- `/dashboard/categories` recalculates from an empty set.
- `/dashboard/categories/manage` also shows no categories.

---

## 4. Admin Manage Categories Page

File: `src/app/dashboard/categories/manage.tsx`
Route: `/dashboard/categories/manage` (admin-only, via `SidebarNav`).

### 4.1 Access & context

- Uses `useAuth` to access `company`.
  - `company.id` is used when **creating** categories.
  - Fetch currently **ignores** `company_id` filter to stay in sync with the single-wholesaler state:
    - This can be tightened later if multi-tenant separation is needed.
- Intended to be **admin-only**, enforced by:
  - Sidebar navigation logic (admin-only menu item).
  - Supabase RLS policies (only admins can write).

### 4.2 Data fetching

- `useQuery(['categories'], ...)`:
  - `select('id,name,parent_id,image_url') from categories order by name`.
  - On error code `PGRST205` (table missing), returns an empty list.
  - Currently **does not** filter by `company_id` (see above note).

- `useQuery(['category-product-counts'], ...)`:
  - For each category, counts matching products:
    - `.from('products').select('*', { count: 'exact', head: true }).ilike('category', `${cat.name}%`)`.
  - Returns a map `Record<categoryId, productCount>`.
  - Enabled only when there is at least one category.

### 4.3 Tree building logic

Helper:
- `buildTree(items: Category[]): CategoryWithChildren[]`
  - Builds a tree from flat `categories` using `parent_id`.
  - Produces an array of root nodes (where `parent_id` is `null`), each with `children`.

Derived state:
- `const tree = useMemo(() => buildTree(categories), [categories])`.
- `const hasAnyCategories = tree.length > 0`.

Filters:
- Local state:
  - `filter: 'all' | 'main' | 'sub'`.
  - `search: string`.
- `flatFilteredCategories`:
  - Filters `categories` based on `filter` and `search`.

### 4.4 UI layout

- Header with:
  - Icon (`FolderKanban`).
  - Title/description (`t('categories.manageTitle')`, `t('categories.manageSubtitle')`).
  - Search input.
  - Filter buttons (All / Main / Sub).
  - “Add Category” button (opens create modal).

- Main content:
  - `GlassCard` containing a `Table`:
    - Columns: Name, Parent, Image, Product Count, Actions.
    - Rows:
      - If `isLoading`: shows loading row.
      - If `!hasAnyCategories`: shows “No categories yet”.
      - If search / filter is active: renders `flatFilteredCategories` via `renderRow`.
      - Else: renders full `tree` via `renderRow`.

### 4.5 CRUD operations

Helpers:
- `invalidateCategories()`:
  - Invalidates `['categories']` and `['category-product-counts']`.
  - Mutations also invalidate `['category-hierarchy']` and `['category-products']` (buyer catalog caches).

#### 4.5.1 Create / Edit (upsertCategoryMutation)

- Modal fields:
  - `nameInput` (required).
  - `parentIdInput` (`'none'` for top-level, else category ID).
  - Optional image file.

- `uploadImageIfNeeded`:
  - Uploads selected image file to Supabase Storage bucket `category-images`.
  - Returns public URL or `null`.

- Mutation logic:
  - Requires `company.id` – throws if missing.
  - If `selectedCategory` exists:
    - `update categories set name, parent_id, image_url (optional)` by `id`.
    - Calls `propagateCategoryRename(selectedCategory, nameInput)` to keep legacy `products.category` strings aligned.
  - Else (create):
    - `insert into categories (company_id, name, parent_id, image_url)`.

- On success:
  - Shows success toast.
  - Closes modal.
  - Invalidates `['categories']`, `['category-product-counts']`, `['category-hierarchy']`, `['category-products']`.

#### 4.5.2 Delete (deleteCategoryMutation)

- Behavior:
  1. **Reassign products** to “Uncategorized” (legacy text):
     - `update products set category = t('overview.uncategorized') where category ilike 'SelectedName%'`.
  2. Delete the category row from `categories`.

- On success:
  - Shows success toast.
  - Closes modal.
  - Invalidates the same queries as upsert.

#### 4.5.3 Merge (mergeCategoryMutation)

- User selects:
  - Source category: `selectedCategory`.
  - Target category: `targetCategoryId`.

- Behavior:
  1. Updates products’ legacy `category` strings:
     - `update products set category = target.name where category ilike 'SourceName%'`.
  2. Deletes the source category from `categories`.

- On success:
  - Shows success toast.
  - Closes modal.
  - Invalidates the same queries as upsert.

#### 4.5.4 Propagating text renames

Helper: `propagateCategoryRename(oldCategory, newName)`:
- If **main category** (`parent_id` is null):
  - Updates products with `category_id = oldCategory.id`:
    - Sets `products.category = newName`.
  - Finds direct subcategories:
    - For each child, computes `fullName = newName + ' > ' + child.name`.
    - Updates products with `category_id = child.id` to `fullName`.
- If **subcategory**:
  - Finds parent category’s name.
  - Builds `fullName = parentName + ' > ' + newName` (or just `newName`).
  - Updates products with `category_id = oldCategory.id` to `fullName`.

**Purpose:** Maintain consistency between:
- Normalized `categories` table.
- Legacy text field `products.category` used by some catalog views and tooling.

### 4.6 What Manage Categories does **not** do

- It no longer:
  - Automatically deletes or rebuilds `categories` based on product count.
  - Triggers sync after CSV imports.
- It **relies on**:
  - **CSV Import Wizard** for initial / bulk rebuild of categories.
  - **Admin actions** (create/edit/merge/delete) for incremental management.

---

## 5. Buyer-Facing Category Views

### 5.1 Hook: `useCategoryHierarchy`

File: `src/hooks/useCategoryHierarchy.ts` (not shown here, but important conceptually).

Responsibilities:
- Build a hierarchical view of categories and associated products for the buyer catalog.
- Prefer normalized data via `products.category_id` and `categories` join, but:
  - Falls back to parsing `products.category` text when `category_id` is `null`.

Typical behavior:
- Fetches products with:
  - `category_id`
  - (joined) `categories` data where possible.
- For each product:
  - If `category_id` is set and a linked `categories` row exists:
    - Use `categories.name` / `parent_id` / `image_url` to build `mainCategory`, `subcategory`, etc.
  - Else:
    - Parse `products.category` text to infer `mainCategory` and `subcategory`.

Result:
- Catalog pages (`/dashboard/categories` and deeper) can:
  - Work with both fully migrated data (using `category_id`) and legacy-only data (text-based categories).

### 5.2 UI components using categories

Relevant components/pages:
- `src/app/dashboard/categories/index.tsx`:
  - Lists top-level categories.
  - Uses `category.slug` for navigation, `category.name` for display.

- `src/components/CategoryGrid.tsx`:
  - Renders category cards.
  - Uses `category.slug` to build URLs (`<Link to={...} />`).

Other catalog views may rely on:
- `['category-hierarchy']` query cache.
- `['category-products']` query for products per category.

---

## 6. React Query Keys & Invalidation Strategy

Key query keys:
- `['products']` – list of products.
- `['categories']` – flat list of categories.
- `['category-product-counts']` – product counts per category (manage page).
- `['category-hierarchy']` – hierarchy used by buyer catalog.
- `['category-products']` – products scoped to a specific category.

Mutations and flows that invalidate:
- **CSV Import (onSuccess)**:
  - Rebuilds categories via `rebuildCategoriesFromProducts`.
  - Invalidates:
    - `['products']`
    - `['categories']`
    - `['category-hierarchy']`

- **Delete All Products (onSuccess)**:
  - Deletes products + categories for the company.
  - Invalidates:
    - `['products']`
    - `['categories']`
    - `['category-hierarchy']`

- **Manage Categories mutations (upsert / delete / merge)**:
  - Always invalidate:
    - `['categories']`
    - `['category-product-counts']`
    - `['category-hierarchy']`
    - `['category-products']`

---

## 7. Current Behavior Summary (End-to-End)

1. **Initial state / after Delete All Products:**
   - `products` is empty.
   - `categories` is empty for the current `company_id`.
   - Buyer catalog and Manage Categories show empty states.

2. **After CSV import:**
   - Products are upserted.
   - `rebuildCategoriesFromProducts`:
     - Wipes categories for `company.id`.
     - Rebuilds main + sub categories from `products.category`.
   - Buyer catalog and Manage Categories display the newly inferred categories.

3. **Admin tweaks categories:**
   - Create/edit/merge/delete operations:
     - Change `categories` table.
     - Propagate necessary changes to `products.category` where relevant.
     - Invalidate buyer catalog caches so UI reflects changes.

4. **Buyer catalog consumption:**
   - Uses `useCategoryHierarchy` to:
     - Prefer `products.category_id` + `categories` join, when available.
     - Otherwise fall back to parsed `products.category` text.

---

## 8. Things That Can Be Improved Next

These are candidate areas for the next iteration (what you can ask the next AI to work on):

- **Full migration to `category_id`:**
  - During `rebuildCategoriesFromProducts`, also set `products.category_id` correctly for each product.
  - Eventually phase out reliance on `products.category` text where possible.

- **Better handling of merges/renames:**
  - When merging/renaming, also update `products.category_id` (not only text).
  - Ensure buyer catalog and analytics only depend on the normalized structure.

- **Company scoping:**
  - Reintroduce `company_id` filters in Manage Categories and buyer catalog once multiple companies/suppliers are active.

- **Drag-and-drop re-parenting:**
  - Allow changing `parent_id` via drag-and-drop.
  - Automatically update `products.category` and possibly `category_id`.

- **Robust slug generation & routing:**
  - Ensure unique slugs even for duplicate names (e.g., suffix with ID).
  - Handle redirects when a category slug changes (rename).

This context should give a complete, accurate picture of the current category system so another AI can propose safe, incremental improvements without breaking the existing buyer catalog or admin flows.


