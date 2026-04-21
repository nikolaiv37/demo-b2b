import { useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { SidebarNav } from '@/components/SidebarNav'
import { CartDrawer } from '@/components/CartDrawer'
import { OrderRequestModal } from '@/components/QuoteRequestModal'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { NotificationBell } from '@/components/NotificationBell'
import { useAuth } from '@/hooks/useAuth'
import { useCartStore } from '@/stores/cartStore'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ShoppingCart,
  Sun,
  Moon,
  Settings,
  Building2,
  Phone,
  LogOut,
  ChevronRight,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useDarkMode } from '@/hooks/useDarkMode'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { useTenant, useTenantPath } from '@/lib/tenant/TenantProvider'

// Buyers section removed — this is a single-wholesaler platform. Stores place orders directly to us.

// Page title mapping for breadcrumbs (will be translated in component)
const pageTitleKeys: Record<string, string> = {
  '/dashboard': 'nav.overview',
  '/dashboard/products': 'products.title',
  '/dashboard/orders': 'orders.title',
  '/dashboard/complaints': 'nav.complaintsReturns',
  '/dashboard/csv-import': 'nav.csvImport',
  '/dashboard/quotes': 'orders.title',
  '/dashboard/settings': 'settings.title',
  '/dashboard/analytics': 'nav.analytics',
  '/dashboard/unpaid-balances': 'orders.title',
  '/dashboard/clients': 'distributors.title',
}

export function DashboardLayout() {
  const { t } = useTranslation()
  const [cartOpen, setCartOpen] = useState(false)
  const [quoteModalOpen, setQuoteModalOpen] = useState(false)
  const { user, profile, company, isAdmin, signOut } = useAuth()
  const { tenant } = useTenant()
  const { withBase, stripBase } = useTenantPath()
  const tenantId = tenant?.id
  
  // Fetch real status data for badges
  const { data: statusData } = useQuery({
    queryKey: ['tenant', tenantId, 'status-badges', user?.id, isAdmin],
    queryFn: async () => {
      if (!tenantId) return null
      if (!isAdmin && !user?.id) return null

      // Fetch pending orders: Processing ('new') + Awaiting Payment ('pending')
      // These are orders that need attention
      const { count: pendingCount } = await supabase
        .from('quotes')
        .select('*', { count: 'exact', head: true })
        .in('status', ['new', 'pending'])
        .eq('tenant_id', tenantId)

      // Fetch low stock products (quantity 1-10)
      const { count: lowStockCount } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .gt('quantity', 0)
        .lte('quantity', 10)
        .eq('tenant_id', tenantId)

      return {
        pendingOrders: pendingCount || 0,
        lowStockItems: lowStockCount || 0,
      }
    },
    enabled: !!tenantId && (isAdmin || !!user?.id),
    refetchInterval: 30000, // Refetch every 30 seconds
  })

  const { getItemCount } = useCartStore()
  const navigate = useNavigate()
  const location = useLocation()
  const { isDark, toggle: toggleTheme } = useDarkMode()

  const cartItemCount = getItemCount()

  const pendingOrders = statusData?.pendingOrders || 0
  const lowStockItems = statusData?.lowStockItems || 0

  const accountManagerName = profile?.full_name || null
  const accountManagerPhone = profile?.phone || company?.phone || null
  const accountCompanyName = company?.name || profile?.company_name || null

  // Get current page title for breadcrumbs
  const getPageTitle = () => {
    const path = stripBase(location.pathname)
    for (const [route, key] of Object.entries(pageTitleKeys)) {
      if (path === route || (route !== '/dashboard' && path.startsWith(route))) {
        return t(key)
      }
    }
    return t('nav.overview')
  }

  // Get user initials for avatar (match b2bcenter account manager card)
  const getUserInitials = () => {
    if (accountManagerName) {
      const names = accountManagerName.split(' ')
      if (names.length >= 2) {
        return `${names[0][0]}${names[1][0]}`.toUpperCase()
      }
      return accountManagerName.substring(0, 2).toUpperCase()
    }
    if (profile?.email) {
      return profile.email.substring(0, 2).toUpperCase()
    }
    return 'JD'
  }

  return (
    <div className="min-h-screen flex overflow-x-hidden">
      <SidebarNav />
      <div className="flex-1 flex flex-col lg:ml-64">
        {/* Enhanced Top Header */}
        <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="px-6 py-4">
            {/* Main Navbar */}
            <div className="flex items-center justify-between">
              {/* LEFT: Breadcrumbs */}
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <span
                  className="hover:text-gray-900 dark:hover:text-gray-100 cursor-pointer"
                  onClick={() => navigate(withBase('/dashboard'))}
                >
                  {t('header.home')}
                </span>
                <ChevronRight className="h-4 w-4" />
                <span className="text-gray-900 dark:text-gray-100 font-medium">
                  {getPageTitle()}
                </span>
              </div>

              {/* RIGHT: Actions Group */}
              <div className="flex items-center gap-4">
                {/* Language Switcher */}
                <LanguageSwitcher />

                {/* Vertical Divider */}
                <div className="h-6 w-px bg-gray-200 dark:bg-gray-700"></div>

                {/* Theme Toggle */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 hover:bg-gray-100 dark:hover:bg-gray-800"
                  onClick={toggleTheme}
                >
                  {isDark ? (
                    <Sun className="h-5 w-5 transition-all" />
                  ) : (
                    <Moon className="h-5 w-5 transition-all" />
                  )}
                </Button>

                {/* Vertical Divider */}
                <div className="h-6 w-px bg-gray-200 dark:bg-gray-700"></div>

                {/* Status Indicators */}
                {(pendingOrders > 0 || lowStockItems > 0) && (
                  <div className="hidden lg:flex items-center gap-2">
                    {pendingOrders > 0 && (
                      <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-full text-xs font-medium">
                        <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                        <span>{pendingOrders} {t('header.pending')}</span>
                      </div>
                    )}
                    {lowStockItems > 0 && (
                      <div className="flex items-center gap-1.5 px-3 py-1 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-full text-xs font-medium">
                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                        <span>{lowStockItems} {t('header.lowStock')}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Vertical Divider (only if status indicators are shown) */}
                {(pendingOrders > 0 || lowStockItems > 0) && (
                  <div className="hidden lg:block h-6 w-px bg-gray-200 dark:bg-gray-700"></div>
                )}

                {/* Notification Bell */}
                <NotificationBell />

                {/* Vertical Divider */}
                <div className="h-6 w-px bg-gray-200 dark:bg-gray-700"></div>

                {/* Cart Icon */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative h-9 w-9 hover:bg-gray-100 dark:hover:bg-gray-800"
                  onClick={() => setCartOpen(true)}
                >
                  <ShoppingCart className="h-5 w-5" />
                  {cartItemCount > 0 && (
                    <Badge
                      variant="destructive"
                      className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                    >
                      {cartItemCount > 99 ? '99+' : cartItemCount}
                    </Badge>
                  )}
                </Button>

                {/* Vertical Divider */}
                <div className="h-6 w-px bg-gray-200 dark:bg-gray-700"></div>

                {/* User Profile Menu — account manager card (b2bcenter parity) */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="h-auto rounded-2xl px-2 py-1.5 hover:bg-slate-100/90 dark:hover:bg-slate-800/80 sm:px-2.5"
                    >
                      <div className="flex items-center gap-2.5 sm:gap-3">
                        <div className="order-2 min-w-0 flex-1 md:order-none">
                          <div className="flex items-center justify-start md:hidden">
                            <div className="min-w-0 text-left">
                              <div className="truncate text-[13px] font-semibold leading-tight text-slate-900 dark:text-white">
                                {accountManagerName || 'User'}
                              </div>
                              {accountManagerPhone && (
                                <div className="mt-0.5 inline-flex max-w-full items-center justify-start gap-1 text-[11px] font-medium leading-tight text-slate-500 dark:text-slate-400">
                                  <Phone className="h-3 w-3 shrink-0 text-slate-400 dark:text-slate-500" />
                                  <span className="truncate">{accountManagerPhone}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="hidden min-w-0 md:flex items-center justify-end gap-4 lg:gap-5">
                            <div className="min-w-0 flex flex-col items-end gap-1 text-right">
                              {accountManagerPhone && (
                                <span className="inline-flex min-w-0 items-center gap-1.5 whitespace-nowrap text-[12px] font-medium leading-none text-slate-600 dark:text-slate-300">
                                  <Phone className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-500" />
                                  <span className="truncate">{accountManagerPhone}</span>
                                </span>
                              )}
                              {accountCompanyName && (
                                <span className="inline-flex min-w-0 max-w-[220px] items-center gap-1.5 truncate text-[12px] font-medium leading-none text-slate-600 dark:text-slate-300 xl:max-w-[260px]">
                                  <Building2 className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-500" />
                                  <span className="truncate">{accountCompanyName}</span>
                                </span>
                              )}
                            </div>
                            <div className="min-w-0 flex flex-col items-end gap-1 text-right">
                              <span className="max-w-[230px] truncate text-[15px] font-semibold tracking-tight text-slate-900 dark:text-white xl:max-w-[280px]">
                                {accountManagerName || 'User'}
                              </span>
                              {isAdmin && (
                                <Badge
                                  variant="secondary"
                                  className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                                >
                                  {t('header.admin')}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="order-1 md:order-none h-10 w-10 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-sm font-medium shrink-0 ring-2 ring-white shadow-sm dark:ring-slate-900">
                          {profile?.avatar_url ? (
                            <img
                              src={profile.avatar_url}
                              alt={profile?.full_name || t('settings.avatarAlt')}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            getUserInitials()
                          )}
                        </div>
                      </div>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">
                          {accountManagerName || profile?.full_name || 'User'}
                        </p>
                        <p className="text-xs leading-none text-muted-foreground">
                          {profile?.email || 'user@example.com'}
                        </p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => {
                        console.log('Account Settings clicked')
                        navigate(withBase('/dashboard/settings'))
                      }}
                      className="cursor-pointer"
                    >
                      <Settings className="mr-2 h-4 w-4" />
                      {t('header.accountSettings')}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        console.log('Company Info clicked')
                        navigate(withBase('/dashboard/settings'))
                      }}
                      className="cursor-pointer"
                    >
                      <Building2 className="mr-2 h-4 w-4" />
                      {t('header.companyInfo')}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => {
                        signOut()
                      }}
                      className="cursor-pointer text-red-600 dark:text-red-400"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      {t('nav.logout')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-6 lg:p-8 overflow-auto custom-scrollbar">
          <Outlet />
        </main>
      </div>

      {/* Cart Drawer */}
      <CartDrawer
        open={cartOpen}
        onOpenChange={setCartOpen}
        onRequestQuote={() => {
          setCartOpen(false)
          setQuoteModalOpen(true)
        }}
      />

      {/* Order Request Modal */}
      <OrderRequestModal
        open={quoteModalOpen}
        onClose={() => setQuoteModalOpen(false)}
        onSuccess={(orderId) => {
          setQuoteModalOpen(false)
          setCartOpen(false)
          // Redirect to orders page with new order highlight
          if (orderId) {
            navigate(`${withBase('/dashboard/orders')}?newOrder=${orderId}`)
          } else {
            navigate(withBase('/dashboard/orders'))
          }
        }}
      />
    </div>
  )
}
