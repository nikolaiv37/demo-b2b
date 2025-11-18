import { Product } from '@/types'
import { Link } from 'react-router-dom'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Package, ChevronLeft, ChevronRight, ShoppingCart, ExternalLink } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { useCartStore } from '@/stores/cartStore'
import { useToast } from '@/components/ui/use-toast'

interface ProductQuickViewModalProps {
  product: Product | null
  open: boolean
  onClose: () => void
}

/**
 * Format price in EUR or BGN
 */
function formatPrice(price: number | null | undefined): string {
  if (!price && price !== 0) return 'N/A'
  return `€${price.toFixed(2)}`
}

export function ProductQuickViewModal({
  product,
  open,
  onClose,
}: ProductQuickViewModalProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const { addItem } = useCartStore()
  const { toast } = useToast()

  if (!product) return null

  const images = product.images && product.images.length > 0 
    ? product.images 
    : product.main_image 
    ? [product.main_image]
    : []

  const quantity = product.quantity ?? 0
  const isOutOfStock = quantity === 0
  const hasSku = product.sku && product.sku.trim() !== ''
  const detailUrl = hasSku ? `/dashboard/products/${product.sku}` : '#'

  // Handle add to cart
  const handleAddToCart = () => {
    if (isOutOfStock) {
      toast({
        title: 'Out of Stock',
        description: 'This product is currently out of stock.',
        variant: 'destructive',
      })
      return
    }

    const result = addItem(product, 1, 'buyer')
    
    if (result.success) {
      toast({
        title: 'Added to cart',
        description: `1 × ${product.name} added to cart`,
      })
      onClose() // Close modal after adding
    } else {
      toast({
        title: 'Cannot add to cart',
        description: result.message || 'Unable to add product to cart',
        variant: 'destructive',
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{product.name || 'Product Details'}</DialogTitle>
          <DialogDescription>
            SKU: {product.sku} | {product.category || 'Uncategorized'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-6 mt-4">
          {/* Image Gallery */}
          <div className="space-y-4">
            {images.length > 0 ? (
              <>
                {/* Main Image */}
                <div className="relative aspect-square rounded-lg overflow-hidden bg-muted group">
                  <img
                    src={images[currentImageIndex]}
                    alt={`${product.name} - Image ${currentImageIndex + 1}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.style.display = 'none'
                    }}
                  />
                  
                  {/* Navigation arrows */}
                  {images.length > 1 && (
                    <>
                      <button
                        onClick={() => setCurrentImageIndex((prev) => 
                          prev === 0 ? images.length - 1 : prev - 1
                        )}
                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => setCurrentImageIndex((prev) => 
                          prev === images.length - 1 ? 0 : prev + 1
                        )}
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                      
                      {/* Image counter */}
                      <div className="absolute bottom-2 right-2 bg-black/50 text-white px-2 py-1 rounded text-xs">
                        {currentImageIndex + 1} / {images.length}
                      </div>
                    </>
                  )}
                </div>

                {/* Thumbnail navigation */}
                {images.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {images.map((image, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentImageIndex(index)}
                        className={cn(
                          'flex-shrink-0 w-20 h-20 rounded overflow-hidden border-2 transition-all',
                          currentImageIndex === index 
                            ? 'border-primary ring-2 ring-primary/50' 
                            : 'border-transparent opacity-60 hover:opacity-100 hover:border-border'
                        )}
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
              </>
            ) : (
              <div className="aspect-square rounded-lg bg-muted flex items-center justify-center">
                <Package className="w-24 h-24 text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Product Details */}
          <div className="space-y-4">
            {/* Price */}
            <div>
              <div className="text-3xl font-bold text-primary mb-1">
                {formatPrice(product.weboffer_price)}
              </div>
              {product.retail_price && product.retail_price > (product.weboffer_price || 0) && (
                <div className="text-lg text-muted-foreground line-through">
                  {formatPrice(product.retail_price)}
                </div>
              )}
            </div>

            {/* Stock & Availability */}
            <div className="flex flex-wrap gap-2">
              <Badge
                variant={quantity === 0 ? 'destructive' : quantity <= 10 ? 'secondary' : 'default'}
                className={`
                  ${quantity === 0 && 'bg-red-500'}
                  ${quantity > 0 && quantity <= 10 && 'bg-yellow-500'}
                  ${quantity > 10 && 'bg-green-500'}
                `}
              >
                {quantity === 0 ? 'Out of Stock' : `${quantity} in stock`}
              </Badge>
              {product.availability && (
                <Badge variant="outline">{product.availability}</Badge>
              )}
              {product.category && (
                <Badge variant="outline">{product.category}</Badge>
              )}
              {product.manufacturer && (
                <Badge variant="outline">{product.manufacturer}</Badge>
              )}
            </div>

            {/* Description */}
            {product.description && (
              <div>
                <h4 className="font-semibold mb-2">Description</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {product.description}
                </p>
              </div>
            )}

            {/* Product Details */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              {product.model && (
                <div>
                  <span className="text-muted-foreground">Model:</span>
                  <p className="font-medium">{product.model}</p>
                </div>
              )}
              {product.weight && (
                <div>
                  <span className="text-muted-foreground">Weight:</span>
                  <p className="font-medium">{product.weight} kg</p>
                </div>
              )}
              {product.transportational_weight && (
                <div>
                  <span className="text-muted-foreground">Shipping Weight:</span>
                  <p className="font-medium">{product.transportational_weight} kg</p>
                </div>
              )}
              {product.date_expected && (
                <div>
                  <span className="text-muted-foreground">Expected:</span>
                  <p className="font-medium">{product.date_expected}</p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-4 border-t">
              <Button 
                className="flex-1" 
                disabled={isOutOfStock}
                onClick={handleAddToCart}
              >
                <ShoppingCart className="w-4 h-4 mr-2" />
                Add to Cart
              </Button>
              {hasSku && (
                <Link to={detailUrl} onClick={onClose}>
                  <Button variant="outline">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View Details
                  </Button>
                </Link>
              )}
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

