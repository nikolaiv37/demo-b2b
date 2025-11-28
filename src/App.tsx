import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { HelmetProvider } from 'react-helmet-async'
import { ErrorBoundary } from 'react-error-boundary'
import { Toaster } from '@/components/ui/toaster'
import { ErrorFallback } from '@/components/ErrorFallback'
import { AuthGuard } from '@/components/AuthGuard'

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

// Public Pages
import { PublicCatalog } from '@/pages/PublicCatalog'
import { NotFound } from '@/pages/NotFound'

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
              </Route>

              {/* Public Routes */}
              <Route path="/catalog/:companySlug" element={<PublicCatalog />} />

              {/* Redirect root to dashboard or login */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />

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

