# ⚡ Quick Start - FurniTrade

## 🚀 5-Minute Setup

### 1. Install (1 min)
```bash
npm install
```

### 2. Supabase Setup (2 min)
1. Create project at supabase.com
2. Run `supabase/schema.sql` in SQL Editor
3. Create "logos" bucket in Storage (make it public)
4. Copy URL and anon key from Settings → API

### 3. Environment Variables (1 min)
Create `.env`:
```env
VITE_SUPABASE_URL=your_url_here
VITE_SUPABASE_ANON_KEY=your_key_here
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
VITE_RESEND_API_KEY=re_xxx
VITE_POSTHOG_KEY=phc_xxx
VITE_POSTHOG_HOST=https://app.posthog.com
```

### 4. Run (1 min)
```bash
npm run dev
```

Visit: http://localhost:5173

---

## 📋 First-Time Flow

1. **Sign Up** → `/auth/signup`
2. **Onboarding** → Set company name & upload logo
3. **Import Products** → `/dashboard/csv-import`
   - Download template
   - Fill with your products
   - Upload
4. **Share Catalog** → `/catalog/your-company-slug`

---

## 🎯 Key URLs

```
/auth/login              → Login page
/auth/signup             → Sign up
/dashboard               → Analytics overview
/dashboard/products      → Manage products
/dashboard/orders        → View/approve orders
/dashboard/quotes        → Manage quote requests
/dashboard/csv-import    → Bulk import
/dashboard/settings      → Company settings
/catalog/:slug           → Public catalog
```

---

## 📊 Sample Data

Optional: Run `supabase/sample-data.sql` for 8 demo products

Or use: `supabase/sample-products.csv` for CSV import testing

---

## 🔑 API Keys Needed

| Service | Free Tier | Get Key |
|---------|-----------|---------|
| Supabase | ✅ Yes | supabase.com → Settings → API |
| Stripe | ✅ Test Mode | stripe.com → Developers → API keys |
| Resend | ✅ 100/day | resend.com → API Keys |
| PostHog | ✅ 1M events | posthog.com → Project Settings |

---

## 💻 Common Commands

```bash
# Development
npm run dev              # Start dev server
npm run build            # Production build
npm run preview          # Preview build

# Linting
npm run lint             # Check for issues
```

---

## 🐛 Troubleshooting

### "Can't connect to Supabase"
- ✅ Check .env file exists
- ✅ Verify URL and key are correct
- ✅ Ensure schema.sql was run

### "Products not showing"
- ✅ Check company_id in database
- ✅ Verify stock > 0
- ✅ Run schema.sql (sets up RLS)

### "CSV import fails"
- ✅ Check CSV format matches template
- ✅ Ensure SKU is unique
- ✅ Verify prices are numbers

### "Emails not sending"
- ✅ Resend API key in .env
- ✅ Using verified domain or test domain
- ✅ Check browser console for errors

---

## 📱 Testing the Platform

### As Admin (Wholesaler)
1. Sign up and complete onboarding
2. Import products via CSV
3. View dashboard analytics
4. Approve/reject quotes
5. Process orders

### As Buyer (Customer)
1. Visit `/catalog/your-slug`
2. Browse products
3. Add to cart (respects MOQ)
4. Request quote
5. Admin receives email

---

## 🎨 Customization

### Change Colors
Edit `src/index.css` → `:root` variables

### Update Logo
Dashboard → Settings → Upload new logo

### Modify Email Templates
Edit `src/lib/resendClient.ts` → `EmailTemplates`

### Add New Page
1. Create file in `src/app/dashboard/`
2. Add route in `src/App.tsx`
3. Add nav item in `src/components/SidebarNav.tsx`

---

## 🚢 Deploy to Vercel

```bash
# Push to GitHub
git init
git add .
git commit -m "Initial commit"
git push

# In Vercel:
1. Import from GitHub
2. Add environment variables
3. Deploy ✨
```

---

## 📚 Documentation

- **Full Guide**: README.md
- **Setup Details**: SETUP.md
- **Project Overview**: PROJECT_SUMMARY.md

---

## ✅ Checklist

- [ ] npm install completed
- [ ] Supabase project created
- [ ] schema.sql executed
- [ ] logos bucket created
- [ ] .env file configured
- [ ] npm run dev working
- [ ] Account created
- [ ] Onboarding completed
- [ ] Products imported
- [ ] Catalog accessible

---

**Need Help?** Check README.md for detailed documentation.

**Ready to go?** Run `npm run dev` and build something amazing! 🚀

