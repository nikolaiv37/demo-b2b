import { useParams, useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Helmet } from 'react-helmet-async'
import { format } from 'date-fns'
import { GlassCard } from '@/components/GlassCard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/use-toast'
import { useCartStore } from '@/stores/cartStore'
import { useWishlist } from '@/hooks/useWishlist'
import { useQueryProductBySku } from '@/hooks/useQueryProducts'
import { useCommissionRate } from '@/hooks/useCommissionRate'
import {
  Package,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  ShoppingCart,
  Plus,
  Minus,
  Home,
  ChevronRight as ChevronRightIcon,
  Heart,
  Percent,
  Layers3,
  PackageCheck,
  Boxes,
  CalendarDays,
  CircleDollarSign,
  Tag,
  Truck,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { cn, formatPrice as formatPriceUtil } from '@/lib/utils'
import { AddToOrderModal } from './AddToOrderModal'
import { Tooltip, TooltipProvider } from '@/components/ui/tooltip'
import { useTenantPath } from '@/lib/tenant/TenantProvider'
import { HtmlContent } from '@/components/HtmlContent'
import { useAuth } from '@/hooks/useAuth'
import { hasNumericStock } from '@/lib/productAvailability'

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
  const { t } = useTranslation()
  const { sku } = useParams<{ sku: string }>()
  const decodedSku = sku ? decodeURIComponent(sku) : ''
  const navigate = useNavigate()
  const { withBase } = useTenantPath()
  const { isAdmin } = useAuth()
  const { toast } = useToast()
  const { addItem } = useCartStore()
  const { isInWishlist, toggleWishlist } = useWishlist()
  const { hasDiscount, commissionRate } = useCommissionRate()
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [addToOrderOpen, setAddToOrderOpen] = useState(false)
  const [isPulsing, setIsPulsing] = useState(false)
  const [selectedQuantity, setSelectedQuantity] = useState(1)
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false)

  // Fetch product by SKU using the new hook that applies commission pricing
  const { data: product, isLoading, error } = useQueryProductBySku(decodedSku)

  const images = useMemo(() => {
    const rawImages = product?.images as unknown
    const normalizedImages =
      Array.isArray(rawImages)
        ? rawImages
        : typeof rawImages === 'string'
          ? rawImages.split(rawImages.includes('|') ? '|' : ',')
          : []

    const candidates = [product?.main_image, ...normalizedImages]

    return Array.from(
      new Set(
        candidates
          .flatMap((value) => (typeof value === 'string' ? value.split('|') : []))
          .flatMap((value) => value.split(','))
          .map((value) => value.trim())
          .filter(Boolean)
      )
    )
  }, [product?.images, product?.main_image])

  const quantity = product?.quantity ?? 0
  const isOutOfStock = quantity === 0
  const isLowStock = quantity > 0 && quantity < 20
  const hasKnownQuantity = hasNumericStock(product?.quantity)
  const stockLabel = isOutOfStock ? t('products.outOfStock') : t('products.inStock')
  const stockCountLabel = hasKnownQuantity
    ? t('products.stockCount', { count: product?.quantity })
    : t('products.stockUnknown')
  const stockStatusClass = isOutOfStock
    ? 'border-red-500/25 bg-red-500/10 text-red-700 dark:text-red-300'
    : isLowStock
      ? 'border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300'
      : 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
  const displayCategory = product?.category || t('products.uncategorized')
  const displayUpdatedAt = product?.updated_at
    ? format(new Date(product.updated_at), 'dd MMM yyyy')
    : null
  const maxOrderQuantity = hasKnownQuantity ? Math.max(quantity, 1) : 1
  const descriptionText = (product?.description || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
  const showDescription = Boolean(product?.description)
  const isLongDescription = descriptionText.length > 420
  const detailRows = [
    ...(product?.manufacturer ? [{ label: t('products.manufacturer'), value: product.manufacturer }] : []),
    ...(product?.model ? [{ label: t('products.model'), value: product.model }] : []),
    ...(product?.moq ? [{ label: t('products.moq'), value: t('products.minimumOrderQuantityValue', { count: product.moq }) }] : []),
    ...(product?.weight ? [{ label: t('products.weight'), value: `${product.weight} kg` }] : []),
    ...(product?.transportational_weight
      ? [{ label: t('products.shippingWeight'), value: `${product.transportational_weight} kg` }]
      : []),
    ...(product?.date_expected ? [{ label: t('products.expectedDate'), value: product.date_expected }] : []),
  ]
  const normalizedSpecEntries =
    product?.specs && typeof product.specs === 'object'
      ? Object.entries(product.specs)
          .filter(([, value]) => value !== null && value !== undefined && String(value).trim() !== '')
          .filter(([key]) => !['sku', 'category', 'stock', 'quantity', 'manufacturer', 'model', 'weight', 'transportational_weight', 'date_expected', 'price', 'weboffer_price', 'retail_price', 'availability', 'main_image', 'images'].includes(key))
          .map(([key, value]) => ({
            label:
              key === 'moq'
                ? t('products.moq')
                : key === 'ean'
                  ? t('products.ean')
                  : key === 'barcode'
                    ? t('products.barcode')
                    : key === 'material'
                      ? t('products.material')
                      : key === 'dimensions'
                        ? t('products.dimensions')
                        : key === 'size'
                          ? t('products.size')
                          : key
                              .replace(/_/g, ' ')
                              .replace(/([a-z])([A-Z])/g, '$1 $2')
                              .replace(/\s+/g, ' ')
                              .trim()
                              .replace(/^./, (char) => char.toUpperCase()),
            value: String(value),
          }))
      : []
  const secondaryDetailRows = [...detailRows, ...normalizedSpecEntries]

  useEffect(() => {
    setCurrentImageIndex(0)
  }, [images.length, product?.sku])

  useEffect(() => {
    setIsDescriptionExpanded(false)
  }, [product?.description, product?.sku])

  // Use adjusted_price if available, otherwise fall back to weboffer_price
  const displayPrice = product?.adjusted_price ?? product?.weboffer_price
  const hasCommissionDiscount =
    hasDiscount &&
    product?.adjusted_price !== undefined &&
    product.adjusted_price < (product.weboffer_price || 0)

  // Format price helper
  const formatPrice = (price: number | null | undefined): string => {
    if (!price && price !== 0) return 'N/A'
    return formatPriceUtil(price)
  }

  // Handle 404 - product not found
  if (!isLoading && (!product || error)) {
    return (
      <>
        <Helmet>
          <title>{t('products.productNotFound')} | Demo B2B Portal</title>
        </Helmet>
        <div className="min-h-[60vh] flex items-center justify-center">
          <GlassCard className="max-w-md w-full p-8 text-center">
            <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h1 className="text-2xl font-bold mb-2">{t('products.productNotFound')}</h1>
            <p className="text-muted-foreground mb-6">
              {t('products.productNotFoundDescription', { sku: decodedSku })}
            </p>
            <Button onClick={() => navigate(withBase('/dashboard/products'))} className="w-full">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('general.backToCatalog')}
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
          <title>Loading... | Demo B2B Portal</title>
        </Helmet>
        <div className="space-y-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Skeleton className="h-4 w-20" />
            <ChevronRightIcon className="w-4 h-4" />
            <Skeleton className="h-4 w-20" />
            <ChevronRightIcon className="w-4 h-4" />
            <Skeleton className="h-4 w-32" />
          </div>

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

  // Handle quick add (adds 1 piece to cart)
  const handleQuickAdd = () => {
    const result = addItem(product, selectedQuantity, 'buyer')
    if (result.success) {
      toast({
        title: t('products.addedToOrder'),
        description: t('products.addedToOrderDescription', { count: selectedQuantity, name: product.name }),
      })
    } else {
      toast({
        title: t('products.cannotAddToOrder'),
        description: result.message || t('products.cannotAddToOrderDescription'),
        variant: 'destructive',
      })
    }
  }

  // Handle wishlist toggle
  const handleWishlistToggle = () => {
    if (product.sku) {
      const wasInWishlist = isInWishlist(product.sku)
      toggleWishlist(product.sku)
      if (!wasInWishlist) {
        setIsPulsing(true)
        setTimeout(() => setIsPulsing(false), 600)
        toast({
          title: t('products.addedToWishlist'),
          description: t('products.addedToWishlistDescription', { name: product.name }),
        })
      } else {
        toast({
          title: t('products.removedFromWishlist'),
          description: t('products.removedFromWishlistDescription', { name: product.name }),
        })
      }
    }
  }

  const inWishlist = product?.sku ? isInWishlist(product.sku) : false

  return (
    <>
      <Helmet>
        <title>{product.name} - {product.sku} | Demo B2B Portal</title>
        <meta name="description" content={(product.description || `${product.name} - ${product.sku}`).replace(/<[^>]*>/g, '').slice(0, 160)} />
      </Helmet>

      <div className="space-y-6">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link to={withBase('/dashboard')} className="hover:text-foreground transition-colors flex items-center gap-1">
            <Home className="w-4 h-4" />
            {t('nav.overview')}
          </Link>
          <ChevronRightIcon className="w-4 h-4" />
          <Link to={withBase('/dashboard/products')} className="hover:text-foreground transition-colors">
            {t('products.title')}
          </Link>
          <ChevronRightIcon className="w-4 h-4" />
          <span className="text-foreground font-medium line-clamp-1">{product.name}</span>
        </nav>

        {/* Main Content - Two Column Layout */}
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.08fr)_minmax(360px,420px)]">
          {/* Left Side - Image Gallery */}
          <div className="space-y-3">
            {/* Main Image */}
            <GlassCard className="overflow-hidden p-0 border border-border/60 bg-background/80">
              {images.length > 0 ? (
                <div className="relative aspect-[4/3] max-h-[560px] bg-gradient-to-br from-muted/50 to-muted group xl:aspect-[5/4]">
                  <img
                    src={images[currentImageIndex]}
                    alt={`${product.name} - Image ${currentImageIndex + 1}`}
                    className="w-full h-full object-contain p-4 transition-opacity duration-300 sm:p-6"
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
                        className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white rounded-full p-2.5 opacity-0 group-hover:opacity-100 transition-all backdrop-blur-sm"
                        aria-label={t('products.previousImage')}
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => setCurrentImageIndex((prev) =>
                          prev === images.length - 1 ? 0 : prev + 1
                        )}
                        className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white rounded-full p-2.5 opacity-0 group-hover:opacity-100 transition-all backdrop-blur-sm"
                        aria-label={t('products.nextImage')}
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>

                      {/* Image counter */}
                      <div className="absolute bottom-3 right-3 bg-black/60 text-white px-3 py-1 rounded-full text-xs backdrop-blur-sm">
                        {currentImageIndex + 1} / {images.length}
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="aspect-[4/3] max-h-[560px] bg-gradient-to-br from-muted/50 to-muted flex items-center justify-center xl:aspect-[5/4]">
                  <Package className="w-24 h-24 text-muted-foreground" />
                </div>
              )}
            </GlassCard>

            {/* Thumbnail Strip */}
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={cn(
                      'flex-shrink-0 h-16 w-16 rounded-lg overflow-hidden border-2 transition-all hover:scale-[1.03] sm:h-20 sm:w-20',
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
          <div className="xl:sticky xl:top-24 xl:self-start">
            <GlassCard className="space-y-5 border border-border/60 bg-background/90 p-5 shadow-sm">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="rounded-full px-2.5 py-1 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                        {isAdmin ? t('products.adminPanelTitle') : t('products.buyingPanelTitle')}
                      </Badge>
                      <Badge className={cn('rounded-full border px-3 py-1 text-xs font-semibold shadow-none', stockStatusClass)}>
                        {stockLabel}
                      </Badge>
                    </div>
                    <h1 className="text-2xl font-semibold leading-tight sm:text-3xl">{product.name}</h1>
                    <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">{t('products.sku')}:</span>
                      <span className="font-mono">{product.sku}</span>
                    </div>
                  </div>

                  {!isAdmin && product.sku && (
                    <TooltipProvider>
                      <Tooltip content={inWishlist ? t('products.removeFromWishlist') : t('products.addToWishlist')}>
                        <button
                          onClick={handleWishlistToggle}
                          className={cn(
                            'rounded-full border p-2.5 transition-all duration-200',
                            'hover:scale-105 active:scale-95',
                            inWishlist
                              ? 'border-red-500/20 bg-red-500 text-white shadow-lg hover:bg-red-600'
                              : 'border-border/60 bg-muted/50 text-muted-foreground hover:bg-muted',
                            isPulsing && 'animate-pulse'
                          )}
                          aria-label={inWishlist ? t('products.removeFromWishlist') : t('products.addToWishlist')}
                        >
                          <Heart className={cn('h-5 w-5 transition-all duration-200', inWishlist && 'fill-current')} />
                        </button>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="rounded-full px-3 py-1 text-xs">
                    <Tag className="mr-1.5 h-3.5 w-3.5" />
                    {displayCategory}
                  </Badge>
                  {product.manufacturer && (
                    <Badge variant="outline" className="rounded-full px-3 py-1 text-xs">
                      <Layers3 className="mr-1.5 h-3.5 w-3.5" />
                      {product.manufacturer}
                    </Badge>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-border/50 bg-muted/30 p-4">
                <div className="flex flex-wrap items-end gap-3">
                  <div className="text-3xl font-bold text-primary sm:text-4xl">
                    {formatPrice(displayPrice)}
                  </div>
                  {hasCommissionDiscount && (
                    <Badge
                      variant="secondary"
                      className="gap-1 rounded-full border-emerald-500/20 bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400"
                    >
                      <Percent className="h-3.5 w-3.5" />
                      {t('products.discountBadge', { percent: Math.round(commissionRate * 100) })}
                    </Badge>
                  )}
                </div>
                {hasCommissionDiscount && (
                  <div className="mt-2 text-sm text-muted-foreground line-through">
                    {formatPrice(product.weboffer_price)}
                  </div>
                )}
                {!hasCommissionDiscount &&
                  product.retail_price &&
                  product.retail_price > (product.weboffer_price || 0) && (
                    <div className="mt-2 text-sm text-muted-foreground line-through">
                      {formatPrice(product.retail_price)}
                    </div>
                  )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-border/50 bg-background/70 p-3">
                  <div className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">
                    {t('products.statusLabel')}
                  </div>
                  <div className="text-sm font-semibold text-foreground">{stockLabel}</div>
                </div>
                <div className="rounded-xl border border-border/50 bg-background/70 p-3">
                  <div className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">
                    {t('products.stockQuantityLabel')}
                  </div>
                  <div className="text-sm font-semibold text-foreground">{stockCountLabel}</div>
                </div>
              </div>

              {isAdmin ? (
                <div className="space-y-4 rounded-2xl border border-border/50 bg-background/70 p-4">
                  <div className="flex items-center gap-2">
                    <PackageCheck className="h-4 w-4 text-primary" />
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground">
                      {t('products.adminPanelTitle')}
                    </h2>
                  </div>

                  <div className="space-y-2">
                    {product.manufacturer && (
                      <div className="flex items-start justify-between gap-4 text-sm">
                        <span className="text-muted-foreground">{t('products.manufacturer')}</span>
                        <span className="font-medium text-right">{product.manufacturer}</span>
                      </div>
                    )}
                    {product.model && (
                      <div className="flex items-start justify-between gap-4 text-sm">
                        <span className="text-muted-foreground">{t('products.model')}</span>
                        <span className="font-medium text-right">{product.model}</span>
                      </div>
                    )}
                    {product.moq && (
                      <div className="flex items-start justify-between gap-4 text-sm">
                        <span className="text-muted-foreground">{t('products.moq')}</span>
                        <span className="font-medium text-right">{t('products.minimumOrderQuantityValue', { count: product.moq })}</span>
                      </div>
                    )}
                    {displayUpdatedAt && (
                      <div className="flex items-start justify-between gap-4 text-sm">
                        <span className="text-muted-foreground">{t('products.lastUpdated')}</span>
                        <span className="font-medium text-right">{displayUpdatedAt}</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-4 rounded-2xl border border-primary/10 bg-gradient-to-br from-primary/5 via-background to-background p-4">
                  <div className="flex items-center gap-2">
                    <CircleDollarSign className="h-4 w-4 text-primary" />
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground">
                      {t('products.buyingPanelTitle')}
                    </h2>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <label htmlFor="product-order-quantity" className="text-sm font-medium text-foreground">
                        {t('products.quantityLabel')}
                      </label>
                      <span className="text-xs text-muted-foreground">{stockCountLabel}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-10 w-10 rounded-xl"
                        onClick={() => setSelectedQuantity((prev) => Math.max(1, prev - 1))}
                        disabled={selectedQuantity <= 1 || isOutOfStock}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <Input
                        id="product-order-quantity"
                        type="number"
                        min="1"
                        max={maxOrderQuantity}
                        value={selectedQuantity}
                        onChange={(e) => {
                          const value = parseInt(e.target.value, 10) || 1
                          setSelectedQuantity(Math.max(1, Math.min(value, maxOrderQuantity)))
                        }}
                        className="h-10 rounded-xl text-center text-base font-semibold"
                        disabled={isOutOfStock}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-10 w-10 rounded-xl"
                        onClick={() => setSelectedQuantity((prev) => Math.min(maxOrderQuantity, prev + 1))}
                        disabled={selectedQuantity >= maxOrderQuantity || isOutOfStock}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Button
                      size="lg"
                      className="h-12 w-full justify-center rounded-xl text-base font-semibold"
                      onClick={() => setAddToOrderOpen(true)}
                      disabled={isOutOfStock}
                    >
                      <ShoppingCart className="mr-2 h-4 w-4" />
                      {t('products.addToOrder')}
                    </Button>
                    <Button
                      variant="outline"
                      size="lg"
                      className="h-11 w-full rounded-xl"
                      onClick={handleQuickAdd}
                      disabled={isOutOfStock}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      {t('products.quickAddSelected', { count: selectedQuantity })}
                    </Button>
                  </div>
                </div>
              )}
            </GlassCard>
          </div>
        </div>

        {/* Bottom Section - Full Description & Specs */}
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.95fr)]">
          {/* Full Description */}
          {showDescription && (
            <GlassCard className="border border-border/60 bg-background/80 p-4 sm:p-5">
              <div className="mb-3 flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" />
                <h2 className="text-lg font-semibold">{t('products.description')}</h2>
              </div>
              <div className={cn(!isDescriptionExpanded && isLongDescription && 'max-h-44 overflow-hidden')}>
                <HtmlContent html={product.description!} className="text-sm leading-6" />
              </div>
              {isLongDescription && (
                <div className="mt-3">
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-auto px-0 text-sm font-medium text-primary hover:bg-transparent hover:text-primary/80"
                    onClick={() => setIsDescriptionExpanded((prev) => !prev)}
                  >
                    {isDescriptionExpanded ? t('products.showLess') : t('products.showMore')}
                  </Button>
                </div>
              )}
            </GlassCard>
          )}

          <div className="space-y-4">
            {secondaryDetailRows.length > 0 && (
              <GlassCard className="border border-border/60 bg-background/80 p-4 sm:p-5">
                <div className="mb-3 flex items-center gap-2">
                  <Boxes className="h-4 w-4 text-primary" />
                  <h2 className="text-lg font-semibold">{t('products.detailsSectionTitle')}</h2>
                </div>
                <div className="space-y-1">
                  {secondaryDetailRows.map((row) => (
                    <div
                      key={`${row.label}-${row.value}`}
                      className="flex items-start justify-between gap-4 border-b border-border/40 py-2.5 text-sm last:border-b-0"
                    >
                      <span className="text-muted-foreground">{row.label}</span>
                      <span className="max-w-[58%] text-right font-medium text-foreground">{row.value}</span>
                    </div>
                  ))}
                </div>
              </GlassCard>
            )}

            <GlassCard className="border border-border/60 bg-background/80 p-4 sm:p-5">
              <div className="mb-3 flex items-center gap-2">
                {isAdmin ? (
                  <CalendarDays className="h-4 w-4 text-primary" />
                ) : (
                  <Truck className="h-4 w-4 text-primary" />
                )}
                <h2 className="text-lg font-semibold">
                  {isAdmin ? t('products.catalogInfoSectionTitle') : t('products.orderInfoSectionTitle')}
                </h2>
              </div>
              <div className="space-y-2 text-sm leading-6 text-muted-foreground">
                <p>
                  {isAdmin
                    ? t('products.adminOrderingInformationDescription')
                    : t('products.orderingInformationDescription')}
                </p>
                <p>
                  {isAdmin
                    ? t('products.adminOrderingInformationNote')
                    : t('products.orderingInformationNote')}
                </p>
              </div>
            </GlassCard>
          </div>
        </div>
      </div>

      {/* Add to Order Modal */}
      {!isAdmin && (
        <AddToOrderModal
          product={product}
          initialQuantity={selectedQuantity}
          open={addToOrderOpen}
          onClose={() => setAddToOrderOpen(false)}
        />
      )}
    </>
  )
}
