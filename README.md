# FurniTrade - B2B Furniture Wholesale SaaS Platform

A production-ready B2B wholesale platform built with React, TypeScript, Supabase, and modern web technologies.

## ✨ Features

### Core Functionality

- **CSV Bulk Import** - Import thousands of products with validation and progress tracking
- **Tiered Pricing & MOQ** - Volume-based pricing with minimum order quantities
- **Quote System** - Request and manage wholesale quotes with email notifications
- **Order Management** - Track orders from approval to shipment
- **Payment Integration** - Stripe integration for secure payments
- **Email Notifications** - Automated emails via Resend API

### Dashboard Features

- Real-time analytics and stats
- Product management (CRUD operations)
- Order tracking and approval workflow
- Quote management and approval
- Customer relationship tracking
- CSV import with validation
- Company settings and branding
- Dark mode support

### Design & UX

- **Glassmorphism UI** - Modern design with backdrop-blur effects
- **Fully Responsive** - Mobile-first design
- **Loading States** - Skeleton screens and progress indicators
- **Error Handling** - Error boundaries and user-friendly messages
- **Toast Notifications** - Real-time feedback for actions

## 🛠 Tech Stack

### Frontend

- **React 18** with TypeScript
- **Vite** - Lightning-fast build tool
- **TailwindCSS** - Utility-first styling
- **Shadcn/ui** - High-quality component library
- **React Router v6** - Client-side routing with protected routes
- **React Hook Form + Zod** - Form handling and validation
- **Zustand** - Lightweight state management
- **TanStack Query** - Data fetching and caching

### Backend & Services

- **Supabase** - Backend as a Service
  - PostgreSQL database
  - Authentication
  - Row Level Security (RLS)
  - Storage for file uploads
- **Stripe** - Payment processing
- **Resend** - Transactional emails
- **PostHog** - Product analytics

### Data & Utilities

- **PapaParse** - CSV parsing
- **date-fns** - Date manipulation
- **React Helmet Async** - SEO management
- **React Error Boundary** - Error handling
- **i18next** - Internationalization

## 📦 Installation

### Prerequisites

- Node.js 18+ and npm/yarn
- Supabase account
- Stripe account (for payments)
- Resend account (for emails)
- PostHog account (for analytics)

### Step 1: Clone and Install

```bash
# Clone the repository
cd b2bplatform

# Install dependencies
npm install
```

### Step 2: Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run the schema:
  ```sql
   -- Copy and paste contents from supabase/schema.sql
  ```
3. (Optional) Load sample data:
  ```sql
   -- Copy and paste contents from supabase/sample-data.sql
  ```
4. Set up Storage:
  - Create a bucket named `logos`
  - Set it to public access
5. Get your credentials:
  - Go to Settings → API
  - Copy the Project URL and anon/public key

### Step 3: Configure Environment Variables

Create a `.env` file in the root directory:

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

### Step 4: Run the Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

## 🚀 Getting Started

### First-Time Setup

1. **Sign Up**
  - Navigate to `/auth/signup`
  - Create your account with email and password
2. **Complete Onboarding**
  - Set up your company name and details
  - Upload a company logo (optional)
3. **Import Products**
  - Go to Dashboard → CSV Import
  - Download the template CSV file
  - Fill in your product data
  - Upload and import

### Using the Platform

#### For Wholesalers (Admin/Sales)

1. **Manage Products**
  - View, edit, and delete products
  - Monitor stock levels
  - Update pricing
2. **Handle Quotes**
  - Review incoming quote requests
  - Approve or reject quotes
  - Customers receive email notifications
3. **Process Orders**
  - Approve pending orders
  - Update order status
  - Add tracking numbers
  - Export orders to CSV
4. **View Analytics**
  - Track revenue and orders
  - Monitor pending quotes
  - Get low stock alerts

## 📁 Project Structure

```
src/
├── app/
│   ├── auth/              # Authentication pages
│   │   ├── login.tsx
│   │   ├── signup.tsx
│   │   └── onboarding.tsx
│   └── dashboard/         # Dashboard pages
│       ├── layout.tsx
│       ├── overview.tsx
│       ├── products/
│       ├── orders/
│       ├── quotes/
│       ├── customers/
│       ├── csv-import/
│       └── settings/
├── components/
│   ├── ui/               # Shadcn UI components
│   ├── GlassCard.tsx
│   ├── ProductCard.tsx
│   ├── MOQBadge.tsx
│   ├── TieredPriceTable.tsx
│   ├── CSVUploader.tsx
│   ├── QuoteModal.tsx
│   ├── OrderStatusBadge.tsx
│   ├── SidebarNav.tsx
│   └── ErrorFallback.tsx
├── lib/
│   ├── supabaseClient.ts
│   ├── stripeClient.ts
│   ├── resendClient.ts
│   ├── analytics.ts
│   ├── pricing.ts
│   ├── utils.ts
│   └── csv/
│       ├── parser.ts
│       └── validator.ts
├── hooks/
│   ├── useAuth.ts
│   ├── useQueryProducts.ts
│   ├── useMutationQuote.ts
│   ├── useCSVImport.ts
│   └── useDarkMode.ts
├── stores/
│   ├── cartStore.ts
│   └── authStore.ts
├── types/
│   └── index.ts
├── pages/
│   └── NotFound.tsx
├── i18n/
│   └── en.json
├── App.tsx
├── main.tsx
└── index.css
```

## 🔒 Security Features

### Row Level Security (RLS)

- All database tables have RLS enabled
- Company data isolation
- Role-based access control
- Users can only access their company's data

### Authentication

- Supabase Auth with JWT tokens
- Secure password hashing
- Protected routes
- Session management

## 🎨 Glassmorphism Design

The UI uses a modern glassmorphism aesthetic with:

- Backdrop blur effects
- Semi-transparent backgrounds
- Subtle borders and shadows
- Smooth transitions and hover effects

Glassmorphism utility classes are available:

```css
.glass              /* Base glassmorphism */
.glass-card         /* Glass card with padding */
.glass-hover        /* Hover scale effect */
.glass-nav          /* Sticky navigation */
.glass-sidebar      /* Sidebar styling */
```

## 🧪 CSV Import Format

Your CSV should have the following columns:

```csv
sku,name,description,category,moq,retail_price,wholesale_price,stock,images
```

**Example:**

```csv
CHAIR-001,Modern Dining Chair,Comfortable dining chair,Chairs,10,299.99,199.99,50,https://example.com/image.jpg
```

**Validation Rules:**

- SKU must be unique per company
- Prices must be positive numbers
- Wholesale price ≤ Retail price
- MOQ must be a positive integer
- Stock must be a non-negative integer

### Category System (2025 Refactor) – Fully Normalized

- **Single source of truth**: `categories` table + `products.category_id`.
- Legacy `products.category` text field is **DEPRECATED** and kept only for legacy/old CSV imports and compatibility.
- CSV Import is now **non-destructive** – it never deletes existing categories and always links products via `category_id`.
- Admin actions (create, rename, move, merge, delete) operate on the normalized categories and are reflected instantly in the catalog.
- The old `rebuildCategoriesFromProducts` helper has been removed and must never be used again.

## 📱 Mobile Support

The application is fully responsive with:

- Mobile-optimized layouts
- Touch-friendly interactions
- Collapsible sidebar on mobile
- Bottom navigation for mobile dashboard

## 🌐 SEO Optimization

- React Helmet for dynamic meta tags
- Semantic HTML structure
- Open Graph tags
- Page-specific titles and descriptions

## 🔧 Customization

### Branding

- Update company logo in Settings
- Customize company name and slug
- Logo appears on dashboard and public catalog

### Styling

- Modify TailwindCSS config for colors
- Update glassmorphism styles in `index.css`
- Customize Shadcn theme variables

### Email Templates

- Edit templates in `src/lib/resendClient.ts`
- Add custom HTML/CSS
- Include dynamic variables

## 📊 Analytics Events

The platform tracks:

- Page views (dashboard)
- User actions (login, signup)
- Product interactions (view, add to cart)
- Quote requests
- CSV imports
- Search queries

## 🚢 Deployment

### Build for Production

```bash
npm run build
```

### Deploy to Vercel

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

### Deploy to Netlify

1. Connect repository
2. Build command: `npm run build`
3. Publish directory: `dist`
4. Add environment variables

## 🤝 Support

For issues or questions:

- Check the code comments
- Review Supabase and Stripe documentation
- Ensure all environment variables are set correctly

## 📄 License

This project is provided as-is for use in your B2B furniture wholesale business.

## 🎯 Roadmap

Future enhancements could include:

- Multi-currency support
- Advanced inventory management
- Product variants and options
- Custom pricing per customer
- Automated reorder alerts
- Integration with shipping providers
- Advanced analytics dashboard
- Mobile app (React Native)

---

**Built with ❤️ for wholesale furniture businesses**