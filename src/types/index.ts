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
  category?: string
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
  specs?: Record<string, any>
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

export type QuoteStatus = 'pending' | 'approved' | 'rejected' | 'expired'

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

export type OrderStatus = 'pending' | 'approved' | 'processing' | 'shipped' | 'delivered' | 'cancelled'

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

