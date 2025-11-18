import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Product } from '@/types'
import { GlassCard } from './GlassCard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useCartStore } from '@/stores/cartStore'
import { useToast } from '@/components/ui/use-toast'
import { Eye, Edit, Trash2, Package, ShoppingCart, Plus, Minus, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ProductGridCardProps {
  product: Product
  onQuickView: (product: Product) => void
  onEdit?: (product: Product) => void
  onDelete?: (product: Product) => void
  isAdmin?: boolean
}

/**
 * Format price in EUR or BGN
 */
function formatPrice(price: number | null | undefined): string {
  if (!price && price !== 0) return 'N/A'
  // For now use EUR, can be made configurable
  return `€${price.toFixed(2)}`
}

/**
 * Get stock badge variant based on quantity
 */
function getStockVariant(quantity: number | undefined): 'default' | 'secondary' | 'destructive' {
  if (!quantity && quantity !== 0) return 'secondary'
  if (quantity === 0) return 'destructive'
  if (quantity <= 10) return 'secondary'
  return 'default'
}

/**
 * Get stock badge text color
 */
function getStockColor(quantity: number | undefined): string {
  if (!quantity && quantity !== 0) return 'text-muted-foreground'
  if (quantity === 0) return 'text-red-600 dark:text-red-400'
  if (quantity <= 10) return 'text-yellow-600 dark:text-yellow-400'
  return 'text-green-600 dark:text-green-400'
}

export function ProductGridCard({
  product,
  onQuickView,
  onEdit,
  onDelete,
  isAdmin = false,
}: ProductGridCardProps) {
  const [localQuantity, setLocalQuantity] = useState(1)
  const { addItem } = useCartStore()
  const { toast } = useToast()
  
  const quantity = product.quantity ?? 0
  const mainImage = product.main_image || product.images?.[0]
  const hasImages = product.images && product.images.length > 0
  const isOutOfStock = quantity === 0
  const maxQuantity = quantity

  const handleAddToCart = () => {
    const qty = Math.min(Math.max(1, localQuantity), maxQuantity)
    const result = addItem(product, qty, 'buyer')
    
    if (result.success) {
      toast({
        title: 'Added to cart',
        description: `${qty} × ${product.name || 'Product'} added to cart`,
      })
      setLocalQuantity(1) // Reset to 1
    } else {
      toast({
        title: 'Cannot add to cart',
        description: result.message || 'Unable to add product to cart',
        variant: 'destructive',
      })
    }
  }

  const handleQuantityChange = (delta: number) => {
    setLocalQuantity((prev) => {
      const newQty = prev + delta
      return Math.max(1, Math.min(newQty, maxQuantity))
    })
  }

  // Stop event propagation for interactive elements
  const handleStopPropagation = (e: React.MouseEvent) => {
    e.stopPropagation()
  }

  // Check if SKU exists for navigation
  const hasSku = product.sku && product.sku.trim() !== ''
  const detailUrl = hasSku ? `/dashboard/products/${product.sku}` : '#'

  // Card links to permanent SKU-based detail page – safe forever even after full CSV re-uploads
  const CardContent = (
    <GlassCard className={cn(
      "group overflow-hidden flex flex-col h-full hover:shadow-lg transition-all duration-300 relative",
      hasSku && "cursor-pointer hover:scale-105"
    )}>
      {/* Hover overlay for clickable indication */}
      {hasSku && (
        <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-0 rounded-xl" />
      )}
      {/* Image Container */}
      <div className="relative z-10 aspect-square bg-gradient-to-br from-muted/50 to-muted overflow-hidden">
        {mainImage ? (
          <img
            src={mainImage}
            alt={product.name || 'Product image'}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            loading="lazy"
            onError={(e) => {
              // Fallback to placeholder on error
              const target = e.target as HTMLImageElement
              target.style.display = 'none'
              if (target.parentElement) {
                target.parentElement.innerHTML = `
                  <div class="w-full h-full flex items-center justify-center text-muted-foreground">
                    <svg class="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                `
              }
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <Package className="w-16 h-16" />
          </div>
        )}

        {/* Image count badge */}
        {hasImages && product.images.length > 1 && (
          <div className="absolute top-2 right-2">
            <Badge variant="secondary" className="backdrop-blur-md bg-black/20 text-white">
              {product.images.length} photos
            </Badge>
          </div>
        )}

        {/* Stock badge overlay */}
        <div className="absolute top-2 left-2">
          <Badge
            variant={getStockVariant(quantity)}
            className={cn(
              'backdrop-blur-md font-semibold',
              quantity === 0 && 'bg-red-500/80 text-white',
              quantity > 0 && quantity <= 10 && 'bg-yellow-500/80 text-white',
              quantity > 10 && 'bg-green-500/80 text-white'
            )}
          >
            {quantity === 0 ? 'Out of Stock' : `${quantity} in stock`}
          </Badge>
        </div>

        {/* Quick view button overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
          <Button
            variant="secondary"
            size="sm"
            onClick={(e) => {
              handleStopPropagation(e)
              onQuickView(product)
            }}
            className="backdrop-blur-md"
          >
            <Eye className="w-4 h-4 mr-2" />
            Quick View
          </Button>
        </div>

      </div>

      {/* Content */}
      <div className="relative z-10 p-4 flex-1 flex flex-col">
        {/* Category Badge */}
        {product.category && (
          <Badge variant="outline" className="w-fit mb-2 text-xs">
            {product.category}
          </Badge>
        )}

        {/* Name - Properly handle UTF-8 */}
        <h3 className="font-bold text-lg mb-2 line-clamp-2 min-h-[3rem] flex-shrink-0">
          {product.name || 'Unnamed Product'}
        </h3>

        {/* SKU */}
        <p className="text-xs text-muted-foreground mb-3 font-mono">
          SKU: {product.sku}
        </p>

        {/* Price */}
        <div className="mb-3">
          <div className="text-2xl font-bold text-primary">
            {formatPrice(product.weboffer_price)}
          </div>
          {product.retail_price && product.retail_price > (product.weboffer_price || 0) && (
            <div className="text-sm text-muted-foreground line-through">
              {formatPrice(product.retail_price)}
            </div>
          )}
        </div>

        {/* Availability */}
        {product.availability && (
          <p className="text-xs text-muted-foreground mb-3">
            {product.availability}
          </p>
        )}

        {/* Quantity Input & Add to Cart */}
        {!isOutOfStock && (
          <div className="mt-auto pt-3 border-t border-border/50 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Qty:</span>
              <div className="flex items-center gap-1 flex-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={(e) => {
                    handleStopPropagation(e)
                    handleQuantityChange(-1)
                  }}
                  disabled={localQuantity <= 1}
                >
                  <Minus className="w-3 h-3" />
                </Button>
                <Input
                  type="number"
                  min="1"
                  max={maxQuantity}
                  value={localQuantity}
                  onChange={(e) => {
                    handleStopPropagation(e)
                    const val = parseInt(e.target.value) || 1
                    setLocalQuantity(Math.max(1, Math.min(val, maxQuantity)))
                  }}
                  onClick={handleStopPropagation}
                  className="h-8 w-16 text-center text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={(e) => {
                    handleStopPropagation(e)
                    handleQuantityChange(1)
                  }}
                  disabled={localQuantity >= maxQuantity}
                >
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
            </div>
            <Button
              size="sm"
              className="w-full"
              onClick={(e) => {
                handleStopPropagation(e)
                handleAddToCart()
              }}
              disabled={isOutOfStock}
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              Add to Cart
            </Button>
          </div>
        )}

        {/* Actions */}
        <div className={cn(
          "pt-3 border-t border-border/50 flex gap-2",
          isOutOfStock && "mt-auto"
        )}>
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={(e) => {
              handleStopPropagation(e)
              onQuickView(product)
            }}
          >
            <Eye className="w-4 h-4 mr-2" />
            View
          </Button>
          {isAdmin && (
            <>
              {onEdit && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    handleStopPropagation(e)
                    onEdit(product)
                  }}
                >
                  <Edit className="w-4 h-4" />
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    handleStopPropagation(e)
                    onDelete(product)
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </>
          )}
        </div>

        {/* View details hint on hover - bottom right corner */}
        {hasSku && (
          <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
            <div className="flex items-center gap-1 bg-black/60 backdrop-blur-md text-white text-xs px-2 py-1 rounded">
              <span>View details</span>
              <ChevronRight className="w-3 h-3" />
            </div>
          </div>
        )}
      </div>
    </GlassCard>
  )

  // If SKU is missing, render card without link (grayed out)
  if (!hasSku) {
    return (
      <div className="opacity-60">
        {CardContent}
      </div>
    )
  }

  // Wrap with Link for navigation
  return (
    <Link
      to={detailUrl}
      className="block h-full"
      onClick={(e) => {
        // Allow navigation, but prevent if clicking on interactive elements
        // (handled by stopPropagation on buttons)
      }}
    >
      {CardContent}
    </Link>
  )
}

