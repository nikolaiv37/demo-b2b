import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  FileText,
  Users,
  Upload,
  Settings,
  LogOut,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'

const navItems = [
  {
    title: 'Overview',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Products',
    href: '/dashboard/products',
    icon: Package,
  },
  {
    title: 'Orders',
    href: '/dashboard/orders',
    icon: FileText,
  },
  {
    title: 'Customers',
    href: '/dashboard/customers',
    icon: Users,
  },
  {
    title: 'CSV Import',
    href: '/dashboard/csv-import',
    icon: Upload,
  },
  {
    title: 'Settings',
    href: '/dashboard/settings',
    icon: Settings,
  },
]

export function SidebarNav() {
  const location = useLocation()
  const { company, signOut } = useAuth()
  
  // Check if we're in demo mode
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
  const isDemoMode = supabaseUrl.includes('placeholder')
  
  // Use demo company name if in demo mode
  const displayCompany = company || (isDemoMode ? { name: 'Demo Company' } : null)

  return (
    <aside className="glass-sidebar w-64 p-6 space-y-6 hidden lg:block">
      {/* Logo/Company */}
      <div className="space-y-2">
        {displayCompany?.logo_url ? (
          <img
            src={displayCompany.logo_url}
            alt={displayCompany.name}
            className="h-12 object-contain"
          />
        ) : (
          <h2 className="text-2xl font-bold">{displayCompany?.name || 'FurniTrade'}</h2>
        )}
        <p className="text-sm text-muted-foreground">
          {isDemoMode ? '🎨 Demo Mode' : 'Wholesale Platform'}
        </p>
      </div>

      {/* Navigation */}
      <nav className="space-y-2">
        {navItems.map((item) => {
          const isActive =
            location.pathname === item.href ||
            (item.href !== '/dashboard' && location.pathname.startsWith(item.href))

          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg transition-all',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'hover:bg-white/10 dark:hover:bg-black/10'
              )}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.title}</span>
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="pt-4 border-t border-white/10">
        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={signOut}
        >
          <LogOut className="w-5 h-5 mr-3" />
          Logout
        </Button>
      </div>
    </aside>
  )
}

