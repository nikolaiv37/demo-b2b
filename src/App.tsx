import { lazy, Suspense } from 'react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import { BrowserRouter, Routes, Route, Outlet, Navigate } from 'react-router-dom'
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
import { PlatformAdminGuard } from '@/components/guards/PlatformAdminGuard'
import { useTenant } from '@/lib/tenant/TenantProvider'

// Auth Pages
import { LoginPage } from '@/app/auth/login'
import { PlatformLoginPage } from '@/app/auth/platform-login'
import { SignupPage } from '@/app/auth/signup'
import { OnboardingPage } from '@/app/auth/onboarding'
import { AcceptInvitePage } from '@/app/auth/accept-invite'
import { ClientSetupPage } from '@/app/auth/client-setup'
import { OwnerSetupPage } from '@/app/auth/owner-setup'

// Dashboard Pages
import { DashboardLayout } from '@/app/dashboard/layout'
// Heavy pages lazy-loaded (convert named exports to default):
const DashboardOverview = lazy(() => import('@/app/dashboard/overview').then(m => ({ default: m.DashboardOverview })))
import { ProductsPage } from '@/app/dashboard/products'
import { ProductDetailPage } from '@/app/dashboard/products/[sku]/page'
import { WishlistPage } from '@/app/dashboard/wishlist'
const OrdersPage = lazy(() => import('@/app/dashboard/orders').then(m => ({ default: m.OrdersPage })))
import { QuotesPage } from '@/app/dashboard/quotes'
// Buyers section removed — this is a single-wholesaler platform. Stores place orders directly to us.
const CSVImportPage = lazy(() => import('@/app/dashboard/csv-import').then(m => ({ default: m.CSVImportPage })))
import { SettingsPage } from '@/app/dashboard/settings'
const AnalyticsPage = lazy(() => import('@/app/dashboard/analytics').then(m => ({ default: m.AnalyticsPage })))
import { ComplaintsPage } from '@/app/dashboard/complaints'
import { UnpaidBalancesPage } from '@/app/dashboard/unpaid-balances'
import { CategoriesPage } from '@/app/dashboard/categories'
import { ManageCategoriesPage } from '@/app/dashboard/categories/manage'
import { ClientsPage } from '@/app/dashboard/clients'

// Platform Console Pages
const PlatformLayout = lazy(() => import('@/app/platform/layout').then(m => ({ default: m.PlatformLayout })))
const PlatformTenantsPage = lazy(() => import('@/app/platform/tenants').then(m => ({ default: m.PlatformTenantsPage })))
const PlatformTenantDetailPage = lazy(() => import('@/app/platform/tenants/[id]').then(m => ({ default: m.PlatformTenantDetailPage })))

const LandingPage = lazy(() => import('@/pages/LandingPage'))
import { NotFound } from '@/pages/NotFound'
import { TenantEntry } from '@/pages/TenantEntry'
import { MainIndexRoute } from '@/pages/MainIndexRoute'
import { PortalNotFound } from '@/pages/PortalNotFound'
import { PageLoader } from '@/components/PageLoader'

function RootRoute() {
  const { domainKind, tenant } = useTenant()

  // Supabase sometimes lands on "/" with an auth hash when processing invite links
  // (especially on expired/invalid OTP links, or if the redirect path is stripped).
  // Forward these to the invite handler page so users see the correct recovery UI
  // instead of the generic app host state ("No tenant linked").
  if (domainKind === 'app' && !tenant) {
    const hash = window.location.hash
    if (hash) {
      const hashParams = new URLSearchParams(hash.replace(/^#/, ''))
      const hashType = hashParams.get('type')
      const hashErrorCode = hashParams.get('error_code')
      const isInviteHash = hashType === 'invite' || hashErrorCode === 'otp_expired'

      if (isInviteHash) {
        return (
          <Navigate
            to={`/auth/accept-invite${window.location.search}${window.location.hash}`}
            replace
          />
        )
      }
    }
  }

  if (domainKind === 'tenant' && tenant) {
    return <TenantEntry />
  }

  // Marketing host — show landing page directly, no auth/tenant logic
  if (domainKind === 'marketing') {
    return (
      <Suspense fallback={<PageLoader />}>
        <LandingPage />
      </Suspense>
    )
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
                        <Suspense fallback={<PageLoader />}>
                          <LandingPage />
                        </Suspense>
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
                  <Route path="/auth/owner-setup" element={<OwnerSetupPage />} />

                  {/* Platform Console Routes - Protected by PlatformAdminGuard */}
                  <Route
                    path="/platform"
                    element={
                      <PlatformAdminGuard>
                        <Suspense fallback={<PageLoader />}>
                          <PlatformLayout />
                        </Suspense>
                      </PlatformAdminGuard>
                    }
                  >
                    <Route path="tenants" element={<Suspense fallback={<PageLoader />}><PlatformTenantsPage /></Suspense>} />
                    <Route path="tenants/:id" element={<Suspense fallback={<PageLoader />}><PlatformTenantDetailPage /></Suspense>} />
                  </Route>

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
                    <Route index element={<Suspense fallback={<PageLoader />}><DashboardOverview /></Suspense>} />
                    <Route path="categories" element={<CategoriesPage />} />
                    <Route path="categories/:mainCategory" element={<CategoriesPage />} />
                    <Route path="categories/:mainCategory/:subCategory" element={<CategoriesPage />} />
                    <Route path="categories/manage" element={<ManageCategoriesPage />} />
                    <Route path="products" element={<ProductsPage />} />
                    <Route path="products/:sku" element={<ProductDetailPage />} />
                    <Route path="wishlist" element={<WishlistPage />} />
                    <Route path="orders" element={<Suspense fallback={<PageLoader />}><OrdersPage /></Suspense>} />
                    <Route path="complaints" element={<ComplaintsPage />} />
                    <Route path="quotes" element={<QuotesPage />} />
                    <Route path="csv-import" element={<Suspense fallback={<PageLoader />}><CSVImportPage /></Suspense>} />
                    <Route path="settings" element={<SettingsPage />} />
                    <Route path="analytics" element={<Suspense fallback={<PageLoader />}><AnalyticsPage /></Suspense>} />
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
                    <Route path="auth/owner-setup" element={<OwnerSetupPage />} />
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
                      <Route index element={<Suspense fallback={<PageLoader />}><DashboardOverview /></Suspense>} />
                      <Route path="categories" element={<CategoriesPage />} />
                      <Route path="categories/:mainCategory" element={<CategoriesPage />} />
                      <Route path="categories/:mainCategory/:subCategory" element={<CategoriesPage />} />
                      <Route path="categories/manage" element={<ManageCategoriesPage />} />
                      <Route path="products" element={<ProductsPage />} />
                      <Route path="products/:sku" element={<ProductDetailPage />} />
                      <Route path="wishlist" element={<WishlistPage />} />
                      <Route path="orders" element={<Suspense fallback={<PageLoader />}><OrdersPage /></Suspense>} />
                      <Route path="complaints" element={<ComplaintsPage />} />
                      <Route path="quotes" element={<QuotesPage />} />
                      <Route path="csv-import" element={<Suspense fallback={<PageLoader />}><CSVImportPage /></Suspense>} />
                      <Route path="settings" element={<SettingsPage />} />
                      <Route path="analytics" element={<Suspense fallback={<PageLoader />}><AnalyticsPage /></Suspense>} />
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
