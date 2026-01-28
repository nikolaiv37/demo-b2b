import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { HelmetProvider } from 'react-helmet-async'
import { ErrorBoundary } from 'react-error-boundary'
import { Toaster } from '@/components/ui/toaster'
import { ErrorFallback } from '@/components/ErrorFallback'
import { AuthGuard } from '@/components/AuthGuard'
import { supabase } from '@/lib/supabase/client'

// Auth Pages
import { LoginPage } from '@/app/auth/login'
import { SignupPage } from '@/app/auth/signup'
import { OnboardingPage } from '@/app/auth/onboarding'

// Dashboard Pages
import { DashboardLayout } from '@/app/dashboard/layout'
import { DashboardOverview } from '@/app/dashboard/overview'
import { ProductsPage } from '@/app/dashboard/products'
import { ProductDetailPage } from '@/app/dashboard/products/[sku]/page'
import { WishlistPage } from '@/app/dashboard/wishlist'
import { OrdersPage } from '@/app/dashboard/orders'
import { QuotesPage } from '@/app/dashboard/quotes'
// Buyers section removed — this is a single-wholesaler platform. Stores place orders directly to us.
import { CSVImportPage } from '@/app/dashboard/csv-import'
import { SettingsPage } from '@/app/dashboard/settings'
import { AnalyticsPage } from '@/app/dashboard/analytics'
import { ComplaintsPage } from '@/app/dashboard/complaints'
import { UnpaidBalancesPage } from '@/app/dashboard/unpaid-balances'
import { CategoriesPage } from '@/app/dashboard/categories'
import { ManageCategoriesPage } from '@/app/dashboard/categories/manage'
import { ClientsPage } from '@/app/dashboard/clients'

import LandingPage from '@/pages/LandingPage'
import { NotFound } from '@/pages/NotFound'

/**
 * IndexRoute: Shows landing page for guests, redirects to dashboard for authenticated users
 */
function IndexRoute() {
  const navigate = useNavigate()
  const [checking, setChecking] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    let mounted = true

    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!mounted) return
        
        if (session?.user) {
          setIsAuthenticated(true)
          navigate('/dashboard', { replace: true })
        } else {
          setChecking(false)
        }
      } catch {
        if (mounted) setChecking(false)
      }
    }

    checkAuth()

    return () => { mounted = false }
  }, [navigate])

  // Show nothing while checking auth (fast check)
  if (checking && !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[color:var(--base)]">
        <div className="h-6 w-6 border-2 border-[color:var(--ink-12)] border-t-[color:var(--landing-accent)] rounded-full animate-spin" />
      </div>
    )
  }

  // User is not authenticated - show landing page
  return <LandingPage />
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

function App() {
  const handleError = (error: Error, errorInfo: { componentStack?: string | null }) => {
    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error caught by boundary:', error)
      console.error('Error info:', errorInfo)
    }
  }

  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={handleError}
      onReset={() => {
        // Reset app state if needed
        window.location.href = '/dashboard'
      }}
    >
      <HelmetProvider>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <Routes>
              {/* Landing / Index Route - Auth-aware */}
              <Route path="/" element={<IndexRoute />} />
              <Route path="/landing" element={<LandingPage />} />

              {/* Auth Routes */}
              <Route path="/auth/login" element={<LoginPage />} />
              <Route path="/auth/signup" element={<SignupPage />} />
              <Route path="/auth/onboarding" element={<OnboardingPage />} />

              {/* Dashboard Routes - Protected by AuthGuard */}
              <Route
                path="/dashboard"
                element={
                  <AuthGuard>
                    <DashboardLayout />
                  </AuthGuard>
                }
              >
                <Route index element={<DashboardOverview />} />
                <Route path="categories" element={<CategoriesPage />} />
                <Route path="categories/:mainCategory" element={<CategoriesPage />} />
                <Route path="categories/:mainCategory/:subCategory" element={<CategoriesPage />} />
                <Route path="categories/manage" element={<ManageCategoriesPage />} />
                <Route path="products" element={<ProductsPage />} />
                <Route path="products/:sku" element={<ProductDetailPage />} />
                <Route path="wishlist" element={<WishlistPage />} />
                <Route path="orders" element={<OrdersPage />} />
                <Route path="complaints" element={<ComplaintsPage />} />
                <Route path="quotes" element={<QuotesPage />} />
                <Route path="csv-import" element={<CSVImportPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="analytics" element={<AnalyticsPage />} />
                <Route path="unpaid-balances" element={<UnpaidBalancesPage />} />
                <Route path="clients" element={<ClientsPage />} />
              </Route>

              {/* 404 */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
          <Toaster />
        </QueryClientProvider>
      </HelmetProvider>
    </ErrorBoundary>
  )
}

export default App
