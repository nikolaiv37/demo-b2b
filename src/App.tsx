import { SpeedInsights } from '@vercel/speed-insights/react'
import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { HelmetProvider } from 'react-helmet-async'
import { ErrorBoundary } from 'react-error-boundary'
import { Toaster } from '@/components/ui/toaster'
import { ErrorFallback } from '@/components/ErrorFallback'
import { AuthGuard } from '@/components/AuthGuard'
import { TenantProvider } from '@/lib/tenant/TenantProvider'
import { TenantBootstrapGate } from '@/components/guards/TenantBootstrapGate'
import { DomainGuardMainOnly } from '@/components/guards/DomainGuardMainOnly'
import { DomainGuardTenantOnly } from '@/components/guards/DomainGuardTenantOnly'
import { TenantActiveGuard } from '@/components/guards/TenantActiveGuard'
import { MembershipGuard } from '@/components/guards/MembershipGuard'
import { SignupGuard } from '@/components/guards/SignupGuard'
import { SlugOnlyGuard } from '@/components/guards/SlugOnlyGuard'
import { useTenant } from '@/lib/tenant/TenantProvider'

// Auth Pages
import { LoginPage } from '@/app/auth/login'
import { PlatformLoginPage } from '@/app/auth/platform-login'
import { SignupPage } from '@/app/auth/signup'
import { OnboardingPage } from '@/app/auth/onboarding'
import { AcceptInvitePage } from '@/app/auth/accept-invite'
import { ClientSetupPage } from '@/app/auth/client-setup'

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
import { TenantEntry } from '@/pages/TenantEntry'
import { MainIndexRoute } from '@/pages/MainIndexRoute'
import { PortalNotFound } from '@/pages/PortalNotFound'

function RootRoute() {
  const { domainKind, tenant } = useTenant()

  if (domainKind === 'tenant' && tenant) {
    return <TenantEntry />
  }

  // Marketing host — show landing page directly, no auth/tenant logic
  if (domainKind === 'marketing') {
    return <LandingPage />
  }

  // App host — workspace discovery / login
  if (domainKind === 'app') {
    return <MainIndexRoute />
  }

  return <PortalNotFound />
}

/**
 * Domain-aware login router.
 * Platform host (domainKind === 'app', no tenant context) → PlatformLoginPage
 * Tenant hosts + /t/:slug routes → original LoginPage (unchanged)
 */
function LoginRouter() {
  const { domainKind, tenant } = useTenant()
  if (domainKind === 'app' && !tenant) {
    return <PlatformLoginPage />
  }
  return <LoginPage />
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
        window.location.reload()
      }}
    >
      <HelmetProvider>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <TenantProvider>
              <TenantBootstrapGate>
                <Routes>
                  {/* Root Route - domain aware */}
                  <Route path="/" element={<RootRoute />} />
                  <Route
                    path="/landing"
                    element={
                      <DomainGuardMainOnly>
                        <LandingPage />
                      </DomainGuardMainOnly>
                    }
                  />

                  {/* Auth Routes */}
                  <Route path="/auth/login" element={<LoginRouter />} />
                  <Route
                    path="/auth/signup"
                    element={
                      <DomainGuardMainOnly>
                        <SignupGuard>
                          <SignupPage />
                        </SignupGuard>
                      </DomainGuardMainOnly>
                    }
                  />
                  <Route path="/auth/onboarding" element={<OnboardingPage />} />
                  <Route path="/auth/accept-invite" element={<AcceptInvitePage />} />
                  <Route path="/auth/client-setup" element={<ClientSetupPage />} />

                  {/* Tenant Dashboard Routes - Protected */}
                  <Route
                    path="/dashboard"
                    element={
                      <DomainGuardTenantOnly>
                        <TenantActiveGuard>
                          <AuthGuard>
                            <MembershipGuard>
                              <DashboardLayout />
                            </MembershipGuard>
                          </AuthGuard>
                        </TenantActiveGuard>
                      </DomainGuardTenantOnly>
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

                  {/* Slug Fallback Routes – /t/:slug/* on app host */}
                  <Route
                    path="/t/:slug"
                    element={
                      <SlugOnlyGuard>
                        <Outlet />
                      </SlugOnlyGuard>
                    }
                  >
                    <Route index element={<TenantEntry />} />
                    <Route path="auth/login" element={<LoginPage />} />
                    <Route path="auth/onboarding" element={<OnboardingPage />} />
                    <Route path="auth/client-setup" element={<ClientSetupPage />} />
                    <Route
                      path="dashboard"
                      element={
                        <DomainGuardTenantOnly>
                          <TenantActiveGuard>
                            <AuthGuard>
                              <MembershipGuard>
                                <DashboardLayout />
                              </MembershipGuard>
                            </AuthGuard>
                          </TenantActiveGuard>
                        </DomainGuardTenantOnly>
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
                    <Route path="*" element={<NotFound />} />
                  </Route>

                  {/* 404 */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </TenantBootstrapGate>
            </TenantProvider>
          </BrowserRouter>
          <Toaster />
          <SpeedInsights />
        </QueryClientProvider>
      </HelmetProvider>
    </ErrorBoundary>
  )
}

export default App
