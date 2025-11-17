# 🚀 Dev Mode - Quick Access Without Authentication

## Overview
Dev Mode allows you to bypass authentication and access the dashboard immediately for rapid development and testing.

## How to Enable/Disable

### ✅ Enable Dev Mode
In your `.env` file, set:
```bash
VITE_DEV_MODE=true
```

Then restart your dev server:
```bash
npm run dev
```

### ❌ Disable Dev Mode
In your `.env` file, set:
```bash
VITE_DEV_MODE=false
```
Or comment it out:
```bash
# VITE_DEV_MODE=true
```

## What Happens in Dev Mode?

When `VITE_DEV_MODE=true`:

1. **No Login Required** - You can directly access `/dashboard` without authentication
2. **Mock User Created** - A mock authenticated user is automatically created:
   - User ID: `dev-user-123`
   - Email: `dev@example.com`
   - Role: `admin`
   - Company: `Dev Company` (ID: `dev-company-123`)

3. **Demo Banner Shown** - A banner will appear at the top indicating you're in dev mode

4. **Full Dashboard Access** - All dashboard features work normally with the mock user

## Important Notes

⚠️ **For Development Only**
- Dev mode should NEVER be enabled in production
- Always disable it before deploying
- The mock user data is not stored in the database

💡 **Database Operations**
- Features like CSV import will use the mock `dev-user-123` ID as the `supplier_id`
- You may need to manually create or link data in your database for full testing

🔄 **Switching Back to Real Auth**
- Simply set `VITE_DEV_MODE=false` or remove the line
- Restart your dev server
- You'll be redirected to the login page as normal

## Example: Testing CSV Import

With dev mode enabled:
1. Navigate to `/dashboard/csv-import`
2. Upload your CSV file
3. Products will be imported with `supplier_id = 'dev-user-123'`
4. View products at `/dashboard/products`

## Current Status
✅ Dev Mode is **ENABLED** (as per your `.env` file)

