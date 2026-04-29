# Demo Account QA Report

Date: 2026-04-29
Environment: local app at `http://localhost:4173`
Entry point tested: `http://localhost:4173/auth/login`

## Admin / wholesaler account

- Tested account role: admin / wholesaler
- Routes tested:
  - `/auth/login`
  - `/t/ted/dashboard`
  - `/t/ted/dashboard/products`
  - `/t/ted/dashboard/orders`
  - `/t/ted/dashboard/clients`
  - `/t/ted/dashboard/complaints`
  - `/t/ted/dashboard/analytics`
  - `/t/ted/dashboard/csv-import`
  - `/t/ted/dashboard/categories/manage`
  - logout back to `/t/ted/auth/login`
- Pass/fail: pass
- Issues found:
  - none blocking for demo
  - workspace lookup on the platform login flow is noticeably slow in local QA and took roughly 16 seconds before the password step appeared

Notes:
- Email lookup worked and resolved the account into workspace `TED`.
- Password login worked.
- Dashboard loaded correctly.
- Orders view showed tenant-wide order visibility across multiple client companies.
- Admin-only routes loaded successfully.
- Visible navigation links included: Overview, Orders, Clients, Complaints & Returns, Analytics, Categories, Manage Categories, All Products, Wishlist, CSV Import Wizard, Company, Profile.
- Logout worked and returned to the tenant login screen.

## Company user account 1

- Tested account role: company user
- Routes tested:
  - `/auth/login`
  - `/t/ted/dashboard`
  - `/t/ted/dashboard/products`
  - `/t/ted/dashboard/products/21018385-1-140-%2F-200`
  - `/t/ted/dashboard/wishlist`
  - `/t/ted/dashboard/orders`
  - `/t/ted/dashboard/complaints`
  - `/t/ted/dashboard/clients`
  - `/t/ted/dashboard/csv-import`
  - `/t/ted/dashboard/unpaid-balances`
  - `/t/ted/dashboard/categories/manage`
  - logout back to `/t/ted/auth/login`
- Pass/fail: pass
- Issues found:
  - client orders page used admin-like subtitle copy before fix; updated during this QA pass
  - workspace lookup on the platform login flow was slow in local QA

Notes:
- Email lookup worked and resolved the account into workspace `TED`.
- Password login worked.
- Dashboard loaded correctly.
- Products page loaded.
- Product detail page loaded using a real catalog SKU route.
- Wishlist page loaded.
- Orders page showed one company-scoped order and did not expose tenant-wide client data.
- Complaints page loaded.
- Admin-only routes were not available:
  - `/dashboard/clients` redirected back to dashboard
  - `/dashboard/unpaid-balances` redirected back to dashboard
  - `/dashboard/categories/manage` redirected back to dashboard
  - `/dashboard/csv-import` showed an admin access required gate
- Visible navigation links included: Overview, Orders, Complaints & Returns, Analytics, Categories, All Products, Wishlist, Company, Profile.
- Logout worked and returned to the tenant login screen.

## Company user account 2

- Tested account role: company user
- Routes tested:
  - `/auth/login`
  - `/t/ted/dashboard`
  - `/t/ted/dashboard/products`
  - `/t/ted/dashboard/products/21018385-1-140-%2F-200`
  - `/t/ted/dashboard/wishlist`
  - `/t/ted/dashboard/orders`
  - `/t/ted/dashboard/complaints`
  - `/t/ted/dashboard/clients`
  - `/t/ted/dashboard/csv-import`
  - `/t/ted/dashboard/unpaid-balances`
  - `/t/ted/dashboard/categories/manage`
  - logout back to `/t/ted/auth/login`
- Pass/fail: pass
- Issues found:
  - workspace lookup on the platform login flow was slow in local QA

Notes:
- Email lookup worked and resolved the account into workspace `TED`.
- Password login worked.
- Dashboard loaded correctly.
- Products page loaded.
- Product detail page loaded.
- Wishlist page loaded.
- Orders page showed only this user’s company orders and did not expose the other client company’s order.
- Complaints page loaded.
- Admin-only routes were not available:
  - `/dashboard/clients` redirected back to dashboard
  - `/dashboard/unpaid-balances` redirected back to dashboard
  - `/dashboard/categories/manage` redirected back to dashboard
  - `/dashboard/csv-import` showed an admin access required gate
- Visible navigation links included: Overview, Orders, Complaints & Returns, Analytics, Categories, All Products, Wishlist, Company, Profile.
- Logout worked and returned to the tenant login screen.

## Optional controlled order test

- Status: skipped
- Reason:
  - existing seeded orders already proved company-scoped visibility and admin tenant-wide visibility
  - skipping was safer and aligned with the instruction to avoid unnecessary database changes during local credential QA

## Small copy fixes made during QA

- Updated company-user orders page copy to avoid admin wording:
  - `src/locales/en.json`
  - `src/locales/bg.json`

## Summary

- All three prepared demo accounts were able to complete login successfully from the platform login entry point.
- Admin and company roles were separated correctly by route access and visible navigation links.
- Company users were blocked from admin-only areas.
- Admin user could access the expected management views.
- No credentials were written into repo files, reports, screenshots, or console logs.
