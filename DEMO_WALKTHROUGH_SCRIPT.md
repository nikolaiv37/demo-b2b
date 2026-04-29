# Demo Walkthrough Script

Date: 2026-04-29

Purpose:
- Run a clean TED/client-facing demo without drifting into unfinished areas.
- Keep the story focused on business value, not platform internals.
- Use browser-verified entry points from the current local setup.

Browser verification notes from this session:
- Verified working local marketing/app-host entry points:
  - `http://localhost:4173/landing`
  - `http://localhost:4173/auth/login`
  - `http://localhost:4173/auth/signup`
- Verified `http://127.0.0.1:4173/` shows `Portal not found` in this setup, so do not use `127.0.0.1` in a live demo.
- Verified platform login shows a clear `No workspace found for this email.` message for unknown emails.
- Local slug route behavior needs environment-specific confirmation before a call. In this setup, `/t/:slug/...` did not behave like a stable tenant-login entry point for demo use.

## Before Call Checklist

- Use `localhost`, not `127.0.0.1`, for any local demo rehearsal.
- Open the app fresh and confirm these routes load cleanly:
  - `/landing`
  - `/auth/login`
- Prepare the exact demo account(s) in advance:
  - one client/company user
  - one admin/wholesaler user
- Log in once before the call and keep the right tabs ready:
  - landing page tab
  - client dashboard tab
  - admin dashboard tab
- Confirm the tenant/demo data you plan to show is already present:
  - products visible
  - at least one clean company account
  - at least one recent order for admin view
- Confirm the company/user names shown in the demo data are acceptable for a client call.
- Keep the browser zoom at 100% and use desktop layout.
- Close devtools, extra tabs, and any internal docs before screen sharing.
- Do a last check that no unfinished areas are visible in the sidebar or header.
- If using a local environment, rehearse the exact URLs first instead of improvising routes live.

## Client / Company User Flow

Use this flow to show what a buyer or client team experiences.

| Step | Page / route | What to click / show | What to say | Risk / avoid note |
| --- | --- | --- | --- | --- |
| 1 | `/landing` | Start on the marketing landing page. Show the headline, benefits, and feature sections. | `This is the front door of the portal. The goal is to give each client a clean place to browse products, request orders, and work with your team without email chaos.` | Do not scroll too slowly through every section. Keep this to a short positioning intro. |
| 2 | `/auth/login` | Show the platform login screen with work email entry. | `Users can start with their work email, and the system guides them into the right workspace experience.` | Do not improvise with unknown real customer emails live. Use prepared demo accounts only. |
| 3 | Client demo account login | Sign in with the prepared client/company user. | `From the client side, the experience is intentionally simple: browse products, save items, and place orders without needing back-office knowledge.` | Make sure the client account is already tested before the call. |
| 4 | Client dashboard overview | Show the dashboard landing state after login. | `This gives the client a quick view of their activity and the parts of the portal they actually need.` | Avoid discussing internal metrics logic or permissions implementation details. |
| 5 | Catalog: `/dashboard/products` | Open the product catalog. Scroll a little. Show category structure or filters if useful. | `Here the client sees one unified product catalog instead of scattered supplier files or spreadsheets.` | Avoid entering import/admin-only areas from this account. |
| 6 | Product detail: `/dashboard/products/:sku` | Open one product. Show images, pricing, and detail layout. | `Each product page gives the team enough detail to make a buying decision without going back and forth over email.` | Pick a product with complete images and clean data. |
| 7 | Wishlist if useful: `/dashboard/wishlist` | If populated, show saved items. If empty, mention it briefly. | `Clients can keep a short list of products they want to revisit before placing an order.` | If wishlist is empty, do not spend time here. Move on quickly. |
| 8 | Add to cart / request order | Add one or two products and open the order request modal. Show company name, email, shipping method, notes. | `When the buyer is ready, they can send a structured order request instead of writing a manual email.` | Do not submit live unless you want that test order to appear for the admin flow. |
| 9 | Orders: `/dashboard/orders` | Show the client orders list. | `Clients can always see what they have already submitted and track the status from one place.` | Avoid showing messy or old test orders if the list is noisy. |
| 10 | Complaints: `/dashboard/complaints` | Briefly show the complaints/returns area only if it is part of the story. | `If after-sales support matters, the same portal can also handle issue reporting in a structured way.` | Skip this entirely if the data is incomplete or if the call is mainly about ordering. |

## Admin / Wholesaler Flow

Use this flow to show the wholesaler-side control panel after the client story.

| Step | Page / route | What to click / show | What to say | Risk / avoid note |
| --- | --- | --- | --- | --- |
| 1 | Admin login | Switch to the prepared admin session or admin tab. | `Now I’ll show the same portal from the wholesaler side, where your team manages demand instead of chasing it manually.` | Do not waste time logging out and back in live unless the flow is already rehearsed. |
| 2 | Admin dashboard overview: `/dashboard` | Show the dashboard overview cards and top-level navigation. | `This is the operational view for the wholesaler team: orders, clients, product data, and performance in one workspace.` | Keep this high level. Do not explain every widget. |
| 3 | Orders: `/dashboard/orders` | Open orders and show the full admin list. Open one clean order. | `As soon as a client submits an order, your team sees it here with the product lines, company details, and next actions.` | Use a clean sample order. Avoid broken legacy data or irrelevant statuses. |
| 4 | Order detail sheet | Show order contents, customer/company fields, totals, notes, and any document actions that are stable. | `The team works from a structured order record, not from free-text emails.` | Show proforma/email actions only if already tested and visually clean. |
| 5 | Clients: `/dashboard/clients` | Show the client list and, if useful, the invite action. | `Client accounts can be managed centrally, which makes onboarding and account servicing much easier.` | Do not send live invitations during the call unless you explicitly want that action. |
| 6 | Analytics: `/dashboard/analytics` | Show analytics briefly. Focus on business outcomes, not chart mechanics. | `This gives the wholesaler a practical view of activity, order flow, and operational trends.` | Keep this short. Avoid over-claiming precision if the data is demo-only. |
| 7 | Categories / catalog admin if needed | Show category management or product organization only if it supports the client’s use case. | `The wholesaler can keep the catalog organized without relying on separate back-office tools.` | Skip if the client is not asking about catalog operations. |
| 8 | CSV import: `/dashboard/csv-import` | Show only if import capability is a selling point and the screen is already clean. | `Product data can be brought in faster instead of being maintained one item at a time.` | Do not run an import live unless fully rehearsed. Do not mention TED XML scripts here. |
| 9 | Settings: `/dashboard/settings` | Briefly show company/team settings if relevant. | `The portal also supports the operational setup around the workspace, not just the product catalog.` | Avoid deep integration or internal admin sections unless specifically asked. |

## Do Not Show In Demo

- Do not show `127.0.0.1` local URLs.
- Do not show raw TED XML files, TED conversion scripts, or internal import artifacts.
- Do not show pricing/package concepts yet.
- Do not show platform console pages such as `/platform/tenants` unless the audience is explicitly internal.
- Do not show unfinished or legacy quote-specific areas unless they are already rehearsed and necessary.
- Do not show Stripe/billing placeholders, hidden production-hardening topics, or internal audit docs.
- Do not show dev-only warnings, PostHog placeholder behavior, realtime warnings, or error toasts.
- Do not send live invites, password resets, or support actions unless the call explicitly requires it.
- Do not improvise on slug/custom-domain routing during the call. Use the rehearsed URL only.
- Do not open empty states unless you are intentionally making a product-story point.

## Demo Notes

- Best opening sequence:
  1. Landing page
  2. Client flow
  3. Admin flow
  4. Short recap tied to the client’s business
- Keep the language simple:
  - `one catalog`
  - `one order workflow`
  - `less email and spreadsheet work`
  - `faster response to clients`
  - `clean visibility for both sides`
- If a screen looks noisy, skip it instead of explaining around it.
- If asked about imports, say the portal supports structured catalog onboarding, but do not open the internal TED path.

## Known Local Rehearsal Caveat

- In this local setup, `localhost` is the correct host for rehearsal.
- `127.0.0.1` produced the `Portal not found` screen.
- Slug-route rehearsal on local host should be verified before a live call. For now, the safest browser-tested entry points are the landing page and the main login page on `localhost`.
