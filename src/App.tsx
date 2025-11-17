import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { HelmetProvider } from 'react-helmet-async'
import { ErrorBoundary } from 'react-error-boundary'
import { Toaster } from '@/components/ui/toaster'
import { ErrorFallback } from '@/components/ErrorFallback'

// Auth Pages
import { LoginPage } from '@/app/auth/login'
import { SignupPage } from '@/app/auth/signup'
import { OnboardingPage } from '@/app/auth/onboarding'

// Dashboard Pages
import { DashboardLayout } from '@/app/dashboard/layout'
import { DashboardOverview } from '@/app/dashboard/overview'
import { ProductsPage } from '@/app/dashboard/products'
import { OrdersPage } from '@/app/dashboard/orders'
import { QuotesPage } from '@/app/dashboard/quotes'
import { CustomersPage } from '@/app/dashboard/customers'
import { CSVImportPage } from '@/app/dashboard/csv-import'
import { SettingsPage } from '@/app/dashboard/settings'

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
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <HelmetProvider>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <Routes>
              {/* Auth Routes */}
              <Route path="/auth/login" element={<LoginPage />} />
              <Route path="/auth/signup" element={<SignupPage />} />
              <Route path="/auth/onboarding" element={<OnboardingPage />} />

              {/* Dashboard Routes */}
              <Route path="/dashboard" element={<DashboardLayout />}>
                <Route index element={<DashboardOverview />} />
                <Route path="products" element={<ProductsPage />} />
                <Route path="orders" element={<OrdersPage />} />
                <Route path="quotes" element={<QuotesPage />} />
                <Route path="customers" element={<CustomersPage />} />
                <Route path="csv-import" element={<CSVImportPage />} />
                <Route path="settings" element={<SettingsPage />} />
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

