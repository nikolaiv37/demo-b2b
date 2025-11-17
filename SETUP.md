# Quick Setup Guide

## 1. Install Dependencies

```bash
npm install
```

## 2. Set Up Supabase

### Create Project
1. Go to https://supabase.com
2. Click "New Project"
3. Fill in project details and create

### Run Database Schema
1. Go to SQL Editor in your Supabase project
2. Copy contents from `supabase/schema.sql`
3. Paste and run

### (Optional) Add Sample Data
1. Copy contents from `supabase/sample-data.sql`
2. Paste and run in SQL Editor

### Configure Storage
1. Go to Storage in Supabase
2. Create new bucket named `logos`
3. Make it public

## 3. Get API Keys

### Supabase
- Go to Settings → API
- Copy URL and anon key

### Stripe
1. Sign up at https://stripe.com
2. Go to Developers → API keys
3. Copy Publishable key (use test key for development)

### Resend
1. Sign up at https://resend.com
2. Go to API Keys
3. Create and copy a new API key

### PostHog
1. Sign up at https://posthog.com
2. Create a new project
3. Copy the Project API Key

## 4. Configure Environment

Create `.env` file (copy from `.env.local`):

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_key
VITE_RESEND_API_KEY=your_resend_key
VITE_POSTHOG_KEY=your_posthog_key
VITE_POSTHOG_HOST=https://app.posthog.com
```

## 5. Run Development Server

```bash
npm run dev
```

Visit http://localhost:5173

## 6. First-Time Usage

1. **Sign Up**: Create your account at `/auth/signup`
2. **Onboarding**: Complete company setup
3. **Import Products**: Use CSV import with the sample file
4. **View Catalog**: Visit `/catalog/your-company-slug`

## Troubleshooting

### Can't connect to Supabase
- Check URL and anon key are correct
- Ensure RLS policies are set up (run schema.sql)

### CSV Import fails
- Check file format matches template
- Ensure all required fields are present
- Verify numeric fields are valid numbers

### Products don't show in catalog
- Ensure products have stock > 0
- Check company_id matches your profile
- Verify RLS policies allow reading products

### Email notifications not working
- Confirm Resend API key is valid
- Check you're using a verified domain (or Resend's test domain)
- Look for errors in browser console

## Need Help?

Check the main README.md for detailed documentation.

