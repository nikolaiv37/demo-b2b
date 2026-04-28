# Project Decisions

Generated: 2026-04-28  
Source reports:

- [Demo B2B Audit Report](./audits/DEMO_B2B_AUDIT_REPORT.md)
- [Demo B2B Context Pack](./audits/DEMO_B2B_CONTEXT_PACK.md)
- [Security Audit B2B](./audits/SECURITY_AUDIT_B2B.md)

This file summarizes durable product, demo, security, and sales decisions from the audit reports. It is not a replacement for the full reports.

## Product Positioning

The project should be treated as a demo-ready B2B SaaS/platform template derived from an existing client implementation, not as a clean production product yet.

The primary product model is a single-wholesaler B2B portal:

- Admin/wholesaler users manage catalog, clients, orders, complaints, analytics, and settings.
- Company/client users browse products, use wishlist/cart flows, place order requests, view orders, generate proformas, and submit complaints.
- Tenant/workspace support exists and should remain part of the long-term architecture, but the current migration/bootstrap state must be cleaned before selling.

The current demo should be positioned around catalog browsing, B2B ordering, client account management, CSV catalog onboarding, complaints/returns, and operational visibility.

## Demo Scope Decisions

Keep in the demo:

- Dashboard overview.
- Product catalog and product detail pages.
- Category browsing.
- Wishlist.
- Company order flow and admin order management.
- Proforma/PDF generation as a visible workflow.
- Complaints/returns workflow.
- Clients/distributors management for admin users.
- Basic analytics, presented as directional operational insight.
- Settings for profile/company details.

Show carefully or with scripted data:

- CSV import, because it is useful and differentiating but carries real data/import risk.
- Category management, because direct route guarding needs cleanup.
- Econt/shipping integrations, because the codebase has meaningful integration work but it should be shown only if credentials and tenant settings are configured safely.
- Unpaid balances, because it is admin-only and depends on order/payment semantics being clear.

Hide from serious external demos until fixed:

- Stripe/billing claims and flows.
- Legacy `/dashboard/quotes` route.
- Platform tenant console unless the audience is internal or explicitly reviewing multi-tenant administration.
- XML import as an app feature; it currently exists as a script-based TED conversion path, not a productized UI.
- Any dev/demo behavior that shows all orders or uses placeholder users.

Do not use real client data in demos until the P0 security items are fixed and live Supabase policies are verified.

## Package Decisions

Base package:

- Tenant-aware B2B portal.
- Auth, invites, onboarding, and membership.
- Product catalog.
- Categories.
- Wishlist/cart/order request flow.
- Admin order management.
- Client management.
- Complaints/returns.
- Profile/company settings.
- Basic analytics.

Upsell/add-on package:

- CSV import wizard and distributor presets.
- Advanced category sync/mapping.
- Econt/shipping integrations.
- Proforma/PDF customization.
- Advanced analytics and unpaid balances.
- Multi-tenant/platform console.
- Branded tenant domains.

Internal-only:

- Platform tenant creation/deletion console.
- Tenant deletion tooling.
- Raw import scripts.
- Migration repair scripts.
- Any dev-mode bypasses or placeholder data helpers.

Remove or retire later:

- Legacy quote route if orders remain the primary terminology.
- Browser-side Resend email client.
- Old non-tenant schema and permissive RLS files after final bootstrap is created.
- Unused or duplicate migration repair files.
- Demo-only hardcoded branding and sample assumptions once packaging is finalized.

## Security Decisions

The platform is not approved for paid production in its current state.

Immediate security decisions:

- Resend must move server-side. `VITE_RESEND_API_KEY` must not be used in browser code, and any exposed key should be rotated.
- Live Supabase RLS must be verified before external demos with realistic data.
- Quotes/orders access must be scoped so company users cannot read all tenant orders.
- Old permissive SQL files must be quarantined or replaced with a single clean production migration set.
- Admin-only routes must be enforced at route/page level and by RLS, not only hidden in navigation.
- Storage buckets must be scoped by tenant/user and hardened before production.
- Invite tokens must not be logged in browser console or exposed unnecessarily.
- `VITE_DEV_MODE` must be false for any deployed external demo or production build.

Security readiness decision:

- Internal demo: acceptable only with trusted users and sanitized data.
- External client demo: blocked until P0 security cleanup is done.
- First paid client: blocked until RLS, storage, email, migrations, and audit logging are production-ready.
- 5-10 clients: blocked until operational security, monitoring, backups, rate limits, and regression tests exist.

## Import Decisions

CSV import should remain a differentiated capability, but it should be treated as an admin/internal operation until hardened.

Current import architecture decision:

- The active app import path is CSV via `/dashboard/csv-import`.
- XML import should be described as an internal conversion script, not as a product feature.
- Product upsert should remain tenant-scoped by `(tenant_id, sku)`.
- Category sync should remain non-destructive.
- Duplicate SKU handling should remain explicit, with clear reporting to admins.

Before selling import as a production feature:

- Add file size and row limits.
- Add import history persistence.
- Add rollback/staging or a server-side import job.
- Validate and optionally proxy external image URLs.
- Reduce console logging of import samples.
- Document supported CSV formats clearly.
- Confirm admin-only enforcement in both UI and RLS.

## Sales Decisions

Sales positioning should focus on operational outcomes:

- Faster B2B ordering for store/client accounts.
- Clean catalog browsing with wholesale pricing.
- Reduced manual order handling.
- Client self-service for orders, proformas, wishlist, and complaints.
- Faster catalog onboarding through CSV import.
- Optional shipping/Econt automation.

Avoid promising before implementation hardening:

- Production-grade billing/Stripe automation.
- Fully self-service XML imports.
- Fully automated multi-tenant provisioning.
- Enterprise-grade analytics.
- Guaranteed migration/bootstrap automation.
- Production security readiness for multiple unrelated clients.

Recommended sales demo narrative:

1. Client logs in and browses the catalog.
2. Client filters categories, opens product details, adds products to wishlist/cart.
3. Client submits an order request.
4. Admin reviews orders and generates proforma/PDF.
5. Client submits a complaint/return.
6. Admin handles complaint status and internal notes.
7. Admin shows catalog import as a controlled onboarding/admin tool.

## Readiness Decisions

Current readiness from the reports:

- Sales demo readiness: limited; acceptable for controlled/sanitized demos after P0 cleanup.
- Production readiness for first paid client: not ready.
- Security readiness: not ready for external/paying use.
- Import readiness: useful demo capability, not production hardened.
- Maintainability: needs migration cleanup and role/RLS consolidation.
- Support risk: high until bootstrap, logging, rollback, and audit trails are defined.

## P0 Before Serious External Demo

- Remove browser-exposed Resend secret usage.
- Rotate any exposed Resend key.
- Verify deployed `VITE_DEV_MODE=false`.
- Remove invite token/link browser logging.
- Fix quotes/orders RLS.
- Verify live Supabase policies against intended final tenant isolation.
- Add explicit admin guard to category management.
- Hide legacy quotes, Stripe/billing, and internal platform console from client demo paths.
- Use sanitized demo data only.
- Confirm public branding and demo tenant names are intentional.

## P1 Before First Paid Client

- Create a clean ordered production Supabase bootstrap/migration path.
- Remove or quarantine obsolete/conflicting SQL files.
- Harden storage buckets and upload validation.
- Add audit logs for admin actions.
- Add import history and rollback/staging strategy.
- Add rate limiting for invite, tenant lookup, import, and integration flows.
- Implement/verify password reset route.
- Review PostHog autocapture and data privacy settings.
- Add RLS/security regression tests.

## P2 Later Polish

- Productize XML imports if needed.
- Add richer analytics.
- Add stronger monitoring and Sentry-style error reporting.
- Add backup/restore runbooks.
- Add more branded demo templates.
- Add server-side image handling/proxying.
- Reduce legacy naming and residual demo/client references.

