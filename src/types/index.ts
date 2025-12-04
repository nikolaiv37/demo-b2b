export interface Company {
  id: string
  name: string
  slug: string
  logo_url?: string
  stripe_id?: string
  eik_bulstat?: string
  vat_number?: string
  phone?: string
  address?: string
  website?: string
  onboarding_completed?: boolean
  created_at: string
  updated_at: string
}

export type UserRole = 'admin' | 'company'

export interface Profile {
  id: string
  role: UserRole
  company_id?: string | null
  company_name?: string | null
  phone?: string | null
  email?: string // May not exist in DB, but we use it from auth.users
  full_name?: string // May not exist in DB, but we might use it
  avatar_url?: string // May not exist in DB, but we might use it
  created_at: string
  updated_at?: string // May not exist in DB
}

export interface Product {
  id: string
  supplier_id: string
  sku: string
  name: string
  description?: string
  category?: string // ← DEPRECATED – kept only for old CSV imports. Never use in queries.
  category_id?: string | null // Normalized foreign key to categories table
  model?: string
  manufacturer?: string
  retail_price?: number
  weboffer_price: number
  availability?: string
  quantity: number
  weight?: number
  transportational_weight?: number
  date_expected?: string
  main_image?: string
  images: string[]
  is_visible?: boolean
  specs?: Record<string, unknown>
  created_at?: string
  updated_at?: string
  // Legacy/alias fields for compatibility
  company_id?: string
  moq?: number
  wholesale_price?: number
  stock?: number
}

export interface QuoteItem {
  product_id: string
  product_name: string
  sku: string
  quantity: number
  unit_price: number
  total: number
}

// New order workflow statuses
export type QuoteStatus = 'processing' | 'awaiting_payment' | 'shipped' | 'completed'

// Legacy status mapping for database compatibility
// DB values: 'new' -> 'processing', 'pending' -> 'awaiting_payment', 'approved' -> 'completed', 'shipped' -> 'shipped'

export interface Quote {
  id: string
  customer_id: string
  company_id: string
  items: QuoteItem[]
  subtotal: number
  tax?: number
  shipping?: number
  total: number
  status: QuoteStatus
  expires_at: string
  notes?: string
  customer_email?: string
  customer_name?: string
  created_at: string
  updated_at: string
}

// New simplified order statuses workflow
export type OrderStatus = 'processing' | 'awaiting_payment' | 'shipped' | 'completed'

// Shipping method options
export type ShippingMethod = 
  | 'warehouse_pickup'    // Pick up from our Warehouse
  | 'transport_company'   // Delivery to a transportation company of your choice
  | 'dropshipping'        // Delivery to your Customer (Dropshipping)
  | 'shop_delivery'       // Delivery to your Shop (DEFAULT)

// Shipping method display labels and icons
export const SHIPPING_METHOD_CONFIG: Record<ShippingMethod, { label: string; shortLabel: string; icon: string; color: string }> = {
  warehouse_pickup: {
    label: 'Pick up from our Warehouse',
    shortLabel: 'Warehouse',
    icon: '🏭',
    color: 'blue',
  },
  transport_company: {
    label: 'Delivery to transportation company',
    shortLabel: 'Transport',
    icon: '🚛',
    color: 'amber',
  },
  dropshipping: {
    label: 'Delivery to your Customer',
    shortLabel: 'Dropship',
    icon: '📦',
    color: 'purple',
  },
  shop_delivery: {
    label: 'Delivery to your Shop',
    shortLabel: 'Shop',
    icon: '🏪',
    color: 'green',
  },
}

export interface Order {
  id: string
  quote_id?: string
  company_id: string
  customer_id: string
  customer_email: string
  customer_name?: string
  items: QuoteItem[]
  subtotal: number
  tax?: number
  shipping?: number
  total: number
  status: OrderStatus
  shipping_method?: ShippingMethod
  payment_id?: string
  payment_status?: 'pending' | 'paid' | 'failed' | 'refunded'
  tracking_number?: string
  notes?: string
  created_at: string
  updated_at: string
  shipped_at?: string
  delivered_at?: string
}

export interface PriceTier {
  min_quantity: number
  max_quantity?: number
  price: number
  discount_percentage?: number
}

export interface CartItem {
  product: Product
  quantity: number
  price: number
  total: number
}

export interface DashboardStats {
  total_revenue: number
  total_orders: number
  pending_quotes: number
  low_stock_products: number
  revenue_change: number
  orders_change: number
}

// Wishlist is per-user, persisted forever, survives catalog re-uploads (uses SKU)
export interface WishlistItem {
  id: string
  user_id: string
  product_sku: string
  created_at: string
}

