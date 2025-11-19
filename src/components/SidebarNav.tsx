import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Package,
  FileText,
  Upload,
  Settings,
  LogOut,
  Building2,
  User,
  CreditCard,
  Palette,
  ChevronDown,
  Heart,
  BarChart3,
  AlertCircle,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useWishlist } from '@/hooks/useWishlist'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

// Buyers section removed — this is a single-wholesaler platform. Stores place orders directly to us.

// Main navigation items
const mainNavItems = [
  {
    title: 'Overview',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Orders',
    href: '/dashboard/orders',
    icon: FileText,
    badge: 0, // TODO: Calculate from orders with awaiting_payment status
  },
  {
    title: 'Complaints & Returns',
    href: '/dashboard/complaints',
    icon: AlertCircle,
  },
  {
    title: 'Analytics',
    href: '/dashboard/analytics',
    icon: BarChart3,
  },
]

// Catalog submenu items
const catalogSubmenuItems = [
  {
    title: 'Products',
    href: '/dashboard/products',
    icon: Package,
  },
  {
    title: 'Wishlist',
    href: '/dashboard/wishlist',
    icon: Heart,
  },
]

// Settings submenu items
const settingsSubmenuItems = [
  {
    title: 'Company',
    href: '/dashboard/settings?tab=company',
    icon: Building2,
  },
  {
    title: 'Profile',
    href: '/dashboard/settings?tab=profile',
    icon: User,
  },
  {
    title: 'Billing',
    href: '/dashboard/settings?tab=billing',
    icon: CreditCard,
  },
  {
    title: 'Appearance',
    href: '/dashboard/settings?tab=appearance',
    icon: Palette,
  },
  {
    title: 'CSV Import',
    href: '/dashboard/csv-import',
    icon: Upload,
  },
]

export function SidebarNav() {
  const location = useLocation()
  const navigate = useNavigate()
  const { company, signOut } = useAuth()
  const { count: wishlistCount } = useWishlist()
  // Default to open on page load
  const [settingsOpen, setSettingsOpen] = useState<string>('settings')
  const [catalogOpen, setCatalogOpen] = useState<string>('catalog')

  // Check if item is active
  const isItemActive = (href: string) => {
    if (href === '/dashboard') {
      return location.pathname === href
    }
    return location.pathname.startsWith(href)
  }

  // Check if submenu item is active
  const isSubmenuItemActive = (href: string) => {
    // Handle query params for settings tabs
    if (href.includes('?')) {
      const [path, query] = href.split('?')
      const [key, value] = query.split('=')
      const urlParams = new URLSearchParams(window.location.search)
      return location.pathname === path && urlParams.get(key) === value
    }
    return location.pathname === href
  }

  // Check if Catalog or any submenu is active
  const isCatalogActive = () => {
    return (
      location.pathname === '/dashboard/products' ||
      location.pathname === '/dashboard/wishlist' ||
      catalogSubmenuItems.some((item) => isSubmenuItemActive(item.href))
    )
  }

  // Check if Settings or any submenu is active
  const isSettingsActive = () => {
    return (
      location.pathname === '/dashboard/settings' ||
      settingsSubmenuItems.some((item) => isSubmenuItemActive(item.href))
    )
  }

  // Auto-open Catalog submenu if on catalog page or any submenu, or use saved state
  useEffect(() => {
    const isActive = isCatalogActive()
    if (isActive) {
      setCatalogOpen('catalog')
    } else {
      // Check localStorage, default to open if not set
      const savedState = localStorage.getItem('sidebar-catalog-open')
      if (savedState === null) {
        // First time - default to open
        setCatalogOpen('catalog')
        localStorage.setItem('sidebar-catalog-open', 'true')
      } else if (savedState === 'true') {
        setCatalogOpen('catalog')
      } else {
        setCatalogOpen('')
      }
    }
  }, [location.pathname, location.search])

  // Auto-open Settings submenu if on settings page or any submenu, or use saved state
  useEffect(() => {
    const isActive = isSettingsActive()
    if (isActive) {
      setSettingsOpen('settings')
    } else {
      // Check localStorage, default to open if not set
      const savedState = localStorage.getItem('sidebar-settings-open')
      if (savedState === null) {
        // First time - default to open
        setSettingsOpen('settings')
        localStorage.setItem('sidebar-settings-open', 'true')
      } else if (savedState === 'true') {
        setSettingsOpen('settings')
      } else {
        setSettingsOpen('')
      }
    }
  }, [location.pathname, location.search])

  // Save catalog submenu state to localStorage
  const handleCatalogToggle = (value: string) => {
    setCatalogOpen(value)
    localStorage.setItem('sidebar-catalog-open', value === 'catalog' ? 'true' : 'false')
  }

  // Save settings submenu state to localStorage
  const handleSettingsToggle = (value: string) => {
    setSettingsOpen(value)
    localStorage.setItem('sidebar-settings-open', value === 'settings' ? 'true' : 'false')
  }

  return (
    <aside className="glass-sidebar w-64 hidden lg:flex flex-col h-screen fixed left-0 top-0 z-40">
      {/* Top Section: Company Branding */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <Link
          to="/dashboard"
          className="flex items-center gap-3 group cursor-pointer"
        >
          {/* Company Logo */}
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg flex items-center justify-center shadow-md flex-shrink-0 group-hover:scale-105 transition-transform">
            {company?.logo_url ? (
              <img
                src={company.logo_url}
                alt={company.name}
                className="w-full h-full rounded-lg object-cover"
              />
            ) : (
              <span className="text-white font-bold text-lg">
                {company?.name?.charAt(0) || 'D'}
              </span>
            )}
          </div>
          <div className="flex flex-col min-w-0">
            <h2 className="font-bold text-base text-gray-900 dark:text-white truncate">
              {company?.name || 'Dev Company'}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Wholesale Platform
            </p>
          </div>
        </Link>
      </div>

      {/* Navigation Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Main Navigation Section */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-3 py-2 mb-2">
            Main Navigation
          </h3>
          <nav className="space-y-1">
            {mainNavItems.map((item) => {
              const isActive = isItemActive(item.href)

              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150',
                    isActive
                      ? 'bg-[#0f172a] dark:bg-[#0f172a] text-white font-semibold hover:bg-[#1e293b] dark:hover:bg-[#1e293b]'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                  )}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  <span className="font-medium flex-1">{item.title}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <Badge
                      variant="destructive"
                      className="h-5 w-5 flex items-center justify-center p-0 text-xs"
                    >
                      {item.badge}
                    </Badge>
                  )}
                </Link>
              )
            })}

            {/* Catalog with Submenu */}
            <Accordion
              type="single"
              collapsible
              value={catalogOpen}
              onValueChange={handleCatalogToggle}
              className="w-full"
            >
              <AccordionItem value="catalog" className="border-0">
                <AccordionTrigger className="hidden" />
                <div 
                  className={cn(
                    'flex items-center rounded-lg transition-all duration-150',
                    isCatalogActive()
                      ? 'bg-[#0f172a] dark:bg-[#0f172a]'
                      : ''
                  )}
                >
                  <div
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 transition-all duration-150 flex-1 cursor-pointer rounded-l-lg',
                      isCatalogActive()
                        ? 'text-white font-semibold hover:bg-[#1e293b] dark:hover:bg-[#1e293b]'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                    )}
                    onClick={(e) => {
                      if (location.pathname !== '/dashboard/products' && location.pathname !== '/dashboard/wishlist') {
                        navigate('/dashboard/products')
                      }
                      handleCatalogToggle(catalogOpen === 'catalog' ? '' : 'catalog')
                    }}
                  >
                    <Package className={cn(
                      'w-5 h-5 flex-shrink-0',
                      isCatalogActive() ? 'text-white' : 'text-gray-700 dark:text-gray-300'
                    )} />
                    <span className="font-medium flex-1">Catalog</span>
                  </div>
                  <button
                    type="button"
                    className={cn(
                      'p-2 rounded-r-lg transition-all duration-150 flex items-center justify-center relative z-10',
                      isCatalogActive()
                        ? 'hover:bg-[#1e293b] dark:hover:bg-[#1e293b]'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                    )}
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleCatalogToggle(catalogOpen === 'catalog' ? '' : 'catalog')
                    }}
                    aria-label="Toggle catalog menu"
                    style={{
                      minWidth: '32px',
                      minHeight: '32px'
                    }}
                  >
                    <ChevronDown 
                      className={cn(
                        'h-4 w-4 shrink-0 transition-transform duration-200',
                        catalogOpen === 'catalog' && 'rotate-180',
                        isCatalogActive() ? 'text-white' : 'text-gray-800 dark:text-gray-300'
                      )}
                      style={{
                        opacity: 1,
                        visibility: 'visible',
                        display: 'block',
                        pointerEvents: 'none',
                        stroke: isCatalogActive() ? '#ffffff' : '#1f2937',
                        strokeWidth: isCatalogActive() ? 3.5 : 2.5,
                        fill: 'none',
                        filter: isCatalogActive() ? 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))' : 'none'
                      }}
                    />
                  </button>
                </div>
                <AccordionContent className="pt-1">
                  <div className="space-y-1 pl-6">
                    {catalogSubmenuItems.map((subItem) => {
                      const isSubActive = isSubmenuItemActive(subItem.href)
                      const isWishlist = subItem.href === '/dashboard/wishlist'
                      return (
                        <Link
                          key={subItem.href}
                          to={subItem.href}
                          className={cn(
                            'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors duration-150',
                            isSubActive
                              ? 'bg-[#0f172a]/10 dark:bg-[#0f172a]/20 text-[#0f172a] dark:text-white font-semibold'
                              : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
                          )}
                        >
                          <subItem.icon className={cn(
                            'w-4 h-4',
                            isWishlist && wishlistCount > 0 && 'text-red-500 fill-red-500'
                          )} />
                          <span>{subItem.title}</span>
                          {isWishlist && wishlistCount > 0 && (
                            <Badge
                              variant="destructive"
                              className="ml-auto h-5 min-w-5 flex items-center justify-center px-1.5 text-xs"
                            >
                              {wishlistCount > 99 ? '99+' : wishlistCount}
                            </Badge>
                          )}
                        </Link>
                      )
                    })}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </nav>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200 dark:border-gray-700"></div>

        {/* Tools & Account Section */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-3 py-2 mb-2">
            Tools & Account
          </h3>
          <nav className="space-y-1">
            {/* Settings with Submenu */}
            <Accordion
              type="single"
              collapsible
              value={settingsOpen}
              onValueChange={handleSettingsToggle}
              className="w-full"
            >
              <AccordionItem value="settings" className="border-0">
                {/* Hidden AccordionTrigger for Radix to work properly */}
                <AccordionTrigger className="hidden" />
                <div 
                  className={cn(
                    'flex items-center rounded-lg transition-all duration-150',
                    isSettingsActive()
                      ? 'bg-[#0f172a] dark:bg-[#0f172a]'
                      : ''
                  )}
                >
                  {/* Settings Icon and Text - Clickable */}
                  <div
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 transition-all duration-150 flex-1 cursor-pointer rounded-l-lg',
                      isSettingsActive()
                        ? 'text-white font-semibold hover:bg-[#1e293b] dark:hover:bg-[#1e293b]'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                    )}
                    onClick={(e) => {
                      // Navigate to settings if not already there
                      if (location.pathname !== '/dashboard/settings') {
                        navigate('/dashboard/settings')
                      }
                      // Toggle accordion
                      handleSettingsToggle(settingsOpen === 'settings' ? '' : 'settings')
                    }}
                  >
                    <Settings className={cn(
                      'w-5 h-5 flex-shrink-0',
                      isSettingsActive() ? 'text-white' : 'text-gray-700 dark:text-gray-300'
                    )} />
                    <span className="font-medium flex-1">Settings</span>
                  </div>
                  {/* Custom chevron button - always visible, good looking, and rotates */}
                  <button
                    type="button"
                    className={cn(
                      'p-2 rounded-r-lg transition-all duration-150 flex items-center justify-center relative z-10',
                      isSettingsActive()
                        ? 'hover:bg-[#1e293b] dark:hover:bg-[#1e293b]'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                    )}
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleSettingsToggle(settingsOpen === 'settings' ? '' : 'settings')
                    }}
                    aria-label="Toggle settings menu"
                    style={{
                      minWidth: '32px',
                      minHeight: '32px'
                    }}
                  >
                    <ChevronDown 
                      className={cn(
                        'h-4 w-4 shrink-0 transition-transform duration-200',
                        settingsOpen === 'settings' && 'rotate-180',
                        // Force color classes
                        isSettingsActive() ? 'text-white' : 'text-gray-800 dark:text-gray-300'
                      )}
                      style={{
                        opacity: 1,
                        visibility: 'visible',
                        display: 'block',
                        pointerEvents: 'none',
                        stroke: isSettingsActive() ? '#ffffff' : '#1f2937',
                        strokeWidth: isSettingsActive() ? 3.5 : 2.5,
                        fill: 'none',
                        filter: isSettingsActive() ? 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))' : 'none'
                      }}
                    />
                  </button>
                </div>
                <AccordionContent className="pt-1">
                  <div className="space-y-1 pl-6">
                    {settingsSubmenuItems.map((subItem) => {
                      const isSubActive = isSubmenuItemActive(subItem.href)
                      return (
                        <Link
                          key={subItem.href}
                          to={subItem.href}
                          className={cn(
                            'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors duration-150',
                            isSubActive
                              ? 'bg-[#0f172a]/10 dark:bg-[#0f172a]/20 text-[#0f172a] dark:text-white font-semibold'
                              : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
                          )}
                        >
                          <subItem.icon className="w-4 h-4" />
                          <span>{subItem.title}</span>
                        </Link>
                      )
                    })}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            {/* Logout */}
            <Button
              variant="ghost"
              className="w-full justify-start px-3 py-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors duration-150"
              onClick={signOut}
            >
              <LogOut className="w-5 h-5 mr-3" />
              <span className="font-medium">Logout</span>
            </Button>
          </nav>
        </div>
      </div>
    </aside>
  )
}
