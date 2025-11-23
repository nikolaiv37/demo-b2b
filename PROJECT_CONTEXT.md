# B2B Platform - Project Context Document

## 📋 Project Overview

**Project Name:** FurniTrade (B2B Furniture Wholesale SaaS Platform)

**Purpose:** A production-ready B2B wholesale platform that allows furniture wholesalers to manage their product catalog, handle quote requests, process orders, and provide a public-facing catalog for buyers. This is a **single-wholesaler platform** where stores place orders directly to the wholesaler.

**Current Status:** Active development - Core features implemented and functional

---

## 🛠 Technology Stack

### Frontend
- **React 18** with **TypeScript**
- **Vite** - Build tool and dev server
- **React Router v6** - Client-side routing with protected routes
- **TailwindCSS** - Utility-first CSS framework
- **Shadcn/ui** - Component library (Radix UI primitives)
- **Zustand** - Lightweight state management
- **TanStack Query (React Query)** - Data fetching, caching, and synchronization
- **React Hook Form + Zod** - Form handling and validation
- **Recharts** - Data visualization and charts
- **Lucide React** - Icon library

### Backend & Services
- **Supabase** - Backend as a Service
  - PostgreSQL database
  - Authentication (JWT-based)
  - Row Level Security (RLS) for data isolation
  - Storage buckets for file uploads
- **Stripe** - Payment processing integration
- **Resend** - Transactional email service
- **PostHog** - Product analytics and event tracking

### Additional Libraries
- **PapaParse** - CSV parsing for bulk product imports
- **date-fns** - Date manipulation utilities
- **React Helmet Async** - SEO management (meta tags)
- **React Error Boundary** - Error handling
- **i18next** - Internationalization (currently English only)
- **@react-pdf/renderer** - PDF generation for invoices

---

## 📁 Project Structure

```
b2bplatform/
├── src/
│   ├── app/                          # Application pages
│   │   ├── auth/                     # Authentication pages
│   │   │   ├── login.tsx            # Login page
│   │   │   ├── signup.tsx           # Signup page
│   │   │   └── onboarding.tsx       # Company setup after signup
│   │   └── dashboard/                # Dashboard pages (protected)
│   │       ├── layout.tsx           # Dashboard layout with sidebar
│   │       ├── overview.tsx         # Main dashboard with stats & charts
│   │       ├── products/            # Product management
│   │       │   ├── index.tsx        # Products list/grid
│   │       │   └── [sku]/           # Product detail page
│   │       ├── orders/               # Order management
│   │       │   ├── index.tsx        # Orders list
│   │       │   └── AdminOrdersView.tsx
│   │       ├── quotes/               # Quote management
│   │       │   └── index.tsx
│   │       ├── complaints/           # Complaints & returns
│   │       │   ├── index.tsx
│   │       │   ├── AdminComplaintsView.tsx
│   │       │   ├── MyComplaintsTab.tsx
│   │       │   └── NewComplaintTab.tsx
│   │       ├── wishlist/             # User wishlist
│   │       │   └── index.tsx
│   │       ├── csv-import/           # Bulk product import
│   │       │   └── index.tsx
│   │       ├── analytics/            # Analytics dashboard
│   │       │   └── index.tsx
│   │       └── settings/             # Settings pages
│   │           └── index.tsx
│   ├── components/                   # Reusable components
│   │   ├── ui/                      # Shadcn UI components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── input.tsx
│   │   │   ├── table.tsx
│   │   │   └── ... (other UI primitives)
│   │   ├── GlassCard.tsx            # Glassmorphism card wrapper
│   │   ├── ProductCard.tsx          # Product display card
│   │   ├── ProductGridCard.tsx      # Grid view product card
│   │   ├── MOQBadge.tsx             # Minimum Order Quantity badge
│   │   ├── TieredPriceTable.tsx     # Volume-based pricing table
│   │   ├── CSVUploader.tsx          # CSV import component
│   │   ├── QuoteModal.tsx           # Quote request modal
│   │   ├── QuoteRequestModal.tsx    # Quote submission
│   │   ├── OrderDetailsSheet.tsx    # Order details side panel
│   │   ├── OrderStatusBadge.tsx     # Order status indicator
│   │   ├── SidebarNav.tsx           # Dashboard navigation
│   │   ├── CartDrawer.tsx           # Shopping cart drawer
│   │   ├── ProductQuickViewModal.tsx # Quick product preview
│   │   ├── ProformaInvoicePDF.tsx   # PDF invoice generator
│   │   ├── AuthGuard.tsx            # Route protection component
│   │   ├── ErrorFallback.tsx        # Error boundary fallback
│   │   └── DemoModeBanner.tsx       # Demo mode indicator
│   ├── hooks/                       # Custom React hooks
│   │   ├── useAuth.ts              # Authentication hook
│   │   ├── useQueryProducts.ts     # Product data fetching
│   │   ├── useMutationQuote.ts     # Quote mutations
│   │   ├── useCSVImport.ts         # CSV import logic
│   │   ├── useWishlist.ts          # Wishlist management
│   │   └── useDarkMode.ts          # Dark mode toggle
│   ├── stores/                      # Zustand state stores
│   │   ├── authStore.ts            # Auth state (user, profile, company)
│   │   └── cartStore.ts            # Shopping cart state
│   ├── lib/                         # Utility libraries
│   │   ├── supabase/
│   │   │   └── client.ts           # Supabase client initialization
│   │   ├── stripeClient.ts         # Stripe client setup
│   │   ├── resendClient.ts         # Resend email client
│   │   ├── analytics.ts            # PostHog analytics events
│   │   ├── pricing.ts              # Pricing calculation utilities
│   │   ├── utils.ts                # General utilities (cn, formatCurrency, etc.)
│   │   └── csv/
│   │       ├── parser.ts           # CSV parsing logic
│   │       └── validator.ts        # CSV validation rules
│   ├── types/
│   │   └── index.ts                # TypeScript type definitions
│   ├── pages/                       # Standalone pages
│   │   ├── PublicCatalog.tsx       # Public product catalog (/catalog/:slug)
│   │   └── NotFound.tsx            # 404 page
│   ├── i18n/
│   │   └── en.json                 # English translations
│   ├── App.tsx                     # Main app component with routing
│   ├── main.tsx                    # React app entry point
│   └── index.css                   # Global styles + glassmorphism
│
├── supabase/                        # Database migrations & SQL
│   ├── schema.sql                  # Main database schema
│   ├── sample-data.sql             # Sample data for testing
│   └── *.sql                       # Various migration files
│
├── public/                          # Static assets
├── index.html                       # HTML entry point
├── package.json                     # Dependencies
├── vite.config.ts                   # Vite configuration
├── tailwind.config.js               # TailwindCSS configuration
├── tsconfig.json                    # TypeScript configuration
└── vercel.json                      # Vercel deployment config
```

---

## 🎯 Key Features Implemented

### 1. Authentication & User Management
- ✅ Email/password authentication via Supabase Auth
- ✅ User signup with automatic profile creation
- ✅ Company onboarding flow (company name, logo, slug generation)
- ✅ Role-based access control (admin, sales, buyer)
- ✅ Protected routes with `AuthGuard` component
- ✅ Session persistence and auto-refresh

### 2. Product Management
- ✅ Product CRUD operations (Create, Read, Update, Delete)
- ✅ Product listing with grid/list views
- ✅ Product detail pages with full specifications
- ✅ Category filtering and search
- ✅ Image gallery support (multiple images per product)
- ✅ Stock management
- ✅ MOQ (Minimum Order Quantity) support
- ✅ Tiered pricing (volume-based pricing)
- ✅ Product visibility toggle

### 3. CSV Bulk Import
- ✅ CSV file upload with drag-and-drop
- ✅ CSV parsing and validation
- ✅ Progress tracking during import
- ✅ Error reporting for invalid rows
- ✅ Duplicate SKU detection
- ✅ Batch insert with transaction support

### 4. Quote System
- ✅ Quote request from public catalog
- ✅ Quote approval/rejection workflow
- ✅ Email notifications (Resend integration)
- ✅ Quote expiration handling
- ✅ Quote to order conversion
- ✅ Internal notes for admins

### 5. Order Management
- ✅ Order creation from approved quotes
- ✅ Order status workflow (pending → approved → processing → shipped → delivered)
- ✅ Order approval by admins
- ✅ Payment status tracking
- ✅ Tracking number management
- ✅ Order details view
- ✅ Proforma invoice PDF generation
- ✅ Order number generation

### 6. Complaints & Returns
- ✅ Complaint submission
- ✅ Admin complaint management
- ✅ Internal notes for complaints
- ✅ Status tracking

### 7. Wishlist
- ✅ User wishlist (per-user, persisted)
- ✅ SKU-based (survives product updates)
- ✅ Add/remove from wishlist

### 8. Public Catalog
- ✅ SEO-optimized public catalog (`/catalog/:companySlug`)
- ✅ Product search and filtering
- ✅ Category navigation
- ✅ Product detail views
- ✅ Shopping cart functionality
- ✅ Quote request submission
- ✅ Responsive design

### 9. Dashboard & Analytics
- ✅ Overview dashboard with key metrics
- ✅ Revenue charts (area charts, bar charts)
- ✅ Order statistics
- ✅ Category revenue breakdown (pie charts)
- ✅ Low stock alerts
- ✅ Recent orders list
- ✅ Analytics page with detailed metrics

### 10. Settings
- ✅ Company settings (name, logo, slug)
- ✅ User profile management
- ✅ Billing settings (Stripe integration)
- ✅ Appearance settings (dark mode)
- ✅ CSV import access

### 11. UI/UX Features
- ✅ Glassmorphism design system
- ✅ Dark mode support
- ✅ Responsive mobile-first design
- ✅ Loading states (skeletons)
- ✅ Error boundaries
- ✅ Toast notifications
- ✅ Modal dialogs and sheets
- ✅ Accessible components (Radix UI)

### 12. Integrations
- ✅ Stripe payment processing
- ✅ Resend email service
- ✅ PostHog analytics
- ✅ Supabase storage for logos

---

## 🗄️ Database Schema

### Core Tables

**companies**
- `id` (UUID, PK)
- `name` (TEXT)
- `slug` (TEXT, UNIQUE) - Used for public catalog URLs
- `logo_url` (TEXT)
- `stripe_id` (TEXT)
- `created_at`, `updated_at`

**profiles**
- `id` (UUID, PK, FK → auth.users)
- `company_id` (UUID, FK → companies)
- `role` (TEXT: 'admin' | 'sales' | 'buyer')
- `email` (TEXT)
- `full_name` (TEXT)
- `avatar_url` (TEXT)
- `created_at`, `updated_at`

**products**
- `id` (UUID, PK)
- `company_id` (UUID, FK → companies)
- `sku` (TEXT) - Unique per company
- `name` (TEXT)
- `description` (TEXT)
- `category` (TEXT)
- `moq` (INTEGER) - Minimum Order Quantity
- `retail_price` (DECIMAL)
- `wholesale_price` (DECIMAL)
- `stock` (INTEGER)
- `images` (TEXT[]) - Array of image URLs
- `specs` (JSONB) - Flexible specifications
- `created_at`, `updated_at`
- Unique constraint: `(company_id, sku)`

**quotes**
- `id` (UUID, PK)
- `customer_id` (TEXT) - Can be email or user ID
- `company_id` (UUID, FK → companies)
- `items` (JSONB) - Array of quote items
- `subtotal`, `tax`, `shipping`, `total` (DECIMAL)
- `status` (TEXT: 'pending' | 'approved' | 'rejected' | 'expired')
- `expires_at` (TIMESTAMP)
- `notes` (TEXT)
- `customer_email`, `customer_name` (TEXT)
- `internal_notes` (TEXT) - Admin-only notes
- `created_at`, `updated_at`

**orders**
- `id` (UUID, PK)
- `quote_id` (UUID, FK → quotes, nullable)
- `company_id` (UUID, FK → companies)
- `customer_id`, `customer_email`, `customer_name` (TEXT)
- `items` (JSONB) - Array of order items
- `subtotal`, `tax`, `shipping`, `total` (DECIMAL)
- `status` (TEXT: 'pending' | 'approved' | 'processing' | 'shipped' | 'delivered' | 'cancelled')
- `payment_id` (TEXT) - Stripe payment intent ID
- `payment_status` (TEXT: 'pending' | 'paid' | 'failed' | 'refunded')
- `tracking_number` (TEXT)
- `notes` (TEXT)
- `order_number` (INTEGER) - Sequential order number
- `created_at`, `updated_at`, `shipped_at`, `delivered_at`

**wishlist**
- `id` (UUID, PK)
- `user_id` (UUID, FK → auth.users)
- `product_sku` (TEXT) - SKU reference (not FK, survives product updates)
- `created_at`

**complaints**
- `id` (UUID, PK)
- `order_id` (UUID, FK → orders)
- `user_id` (UUID, FK → auth.users)
- `type` (TEXT) - Complaint type
- `description` (TEXT)
- `status` (TEXT)
- `internal_notes` (TEXT) - Admin-only notes
- `created_at`, `updated_at`

### Row Level Security (RLS)

All tables have RLS enabled with policies:
- **Companies**: Users can view/update their own company
- **Profiles**: Users can view profiles in their company, update their own
- **Products**: Public read, company users can insert/update/delete their company's products
- **Quotes**: Anyone can create, company users can view/update their company's quotes
- **Orders**: Company users can view their company's orders, admins can update
- **Wishlist**: Users can manage their own wishlist
- **Complaints**: Users can create/view their own, admins can view all in company

---

## 🔑 Key Patterns & Conventions

### State Management
- **Zustand** for global state (auth, cart)
- **TanStack Query** for server state (data fetching, caching)
- Local component state with `useState` for UI-only state

### Data Fetching
- All Supabase queries use TanStack Query
- Query keys follow pattern: `['resource', id, ...filters]`
- Mutations use `useMutation` hook
- Automatic refetching on window focus disabled (config in App.tsx)

### Authentication Flow
1. User signs up → Supabase Auth creates user
2. Trigger creates profile in `profiles` table
3. User completes onboarding → Creates company, links profile to company
4. `useAuth` hook manages auth state via `authStore`
5. `AuthGuard` protects routes, redirects to login if not authenticated

### Styling
- **TailwindCSS** utility classes
- **Glassmorphism** design system with custom classes:
  - `.glass` - Base glassmorphism effect
  - `.glass-card` - Card with padding
  - `.glass-hover` - Hover scale effect
- **Shadcn/ui** components for consistent UI
- Dark mode via CSS variables and Tailwind dark mode

### Form Handling
- **React Hook Form** for form state
- **Zod** for validation schemas
- Form submission with loading states and error handling

### Error Handling
- **React Error Boundary** at app level
- Try-catch blocks in async functions
- Toast notifications for user-facing errors
- Console logging in development

### File Structure
- Feature-based organization in `app/` directory
- Shared components in `components/`
- Reusable hooks in `hooks/`
- Utility functions in `lib/`
- Type definitions in `types/`

---

## 🔐 Environment Variables

Required environment variables (`.env` file):

```env
# Supabase
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Stripe
VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key

# Resend
VITE_RESEND_API_KEY=your_resend_api_key

# PostHog
VITE_POSTHOG_KEY=your_posthog_key
VITE_POSTHOG_HOST=https://app.posthog.com
```

---

## 🚀 Current Implementation Status

### ✅ Fully Implemented
- Authentication & authorization
- Product management (CRUD)
- CSV bulk import
- Quote system
- Order management
- Complaints system
- Wishlist
- Public catalog
- Dashboard overview
- Analytics page
- Settings pages
- Dark mode
- Responsive design

### 🔄 Partially Implemented / Needs Enhancement
- Payment flow (Stripe integration exists but may need refinement)
- Email templates (basic implementation, may need customization)
- Advanced analytics (basic charts, could add more metrics)
- Product variants/options (not yet implemented)
- Multi-currency support (not implemented)
- Advanced inventory management (basic stock tracking only)

### ❌ Not Yet Implemented
- Multi-language support (i18n setup exists but only English)
- Advanced search filters
- Product reviews/ratings
- Customer management dashboard
- Automated reorder alerts
- Shipping provider integration
- Advanced reporting/export

---

## 🎨 Design System

### Color Scheme
- Uses CSS variables for theming
- Supports light/dark modes
- Primary colors defined in `tailwind.config.js`
- Glassmorphism with backdrop blur effects

### Component Library
- Built on **Shadcn/ui** (Radix UI primitives)
- Custom components extend base UI components
- Consistent spacing, typography, and interactions

### Responsive Breakpoints
- Mobile-first approach
- Tailwind default breakpoints (sm, md, lg, xl, 2xl)
- Sidebar collapses on mobile
- Bottom navigation for mobile dashboard

---

## 📝 Important Notes

1. **Single-Wholesaler Platform**: This is designed for one wholesaler. Stores (buyers) place orders directly to the wholesaler. There's no multi-tenant marketplace functionality.

2. **SKU-Based Wishlist**: Wishlist uses SKU instead of product ID, so it survives product updates/re-imports.

3. **RLS is Critical**: All database queries respect Row Level Security. Users can only access their company's data.

4. **Order Numbers**: Sequential order numbers are generated per company.

5. **Quote Expiration**: Quotes have expiration dates and can be set to 'expired' status.

6. **CSV Import**: Products are imported with company_id automatically set based on the logged-in user's company.

7. **Public Catalog**: Accessible at `/catalog/:companySlug` - no authentication required.

8. **Admin vs Company Users**: 
   - Admin users can manage all aspects of their company
   - Sales users can manage products and quotes
   - Buyer role exists but is not heavily used in current implementation

---

## 🔧 Development Workflow

### Running the Project
```bash
npm install          # Install dependencies
npm run dev          # Start dev server (Vite)
npm run build        # Build for production
npm run preview      # Preview production build
```

### Database Migrations
- SQL files in `supabase/` directory
- Run migrations in Supabase SQL Editor
- Schema file: `supabase/schema.sql`

### Code Style
- TypeScript strict mode enabled
- ESLint configured
- Prettier (if configured) for formatting
- Component files use PascalCase
- Hook files use camelCase with `use` prefix

---

## 🎯 Next Steps / Roadmap Ideas

When continuing development, consider:
- Enhanced payment flow with Stripe Checkout
- Advanced product filtering and search
- Product variants (size, color, etc.)
- Customer relationship management
- Automated email campaigns
- Advanced reporting and exports
- Mobile app (React Native)
- Multi-currency support
- Shipping integration
- Inventory forecasting

---

## 📞 Context for AI Assistants

When working on this project:
1. **Always respect RLS policies** - Don't bypass security
2. **Use TypeScript types** - Check `src/types/index.ts` for type definitions
3. **Follow existing patterns** - Match the code style and structure
4. **Test with Supabase** - Ensure queries work with RLS enabled
5. **Consider mobile** - Ensure responsive design
6. **Use TanStack Query** - For all data fetching, not direct Supabase calls in components
7. **Error handling** - Always include try-catch and user feedback
8. **Loading states** - Show skeletons or spinners during data fetching

---

**Last Updated:** 22/11/25
**Project Status:** Active Development
**Primary Framework:** React + TypeScript + Supabase

