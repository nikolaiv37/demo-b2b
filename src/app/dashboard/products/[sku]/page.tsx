import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Helmet } from 'react-helmet-async'
import { supabase } from '@/lib/supabaseClient'
import { Product } from '@/types'
import { GlassCard } from '@/components/GlassCard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/use-toast'
import { useCartStore } from '@/stores/cartStore'
import {
  Package,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  ShoppingCart,
  Plus,
  Home,
  ChevronRight as ChevronRightIcon,
} from 'lucide-react'
import { useState } from 'react'
import { cn, formatPrice as formatPriceUtil } from '@/lib/utils'
import { AddToOrderModal } from './AddToOrderModal'

/**
 * Product Detail Page
 * 
 * IMPORTANT: This page uses SKU (not id) as the identifier.
 * 
 * Why SKU instead of ID?
 * - SKUs are permanent business identifiers that don't change
 * - Even if products are deleted and re-uploaded via CSV 1000 times,
 *   the SKU remains the same, so URLs stay valid
 * - IDs are database-generated and change on re-import
 * - SKUs are human-readable and shareable
 * 
 * Example URL: /dashboard/products/GP100-0091
 * This will work forever, even after database migrations or CSV re-imports.
 */
export function ProductDetailPage() {
  const { sku } = useParams<{ sku: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { addItem } = useCartStore()
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [addToOrderOpen, setAddToOrderOpen] = useState(false)

  // Fetch product by SKU (not id - see comment above)
  const { data: product, isLoading, error } = useQuery({
    queryKey: ['product', 'sku', sku],
    queryFn: async () => {
      if (!sku) throw new Error('SKU is required')

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('sku', sku)
        .single()

      if (error) {
        // If product not found, return null (we'll show 404 UI)
        if (error.code === 'PGRST116') {
          return null
        }
        throw error
      }

      return data as Product
    },
    enabled: !!sku,
    retry: false,
  })

  // Handle 404 - product not found
  if (!isLoading && (!product || error)) {
    return (
      <>
        <Helmet>
          <title>Product Not Found | Dev Company Wholesale</title>
        </Helmet>
        <div className="min-h-[60vh] flex items-center justify-center">
          <GlassCard className="max-w-md w-full p-8 text-center">
            <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h1 className="text-2xl font-bold mb-2">Product Not Found</h1>
            <p className="text-muted-foreground mb-6">
              The product with SKU <code className="font-mono bg-muted px-2 py-1 rounded">{sku}</code> could not be found.
            </p>
            <Button onClick={() => navigate('/dashboard/products')} className="w-full">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Catalog
            </Button>
          </GlassCard>
        </div>
      </>
    )
  }

  // Loading state
  if (isLoading || !product) {
    return (
      <>
        <Helmet>
          <title>Loading... | Dev Company Wholesale</title>
        </Helmet>
        <div className="space-y-6">
          {/* Breadcrumbs skeleton */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Skeleton className="h-4 w-20" />
            <ChevronRightIcon className="w-4 h-4" />
            <Skeleton className="h-4 w-20" />
            <ChevronRightIcon className="w-4 h-4" />
            <Skeleton className="h-4 w-32" />
          </div>

          {/* Content skeleton */}
          <div className="grid lg:grid-cols-2 gap-8">
            <Skeleton className="aspect-square w-full rounded-lg" />
            <div className="space-y-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-12 w-48" />
              <Skeleton className="h-24 w-full" />
            </div>
          </div>
        </div>
      </>
    )
  }

  // Prepare images
  const images = product.images && product.images.length > 0
    ? product.images
    : product.main_image
    ? [product.main_image]
    : []

  const quantity = product.quantity ?? 0
  const isOutOfStock = quantity === 0
  const isLowStock = quantity > 0 && quantity < 20

  // Format price helper
  const formatPrice = (price: number | null | undefined): string => {
    if (!price && price !== 0) return 'N/A'
    return formatPriceUtil(price)
  }

  // Handle quick add (adds 1 piece to cart)
  const handleQuickAdd = () => {
    const result = addItem(product, 1, 'buyer')
    if (result.success) {
      toast({
        title: 'Added to cart',
        description: `1 × ${product.name} added to cart`,
      })
    } else {
      toast({
        title: 'Cannot add to cart',
        description: result.message || 'Unable to add product to cart',
        variant: 'destructive',
      })
    }
  }

  return (
    <>
      <Helmet>
        <title>{product.name} - {product.sku} | Dev Company Wholesale</title>
        <meta name="description" content={product.description || `${product.name} - ${product.sku}`} />
      </Helmet>

      <div className="space-y-6">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link to="/dashboard" className="hover:text-foreground transition-colors flex items-center gap-1">
            <Home className="w-4 h-4" />
            Dashboard
          </Link>
          <ChevronRightIcon className="w-4 h-4" />
          <Link to="/dashboard/products" className="hover:text-foreground transition-colors">
            Products
          </Link>
          <ChevronRightIcon className="w-4 h-4" />
          <span className="text-foreground font-medium line-clamp-1">{product.name}</span>
        </nav>

        {/* Main Content - Two Column Layout */}
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Side - Image Gallery */}
          <div className="space-y-4">
            {/* Main Image */}
            <GlassCard className="overflow-hidden p-0">
              {images.length > 0 ? (
                <div className="relative aspect-square bg-gradient-to-br from-muted/50 to-muted group">
                  <img
                    src={images[currentImageIndex]}
                    alt={`${product.name} - Image ${currentImageIndex + 1}`}
                    className="w-full h-full object-cover transition-opacity duration-300"
                    loading="eager"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.style.display = 'none'
                      if (target.parentElement) {
                        const placeholder = target.parentElement.querySelector('.image-placeholder')
                        if (placeholder) {
                          (placeholder as HTMLElement).style.display = 'flex'
                        }
                      }
                    }}
                  />
                  
                  {/* Placeholder (hidden by default) */}
                  <div className="image-placeholder hidden absolute inset-0 items-center justify-center">
                    <Package className="w-24 h-24 text-muted-foreground" />
                  </div>

                  {/* Navigation arrows for multiple images */}
                  {images.length > 1 && (
                    <>
                      <button
                        onClick={() => setCurrentImageIndex((prev) =>
                          prev === 0 ? images.length - 1 : prev - 1
                        )}
                        className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white rounded-full p-3 opacity-0 group-hover:opacity-100 transition-all backdrop-blur-sm"
                        aria-label="Previous image"
                      >
                        <ChevronLeft className="w-6 h-6" />
                      </button>
                      <button
                        onClick={() => setCurrentImageIndex((prev) =>
                          prev === images.length - 1 ? 0 : prev + 1
                        )}
                        className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white rounded-full p-3 opacity-0 group-hover:opacity-100 transition-all backdrop-blur-sm"
                        aria-label="Next image"
                      >
                        <ChevronRight className="w-6 h-6" />
                      </button>

                      {/* Image counter */}
                      <div className="absolute bottom-4 right-4 bg-black/60 text-white px-3 py-1.5 rounded-full text-sm backdrop-blur-sm">
                        {currentImageIndex + 1} / {images.length}
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="aspect-square bg-gradient-to-br from-muted/50 to-muted flex items-center justify-center">
                  <Package className="w-24 h-24 text-muted-foreground" />
                </div>
              )}
            </GlassCard>

            {/* Thumbnail Strip */}
            {images.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={cn(
                      'flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all hover:scale-105',
                      currentImageIndex === index
                        ? 'border-primary ring-2 ring-primary/50 shadow-lg'
                        : 'border-transparent opacity-60 hover:opacity-100 hover:border-border'
                    )}
                    aria-label={`View image ${index + 1}`}
                  >
                    <img
                      src={image}
                      alt={`Thumbnail ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right Side - Product Info */}
          <div className="space-y-6">
            {/* Product Name */}
            <div>
              <h1 className="text-4xl font-bold mb-2">{product.name}</h1>
              <p className="text-sm text-muted-foreground font-mono">SKU: {product.sku}</p>
            </div>

            {/* Price */}
            <div>
              <div className="text-5xl font-bold text-primary mb-2">
                {formatPrice(product.weboffer_price)}
              </div>
              {product.retail_price && product.retail_price > (product.weboffer_price || 0) && (
                <div className="text-xl text-muted-foreground line-through">
                  {formatPrice(product.retail_price)}
                </div>
              )}
            </div>

            {/* Stock Badge */}
            <div>
              {isOutOfStock ? (
                <Badge variant="destructive" className="text-base px-4 py-2">
                  Out of Stock
                </Badge>
              ) : isLowStock ? (
                <Badge variant="secondary" className="text-base px-4 py-2 bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500/50">
                  Only {quantity} left
                </Badge>
              ) : (
                <Badge variant="default" className="text-base px-4 py-2 bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/50">
                  In Stock
                </Badge>
              )}
            </div>

            {/* Short Description */}
            {product.description && (
              <div>
                <p className="text-muted-foreground leading-relaxed line-clamp-3">
                  {product.description}
                </p>
              </div>
            )}

            {/* Category & Manufacturer Chips */}
            <div className="flex flex-wrap gap-2">
              {product.category && (
                <Badge variant="outline" className="text-sm px-3 py-1.5">
                  {product.category}
                </Badge>
              )}
              {product.manufacturer && (
                <Badge variant="outline" className="text-sm px-3 py-1.5">
                  {product.manufacturer}
                </Badge>
              )}
              {product.availability && (
                <Badge variant="outline" className="text-sm px-3 py-1.5">
                  {product.availability}
                </Badge>
              )}
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 pt-4 border-t">
              <Button
                size="lg"
                className="w-full text-lg py-6"
                onClick={() => setAddToOrderOpen(true)}
                disabled={isOutOfStock}
              >
                <ShoppingCart className="w-5 h-5 mr-2" />
                Add to Order
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="w-full"
                onClick={handleQuickAdd}
                disabled={isOutOfStock}
              >
                <Plus className="w-4 h-4 mr-2" />
                Quick Add 1 pc
              </Button>
            </div>
          </div>
        </div>

        {/* Bottom Section - Full Description & Specs */}
        <div className="grid lg:grid-cols-2 gap-8 mt-12">
          {/* Full Description */}
          {product.description && (
            <GlassCard>
              <h2 className="text-2xl font-bold mb-4">Description</h2>
              <div className="prose prose-sm max-w-none text-muted-foreground whitespace-pre-wrap">
                {product.description}
              </div>
            </GlassCard>
          )}

          {/* Specs Table */}
          {(product.model || product.weight || product.transportational_weight || product.date_expected || product.specs) && (
            <GlassCard>
              <h2 className="text-2xl font-bold mb-4">Specifications</h2>
              <div className="space-y-3">
                {product.model && (
                  <div className="flex justify-between py-2 border-b border-border/50">
                    <span className="text-muted-foreground">Model</span>
                    <span className="font-medium">{product.model}</span>
                  </div>
                )}
                {product.weight && (
                  <div className="flex justify-between py-2 border-b border-border/50">
                    <span className="text-muted-foreground">Weight</span>
                    <span className="font-medium">{product.weight} kg</span>
                  </div>
                )}
                {product.transportational_weight && (
                  <div className="flex justify-between py-2 border-b border-border/50">
                    <span className="text-muted-foreground">Shipping Weight</span>
                    <span className="font-medium">{product.transportational_weight} kg</span>
                  </div>
                )}
                {product.date_expected && (
                  <div className="flex justify-between py-2 border-b border-border/50">
                    <span className="text-muted-foreground">Expected Date</span>
                    <span className="font-medium">{product.date_expected}</span>
                  </div>
                )}
                {product.specs && typeof product.specs === 'object' && (
                  <>
                    {Object.entries(product.specs).map(([key, value]) => (
                      <div key={key} className="flex justify-between py-2 border-b border-border/50">
                        <span className="text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</span>
                        <span className="font-medium">{String(value)}</span>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </GlassCard>
          )}
        </div>

        {/* Related Products Placeholder */}
        <GlassCard>
          <h2 className="text-2xl font-bold mb-4">Related Products</h2>
          <p className="text-muted-foreground">Related products feature coming soon...</p>
        </GlassCard>
      </div>

      {/* Add to Order Modal */}
      <AddToOrderModal
        product={product}
        open={addToOrderOpen}
        onClose={() => setAddToOrderOpen(false)}
      />
    </>
  )
}

