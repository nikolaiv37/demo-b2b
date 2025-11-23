import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { GlassCard } from '@/components/GlassCard'
import { ProductCard } from '@/components/ProductCard'
import { QuoteModal } from '@/components/QuoteModal'
import { TieredPriceTable } from '@/components/TieredPriceTable'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/use-toast'
import { useCartStore } from '@/stores/cartStore'
import { useMutationCreateQuote } from '@/hooks/useMutationQuote'
import { Product, Company } from '@/types'
import { calculateOrderTotal } from '@/lib/pricing'
import { formatCurrency } from '@/lib/utils'
import { trackEvent, AnalyticsEvents } from '@/lib/analytics'
import { Search, ShoppingCart, X } from 'lucide-react'

export function PublicCatalog() {
  const { companySlug } = useParams<{ companySlug: string }>()
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [quoteModalOpen, setQuoteModalOpen] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)

  const { items, addItem, removeItem, getTotal, getItemCount, clearCart } =
    useCartStore()
  const { toast } = useToast()
  const createQuoteMutation = useMutationCreateQuote()

  useEffect(() => {
    trackEvent(AnalyticsEvents.CATALOG_VIEWED, { companySlug })
  }, [companySlug])

  const { data: company, isLoading: companyLoading } = useQuery({
    queryKey: ['company', companySlug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('slug', companySlug)
        .single()

      if (error) throw error
      return data as Company
    },
    enabled: !!companySlug,
  })

  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ['public-products', company?.id, categoryFilter, searchQuery],
    queryFn: async () => {
      if (!company?.id) return []

      let query = supabase
        .from('products')
        .select('*')
        .eq('company_id', company.id)
        // Filter products with stock > 0 (handle both stock and quantity fields)
        .or('stock.gt.0,quantity.gt.0')

      if (categoryFilter !== 'all') {
        query = query.eq('category', categoryFilter)
      }

      if (searchQuery) {
        query = query.or(
          `name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,sku.ilike.%${searchQuery}%`
        )
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) throw error
      return data as Product[]
    },
    enabled: !!company?.id,
  })

  const categories = Array.from(
    new Set(products?.map((p) => p.category) || [])
  )

  const handleAddToCart = (product: Product) => {
    const result = addItem(product, product.moq ?? 1, 'company')
    if (result.success) {
      toast({
        title: 'Added to cart',
        description: `${product.name} has been added to your cart.`,
      })
      trackEvent(AnalyticsEvents.PRODUCT_ADDED_TO_CART, {
        productId: product.id,
        productName: product.name,
      })
    } else {
      toast({
        title: 'Cannot add to cart',
        description: result.message,
        variant: 'destructive',
      })
    }
  }

  const handleViewDetails = (product: Product) => {
    setSelectedProduct(product)
    setDetailsOpen(true)
    trackEvent(AnalyticsEvents.PRODUCT_VIEWED, {
      productId: product.id,
      productName: product.name,
    })
  }

  const handleRequestQuote = async (data: {
    customerName: string
    customerEmail: string
    notes?: string
  }) => {
    if (!company || items.length === 0) return

    const cartTotal = getTotal()
    const orderTotals = calculateOrderTotal(cartTotal)

    const quoteItems = items.map((item) => ({
      product_id: item.product.id,
      product_name: item.product.name,
      sku: item.product.sku,
      quantity: item.quantity,
      unit_price: item.price,
      total: item.total,
    }))

    await createQuoteMutation.mutateAsync({
      companyId: company.id,
      customerId: 'guest', // In a real app, this would be the authenticated user ID
      customerEmail: data.customerEmail,
      customerName: data.customerName,
      items: quoteItems,
      subtotal: orderTotals.subtotal,
      tax: orderTotals.tax,
      shipping: orderTotals.shipping,
      total: orderTotals.total,
      notes: data.notes,
    })

    trackEvent(AnalyticsEvents.QUOTE_REQUESTED, {
      companyId: company.id,
      total: orderTotals.total,
      items: items.length,
    })

    clearCart()
    setCartOpen(false)
  }

  const isLoading = companyLoading || productsLoading

  return (
    <>
      <Helmet>
        <title>{company?.name || 'Catalog'} - FurniTrade</title>
        <meta
          name="description"
          content={`Browse ${company?.name || 'our'} wholesale furniture catalog`}
        />
      </Helmet>

      <div className="min-h-screen">
        {/* Header */}
        <header className="glass-nav mx-4 my-4 p-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              {company?.logo_url ? (
                <img
                  src={company.logo_url}
                  alt={company.name}
                  className="h-10 object-contain"
                />
              ) : (
                <h1 className="text-2xl font-bold">{company?.name}</h1>
              )}
            </div>
            <Button
              variant="outline"
              onClick={() => setCartOpen(true)}
              className="relative"
            >
              <ShoppingCart className="w-5 h-5 mr-2" />
              Cart
              {getItemCount() > 0 && (
                <Badge className="ml-2 px-2">{getItemCount()}</Badge>
              )}
            </Button>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 py-8">
          {/* Search & Filters */}
          <div className="mb-8 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
              <Input
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  trackEvent(AnalyticsEvents.CATALOG_SEARCHED, {
                    query: e.target.value,
                  })
                }}
                className="pl-12 h-12 glass"
              />
            </div>

            <div className="flex gap-3 flex-wrap">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-48 glass">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category || 'uncategorized'} value={category || 'uncategorized'}>
                      {category || 'Uncategorized'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Products Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="h-96 rounded-xl" />
              ))}
            </div>
          ) : products && products.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  userRole="company"
                  onViewDetails={handleViewDetails}
                  onAddToCart={handleAddToCart}
                />
              ))}
            </div>
          ) : (
            <GlassCard className="text-center py-16">
              <h3 className="text-xl font-semibold mb-2">No products found</h3>
              <p className="text-muted-foreground">
                Try adjusting your search or filters
              </p>
            </GlassCard>
          )}
        </main>

        {/* Product Details Dialog */}
        <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
          <DialogContent className="sm:max-w-[700px] glass max-h-[90vh] overflow-auto">
            {selectedProduct && (
              <>
                <DialogHeader>
                  <DialogTitle>{selectedProduct.name}</DialogTitle>
                  <DialogDescription>
                    SKU: {selectedProduct.sku}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-6">
                  {selectedProduct.images?.[0] && (
                    <img
                      src={selectedProduct.images[0]}
                      alt={selectedProduct.name}
                      className="w-full h-64 object-cover rounded-lg"
                    />
                  )}
                  <div>
                    <p className="text-muted-foreground mb-2">Description</p>
                    <p>{selectedProduct.description || 'No description available'}</p>
                  </div>
                  <TieredPriceTable product={selectedProduct} userRole="company" />
                  <Button
                    onClick={() => {
                      handleAddToCart(selectedProduct)
                      setDetailsOpen(false)
                    }}
                    className="w-full"
                  >
                    Add to Cart
                  </Button>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Cart Dialog */}
        <Dialog open={cartOpen} onOpenChange={setCartOpen}>
          <DialogContent className="sm:max-w-[500px] glass">
            <DialogHeader>
              <DialogTitle>Shopping Cart</DialogTitle>
              <DialogDescription>
                Review your items before requesting a quote
              </DialogDescription>
            </DialogHeader>

            {items.length === 0 ? (
              <div className="text-center py-8">
                <ShoppingCart className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Your cart is empty</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-3 max-h-64 overflow-auto">
                  {items.map((item) => (
                    <div
                      key={item.product.id}
                      className="flex items-center gap-3 glass-card p-3"
                    >
                      <div className="flex-1">
                        <p className="font-semibold">{item.product.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Qty: {item.quantity} × {formatCurrency(item.price)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">
                          {formatCurrency(item.total)}
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(item.product.id)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="glass-card p-4 space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>{formatCurrency(getTotal())}</span>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Tax (estimated)</span>
                    <span>{formatCurrency(getTotal() * 0.1)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Shipping</span>
                    <span>
                      {getTotal() >= 1000
                        ? 'FREE'
                        : formatCurrency(getTotal() >= 500 ? 25 : 50)}
                    </span>
                  </div>
                  <div className="border-t pt-2 flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span>
                      {formatCurrency(calculateOrderTotal(getTotal()).total)}
                    </span>
                  </div>
                </div>

                <Button
                  className="w-full"
                  size="lg"
                  onClick={() => {
                    setCartOpen(false)
                    setQuoteModalOpen(true)
                  }}
                >
                  Request Quote
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Quote Modal */}
        <QuoteModal
          open={quoteModalOpen}
          onOpenChange={setQuoteModalOpen}
          items={items}
          total={calculateOrderTotal(getTotal()).total}
          onSubmit={handleRequestQuote}
        />
      </div>
    </>
  )
}

