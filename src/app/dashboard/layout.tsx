import { useState } from 'react'
import { Outlet, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { SidebarNav } from '@/components/SidebarNav'
import { CartDrawer } from '@/components/CartDrawer'
import { OrderRequestModal } from '@/components/QuoteRequestModal'
import { useAuth } from '@/hooks/useAuth'
import { useCartStore } from '@/stores/cartStore'
import { DemoModeBanner } from '@/components/DemoModeBanner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Loader2,
  ShoppingCart,
  Bell,
  Plus,
  Sun,
  Moon,
  Settings,
  Building2,
  LogOut,
  FileText,
  Package,
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

// Buyers section removed — this is a single-wholesaler platform. Stores place orders directly to us.

// Page title mapping for breadcrumbs
const pageTitles: Record<string, string> = {
  '/dashboard': 'Overview',
  '/dashboard/products': 'Products',
  '/dashboard/orders': 'Orders',
  '/dashboard/complaints': 'Complaints & Returns',
  '/dashboard/csv-import': 'CSV Import',
  '/dashboard/quotes': 'Quotes',
  '/dashboard/settings': 'Settings',
  '/dashboard/analytics': 'Analytics',
}

export function DashboardLayout() {
  const [cartOpen, setCartOpen] = useState(false)
  const [quoteModalOpen, setQuoteModalOpen] = useState(false)
  const { isAuthenticated, isLoading, profile, company, signOut } = useAuth()
  const { getItemCount } = useCartStore()
  const navigate = useNavigate()
  const location = useLocation()
  const { isDark, toggle: toggleTheme } = useDarkMode()
  
  // Check if we're in demo mode or dev mode (placeholder credentials)
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
  const isDemoMode = supabaseUrl.includes('placeholder')
  const isDevMode = import.meta.env.VITE_DEV_MODE === 'true'

  const cartItemCount = getItemCount()

  // Get current page title for breadcrumbs
  const getPageTitle = () => {
    const path = location.pathname
    for (const [route, title] of Object.entries(pageTitles)) {
      if (path === route || (route !== '/dashboard' && path.startsWith(route))) {
        return title
      }
    }
    return 'Dashboard'
  }

  // Get user initials for avatar
  const getUserInitials = () => {
    if (profile?.full_name) {
      const names = profile.full_name.split(' ')
      if (names.length >= 2) {
        return `${names[0][0]}${names[1][0]}`.toUpperCase()
      }
      return profile.full_name.substring(0, 2).toUpperCase()
    }
    if (profile?.email) {
      return profile.email.substring(0, 2).toUpperCase()
    }
    return 'JD'
  }

  // Hardcoded notification count (as requested)
  const notificationCount = 3
  const pendingOrders = 3
  const lowStockItems = 5

  if (isLoading && !isDemoMode && !isDevMode) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  // In demo/dev mode, allow access without authentication
  if (!isAuthenticated && !isDemoMode && !isDevMode) {
    return <Navigate to="/auth/login" replace />
  }

  return (
    <div className="min-h-screen flex">
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
                  onClick={() => navigate('/dashboard')}
                >
                  Home
                </span>
                <ChevronRight className="h-4 w-4" />
                <span className="text-gray-900 dark:text-gray-100 font-medium">
                  {getPageTitle()}
                </span>
              </div>

              {/* RIGHT: Actions Group */}
              <div className="flex items-center gap-4">
                {/* Quick Actions Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                      <Plus className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuLabel>Quick Actions</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => {
                        console.log('Create Order clicked')
                        navigate('/dashboard/orders')
                      }}
                      className="cursor-pointer"
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      Create Order
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        console.log('Add Product clicked')
                        navigate('/dashboard/products')
                      }}
                      className="cursor-pointer"
                    >
                      <Package className="mr-2 h-4 w-4" />
                      Add Product
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

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

                {/* Notifications Bell */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative h-9 w-9 hover:bg-gray-100 dark:hover:bg-gray-800"
                  onClick={() => {
                    console.log('Notifications clicked')
                  }}
                >
                  <Bell className="h-5 w-5" />
                  {notificationCount > 0 && (
                    <Badge
                      variant="destructive"
                      className="absolute -top-0.5 -right-0.5 h-5 w-5 flex items-center justify-center p-0 text-xs bg-red-600 hover:bg-red-600"
                    >
                      {notificationCount > 99 ? '99+' : notificationCount}
                    </Badge>
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
                        <span>{pendingOrders} pending</span>
                      </div>
                    )}
                    {lowStockItems > 0 && (
                      <div className="flex items-center gap-1.5 px-3 py-1 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-full text-xs font-medium">
                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                        <span>{lowStockItems} low stock</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Vertical Divider (only if status indicators are shown) */}
                {(pendingOrders > 0 || lowStockItems > 0) && (
                  <div className="hidden lg:block h-6 w-px bg-gray-200 dark:bg-gray-700"></div>
                )}

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

                {/* User Profile Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="h-9 px-2 gap-2 hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-sm font-medium">
                        {getUserInitials()}
                      </div>
                      <div className="hidden md:flex flex-col items-start">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {profile?.full_name || 'User'}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {profile?.role || 'Admin'}
                        </span>
                      </div>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">
                          {profile?.full_name || 'User'}
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
                        navigate('/dashboard/settings')
                      }}
                      className="cursor-pointer"
                    >
                      <Settings className="mr-2 h-4 w-4" />
                      Account Settings
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        console.log('Company Info clicked')
                        navigate('/dashboard/settings')
                      }}
                      className="cursor-pointer"
                    >
                      <Building2 className="mr-2 h-4 w-4" />
                      Company Info
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => {
                        signOut()
                      }}
                      className="cursor-pointer text-red-600 dark:text-red-400"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-6 lg:p-8 overflow-auto custom-scrollbar">
          {(isDemoMode || isDevMode) && (
            <div className="mb-6">
              <DemoModeBanner />
            </div>
          )}
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
            navigate(`/dashboard/orders?newOrder=${orderId}`)
          } else {
            navigate('/dashboard/orders')
          }
        }}
      />
    </div>
  )
}

