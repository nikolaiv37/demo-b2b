# Demo UX / Operations Fix Report

Date: 2026-04-29

## Completed Fixes

### 1. Orders status update failed with `invalid input syntax for type uuid: "0"`
- Area/page: `Orders` admin list
- Root cause: admin orders view parsed quote UUIDs with `parseInt(...) || 0` and then used `0` in the update mutation.
- Action taken: switched admin order IDs to real string UUIDs, updated the status mutation to use the real quote ID, and kept the UI-to-DB status mapping aligned with existing quote statuses.
- Files changed:
  - `src/app/dashboard/orders/AdminOrdersView.tsx`
- Follow-up: none for the code fix itself; lightweight manual verification confirmed the status can change from the list without the UUID error.

### 2. Orders details modal had mixed copy and unsafe notes behavior
- Area/page: `Orders` admin details modal and company order details sheet
- Root cause: hardcoded English labels, duplicated shipping display, and blur-triggered internal note save flow.
- Action taken: added missing EN/BG keys, replaced visible hardcoded order detail copy, removed duplicate shipping method display, added explicit `Save Notes`, and blocked close when notes are dirty instead of silently losing edits.
- Files changed:
  - `src/app/dashboard/orders/AdminOrdersView.tsx`
  - `src/components/OrderDetailsSheet.tsx`
  - `src/locales/en.json`
  - `src/locales/bg.json`
- Follow-up: company-side order details still need a broader pass if more mixed copy is found outside the currently touched labels.

### 3. Complaints details modal had blur-save notes behavior
- Area/page: `Complaints` admin details modal
- Root cause: internal notes were wired to save on blur, with no explicit save action and no unsaved-change protection.
- Action taken: added draft/dirty state, explicit `Save Notes`, translated save/saved/failed messages, and prevented close when notes are dirty.
- Files changed:
  - `src/app/dashboard/complaints/AdminComplaintsView.tsx`
  - `src/locales/en.json`
  - `src/locales/bg.json`
- Follow-up: visual browser verification was intentionally stopped early to save limits; route-level/manual DOM verification should be resumed later if needed.

### 4. Overview revenue used too-strict status logic
- Area/page: `Overview`
- Root cause: monthly revenue and chart logic only counted `approved`, while demo orders are mostly in processing/pending statuses.
- Action taken: aligned overview revenue totals and chart data with the same demo order scope used elsewhere: `new`, `pending`, `shipped`, `approved`.
- Files changed:
  - `src/app/dashboard/overview.tsx`
- Follow-up: none for the data logic; broader analytics/dashboard polish is still pending.

### 5. Category leaf navigation required an unnecessary intermediate click
- Area/page: `Categories`
- Root cause: categories with only direct products were still treated as a subcategory view because of the synthetic `All` node.
- Action taken: detect the synthetic single `All` child and route that case straight into the product-listing view.
- Files changed:
  - `src/app/dashboard/categories/index.tsx`
- Follow-up: full browser pass still recommended after the remaining Etap 4 fixes are complete.

### 6. Demo sidebar/topbar cleanup
- Area/page: dashboard shell, auth pages, sidebar
- Root cause: duplicate settings entry points, unfinished admin tools visible in demo nav, and debug/non-demo chrome in auth/topbar.
- Action taken: reduced dashboard sidebar settings to a single entry, hid risky/internal demo items from sidebar (`Analytics`, `Manage Categories`, `CSV Import`), removed topbar waiting-order badges, wired profile/company topbar links to settings anchors, added auth language switcher, and hid forgot-password in demo mode.
- Files changed:
  - `src/config/features.ts`
  - `src/components/SidebarNav.tsx`
  - `src/app/dashboard/layout.tsx`
  - `src/app/auth/login.tsx`
  - `src/app/auth/platform-login.tsx`
  - `src/locales/en.json`
  - `src/locales/bg.json`
- Follow-up: full browser QA on the auth and dropdown flows was intentionally stopped to save limits.

## Partially Completed Fixes

### 7. Clients visibility in TED tenant
- Area/page: `Clients`
- Root cause found: the clients query relied too heavily on profile shape (`tenant_id` / old role assumptions), which does not reliably represent seeded demo company accounts even when they already place tenant-scoped orders.
- Action taken: changed the client list source to be tenant-scoped first:
  - tenant memberships for role context
  - current tenant quotes for real company users and order aggregates
  - profile enrichment only for the specific user IDs already discovered from the current tenant
- Files changed:
  - `src/hooks/useQueryClients.ts`
- Follow-up: browser automation was intentionally stopped before re-verifying the updated page. This is the current highest-priority manual re-check.

## Not Verified Because Browser QA Was Intentionally Stopped

- Clients page after the final `useQueryClients.ts` fix
- Complaints modal end-to-end after the latest code patch
- Settings/topbar dropdown flow after the latest cleanup
- Bulgarian copies on all founder-facing screens after the latest patches
- Company-user route/access pass after the latest Etap 4 changes

## Build Status

- `npm run build` passed after the final `useQueryClients.ts` change in this pass.
- Remaining build warnings are unchanged and non-blocking:
  - `PortalNotFound.tsx` is both dynamically and statically imported
  - large vendor chunks remain in the production bundle

## Focused UI polish pass — auth/settings/csv/clients/product detail

### 8. Auth login simplified to a single visible step
- Area/page: `auth/login`, `auth/platform-login`
- Root cause: the platform login flow still exposed a workspace lookup step and a second password step, which made the demo feel like two separate auth modules.
- Action taken: kept tenant lookup internal for app-host routing, but changed the visible platform login flow to a single email + password form and removed the visible "Back to all workspaces" return path from the login UX.
- Files changed:
  - `src/app/auth/login.tsx`
  - `src/app/auth/platform-login.tsx`
  - `src/locales/en.json`
  - `src/locales/bg.json`
- Follow-up: tenant slug and app-host login should still be manually smoke-checked in the browser later, but no browser automation was used in this pass.

### 9. Settings simplified for demo use
- Area/page: `Settings`, topbar dropdown
- Root cause: settings exposed overlapping navigation, team/profile/password sections that are not useful for the current demo, and mixed-language company copy in Bulgarian.
- Action taken: reduced visible settings to company details by default plus integrations when explicitly addressed, removed the redundant inner settings navigation, removed visible profile/password/team surfaces from this page, removed the topbar "Profile Settings" shortcut, and kept "Company Information" targeting the company section.
- Files changed:
  - `src/app/dashboard/settings/index.tsx`
  - `src/app/dashboard/layout.tsx`
  - `src/locales/en.json`
  - `src/locales/bg.json`
- Follow-up: manual browser checking is still needed for the topbar dropdown anchor flow and final Bulgarian label review.

### 10. CSV Import restored for admins and translated at the main surface
- Area/page: `CSV Import`
- Root cause: CSV import had been hidden from the demo sidebar, and Bulgarian copy was missing on the main wizard surface.
- Action taken: re-enabled the sidebar entry for admins only, added page-level and first-step Bulgarian copy, and replaced the less useful distributor marketing panel with a simpler "how the import works" explanation.
- Files changed:
  - `src/config/features.ts`
  - `src/app/dashboard/csv-import/index.tsx`
  - `src/components/csv-import/steps/UploadStep.tsx`
  - `src/locales/en.json`
  - `src/locales/bg.json`
- Follow-up: deeper wizard screens still rely partly on English fallback in Bulgarian and can be translated further later if the CSV import flow becomes part of an external client demo.

### 11. Product detail page no longer shows an unfinished related-products block
- Area/page: `Product detail`
- Root cause: the similar products section looked incomplete when no real related products were resolved.
- Action taken: removed the unfinished related-products section and replaced the bottom area with useful catalog and ordering information, while also wiring the touched visible copy to proper EN/BG translation keys.
- Files changed:
  - `src/app/dashboard/products/[sku]/page.tsx`
  - `src/locales/en.json`
  - `src/locales/bg.json`
- Follow-up: no browser verification in this pass; a later manual check should confirm the new lower section reads well on desktop and mobile.

### 12. Clients page visual polish and invite CTA alignment
- Area/page: `Clients`
- Root cause: the invite action styling and top information area felt rough compared with the rest of the dashboard.
- Action taken: aligned the invite button with the main button style, softened and simplified the top information cards, and added the missing visible translation keys used by that cleanup.
- Files changed:
  - `src/app/dashboard/clients/index.tsx`
  - `src/locales/en.json`
  - `src/locales/bg.json`
- Follow-up: the underlying tenant-scoped client visibility fix still needs a manual browser re-check because browser QA was intentionally stopped to save limits.

### 13. Bulgarian company form copy completed
- Area/page: `Company settings`
- Root cause: the company form depended on a `company.*` translation block that existed in English but not in Bulgarian, which caused mixed-language labels and helper text.
- Action taken: added a Bulgarian `company` translation block covering labels, placeholders, helper text, upload copy, save actions, and validation messages used by the current company form.
- Files changed:
  - `src/locales/bg.json`
- Follow-up: none on the code side; browser review is still needed for final wording polish.

## Updated Build Status

- `npm run build` passed after the focused UI polish pass.
- Remaining build warnings are unchanged and non-blocking:
  - `PortalNotFound.tsx` is both dynamically and statically imported
  - large vendor chunks remain in the production bundle

## Small rollback/polish — profile settings and CSV wording

- What was restored:
  - restored the `Profile Settings` item in the topbar dropdown and routed it to the `#profile` section in Settings
  - restored a profile/account section in `Settings` with avatar, full name, phone, company, login email, and role/account-manager style presentation
  - kept `Company Information` routing to the `#company` section
  - renamed visible CSV import navigation and page wording to `CSV Product Import` / `Импорт на продукти от CSV`
  - fixed the missing `csvImport.upload.importFlowTitle` translation and translated the visible `Delete all products` action
- What remains hidden:
  - the broken change-password UI remains removed and is not shown in Settings or the topbar flow
- Files changed:
  - `src/app/dashboard/layout.tsx`
  - `src/app/dashboard/settings/index.tsx`
  - `src/components/csv-import/CSVImportWizard.tsx`
  - `src/locales/en.json`
  - `src/locales/bg.json`
  - `DEMO_UX_OPERATIONS_FIX_REPORT.md`
- Build result:
  - `npm run build` passed

## Profile edit polish

- What is editable:
  - full name and phone in the `Profile Settings` section
  - company name from the same profile form when the current workspace already has a writable `companies` record behind the existing settings flow
- What remains read-only:
  - login email stays visible but read-only
- Password change:
  - password change remains intentionally hidden in the demo copy and no password UI was restored
- Files changed:
  - `src/app/dashboard/settings/index.tsx`
  - `src/locales/en.json`
  - `src/locales/bg.json`
  - `DEMO_UX_OPERATIONS_FIX_REPORT.md`
- Build result:
  - `npm run build` passed

## Role-based catalog/product UX cleanup

- Admin buyer controls hidden:
  - hid quantity selectors, add-to-cart actions, quick-add ordering actions, wishlist bulk order CTA, and the topbar cart/order drawer entry points for admin/owner users
- Company buyer controls preserved:
  - kept product card ordering, quick view ordering, product detail ordering, and cart/order flow for company/member users
- Product detail availability cleanup:
  - removed the duplicate raw supplier availability pill, kept one clean translated availability state, and added normalized stock quantity display where numeric stock exists
- Description duplication cleanup:
  - removed the repeated long description from the hero/details area and kept the full description in the lower `Description` card
- Files changed:
  - `src/app/dashboard/layout.tsx`
  - `src/app/dashboard/products/index.tsx`
  - `src/app/dashboard/categories/index.tsx`
  - `src/app/dashboard/wishlist/index.tsx`
  - `src/app/dashboard/products/[sku]/page.tsx`
  - `src/components/ProductGridCard.tsx`
  - `src/components/ProductQuickViewModal.tsx`
  - `src/lib/productAvailability.ts`
  - `src/locales/en.json`
  - `src/locales/bg.json`
  - `DEMO_UX_OPERATIONS_FIX_REPORT.md`
- Build/smoke result:
  - `npm run verify` passed
