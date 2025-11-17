import { useState } from 'react'
import { Outlet, Navigate, useNavigate } from 'react-router-dom'
import { SidebarNav } from '@/components/SidebarNav'
import { CartDrawer } from '@/components/CartDrawer'
import { OrderRequestModal } from '@/components/QuoteRequestModal'
import { useAuth } from '@/hooks/useAuth'
import { useCartStore } from '@/stores/cartStore'
import { DemoModeBanner } from '@/components/DemoModeBanner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, ShoppingCart } from 'lucide-react'

export function DashboardLayout() {
  const [cartOpen, setCartOpen] = useState(false)
  const [quoteModalOpen, setQuoteModalOpen] = useState(false)
  const { isAuthenticated, isLoading } = useAuth()
  const { getItemCount } = useCartStore()
  const navigate = useNavigate()
  
  // Check if we're in demo mode or dev mode (placeholder credentials)
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
  const isDemoMode = supabaseUrl.includes('placeholder')
  const isDevMode = import.meta.env.VITE_DEV_MODE === 'true'

  const cartItemCount = getItemCount()

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
      <div className="flex-1 flex flex-col">
        {/* Top Header with Cart */}
        <header className="glass-nav border-b border-border/50 p-4">
          <div className="flex items-center justify-end">
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              onClick={() => setCartOpen(true)}
            >
              <ShoppingCart className="w-5 h-5" />
              {cartItemCount > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                >
                  {cartItemCount > 99 ? '99+' : cartItemCount}
                </Badge>
              )}
            </Button>
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

