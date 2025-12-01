import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { useCategoryHierarchy } from '@/hooks/useCategoryHierarchy'
import { GlassCard } from '@/components/GlassCard'
import { CategoryGrid, categoryToSlug } from '@/components/CategoryGrid'
import { CategoryBreadcrumbs } from '@/components/CategoryBreadcrumbs'
import { SubcategoryBubbles } from '@/components/SubcategoryBubbles'
import { ProductGridCard } from '@/components/ProductGridCard'
import { ProductQuickViewModal } from '@/components/ProductQuickViewModal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/use-toast'
import { useAuth } from '@/hooks/useAuth'
import { Product } from '@/types'
import { Search, X, ChevronLeft, ChevronRight, Grid3X3, Package } from 'lucide-react'

const ITEMS_PER_PAGE = 24

export function CategoriesPage() {
  const { t } = useTranslation()
  const { mainCategory, subCategory } = useParams<{ mainCategory?: string; subCategory?: string }>()
  const navigate = useNavigate()

  // Decode URL parameters
  const decodedMainCategory = mainCategory ? decodeURIComponent(mainCategory) : null
  const decodedSubCategory = subCategory ? decodeURIComponent(subCategory) : null

  // State for product filtering (when viewing products)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedManufacturer, setSelectedManufacturer] = useState<string>('all')
  const [stockFilter, setStockFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false)

  const { profile } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const isAdmin = profile?.role === 'admin'

  // Fetch category hierarchy
  const { data: categoryHierarchy, isLoading: categoriesLoading } = useCategoryHierarchy()

  // Transform main categories for grid
  const mainCategories = useMemo(() => {
    if (!categoryHierarchy?.mainCategories) return []
    return Array.from(categoryHierarchy.mainCategories.entries()).map(([name, data]) => ({
      name,
      slug: categoryToSlug(name),
      imageUrl: data.imageUrl,
      productCount: data.productCount,
    }))
  }, [categoryHierarchy])

  // Get selected main category data
  const selectedMainCategoryData = useMemo(() => {
    if (!decodedMainCategory || !categoryHierarchy?.mainCategories) return null
    // Find by exact match or slug match
    for (const [categoryName, data] of categoryHierarchy.mainCategories.entries()) {
      if (categoryName === decodedMainCategory || categoryName.toLowerCase().replace(/\s+/g, '-') === decodedMainCategory.toLowerCase()) {
        return { ...data, name: categoryName }
      }
    }
    return null
  }, [decodedMainCategory, categoryHierarchy])

  // Get subcategories for selected main category
  const subcategories = useMemo(() => {
    if (!selectedMainCategoryData) return []
    return Array.from(selectedMainCategoryData.subcategories.entries()).map(([name, data]) => ({
      name,
      fullCategory: data.fullCategory,
      imageUrl: data.imageUrl,
      productCount: data.productCount,
    }))
  }, [selectedMainCategoryData])

  // Get selected subcategory data
  const selectedSubcategoryData = useMemo(() => {
    if (!decodedSubCategory || !selectedMainCategoryData) return null
    for (const [subCatName, data] of selectedMainCategoryData.subcategories.entries()) {
      if (subCatName === decodedSubCategory || subCatName.toLowerCase().replace(/\s+/g, '-') === decodedSubCategory.toLowerCase()) {
        return { ...data, name: subCatName }
      }
    }
    return null
  }, [decodedSubCategory, selectedMainCategoryData])

  // Determine the current view level
  const viewLevel = useMemo(() => {
    if (decodedSubCategory && selectedSubcategoryData) return 'products'
    if (decodedMainCategory && selectedMainCategoryData) return 'subcategories'
    return 'main'
  }, [decodedMainCategory, decodedSubCategory, selectedMainCategoryData, selectedSubcategoryData])

  // Build category filter for product query
  const categoryFilter = useMemo(() => {
    if (viewLevel === 'products' && selectedSubcategoryData) {
      return selectedSubcategoryData.fullCategory
    }
    if (viewLevel === 'subcategories' && selectedMainCategoryData) {
      return selectedMainCategoryData.name
    }
    return null
  }, [viewLevel, selectedMainCategoryData, selectedSubcategoryData])

  // Fetch products when viewing product level
  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: [
      'category-products',
      categoryFilter,
      searchQuery,
      selectedManufacturer,
      stockFilter,
      currentPage,
    ],
    queryFn: async () => {
      if (!categoryFilter) return { products: [], count: 0 }

      let query = supabase.from('products').select('*', { count: 'exact' })

      // Category filter
      if (viewLevel === 'products') {
        query = query.eq('category', categoryFilter)
      } else {
        query = query.ilike('category', `${categoryFilter}%`)
      }

      // Search filter
      if (searchQuery) {
        query = query.or(
          `name.ilike.%${searchQuery}%,sku.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`
        )
      }

      // Manufacturer filter
      if (selectedManufacturer !== 'all') {
        query = query.eq('manufacturer', selectedManufacturer)
      }

      // Stock filter
      if (stockFilter === 'in-stock') {
        query = query.gt('quantity', 0)
      } else if (stockFilter === 'low-stock') {
        query = query.gt('quantity', 0).lte('quantity', 10)
      } else if (stockFilter === 'out-of-stock') {
        query = query.eq('quantity', 0)
      }

      // Pagination
      const from = (currentPage - 1) * ITEMS_PER_PAGE
      const to = from + ITEMS_PER_PAGE - 1

      const { data, count, error } = await query
        .order('created_at', { ascending: false })
        .range(from, to)

      if (error) throw error
      return { products: data as Product[], count: count || 0 }
    },
    enabled: viewLevel === 'products' || viewLevel === 'subcategories',
  })

  // Fetch manufacturers for filter
  const { data: manufacturers = [] } = useQuery({
    queryKey: ['category-manufacturers', categoryFilter],
    queryFn: async () => {
      if (!categoryFilter) return []
      
      let query = supabase.from('products').select('manufacturer')
      
      if (viewLevel === 'products') {
        query = query.eq('category', categoryFilter)
      } else {
        query = query.ilike('category', `${categoryFilter}%`)
      }

      const { data, error } = await query
      if (error) throw error
      
      const uniqueManufacturers = Array.from(
        new Set(data.map((p) => p.manufacturer).filter(Boolean))
      ).sort() as string[]
      
      return uniqueManufacturers
    },
    enabled: viewLevel === 'products',
  })

  const products = productsData?.products || []
  const totalCount = productsData?.count || 0
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE)

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (productId: string | number) => {
      const { error } = await supabase.from('products').delete().eq('id', productId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['category-products'] })
      toast({ title: t('products.productDeleted'), description: t('products.productRemoved') })
    },
    onError: () => {
      toast({ title: t('products.error'), description: t('products.failedToDelete'), variant: 'destructive' })
    },
  })

  // Handlers
  const handleQuickView = (product: Product) => {
    setSelectedProduct(product)
    setIsQuickViewOpen(true)
  }

  const handleDelete = (product: Product) => {
    if (confirm(t('products.deleteConfirm', { name: product.name }))) {
      deleteMutation.mutate(product.id)
    }
  }

  const clearFilters = () => {
    setSearchQuery('')
    setSelectedManufacturer('all')
    setStockFilter('all')
    setCurrentPage(1)
  }

  const hasActiveFilters = searchQuery || selectedManufacturer !== 'all' || stockFilter !== 'all'

  // Build breadcrumbs
  const breadcrumbs = useMemo(() => {
    const items: { label: string; href?: string }[] = []
    
    if (selectedMainCategoryData) {
      if (selectedSubcategoryData) {
        items.push({
          label: selectedMainCategoryData.name,
          href: `/dashboard/categories/${encodeURIComponent(selectedMainCategoryData.name)}`,
        })
        items.push({ label: selectedSubcategoryData.name })
      } else {
        items.push({ label: selectedMainCategoryData.name })
      }
    }
    
    return items
  }, [selectedMainCategoryData, selectedSubcategoryData])

  // Render main categories view
  if (viewLevel === 'main') {
    return (
      <div className="space-y-6 pb-24 md:pb-8">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Grid3X3 className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-3xl font-bold">{t('categories.browseCategories')}</h1>
          </div>
          <p className="text-muted-foreground">
            {categoriesLoading ? t('general.loading') : t('categories.categoriesWithProducts', { count: mainCategories.length, total: mainCategories.reduce((sum, c) => sum + c.productCount, 0) })}
          </p>
        </div>

        {/* Main Categories Grid */}
        <CategoryGrid
          categories={mainCategories}
          isLoading={categoriesLoading}
          basePath="/dashboard/categories"
        />
      </div>
    )
  }

  // Render subcategories view
  if (viewLevel === 'subcategories' && selectedMainCategoryData) {
    return (
      <div className="space-y-6 pb-24 md:pb-8">
        {/* Breadcrumbs */}
        <CategoryBreadcrumbs items={breadcrumbs} />

        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold mb-2">{selectedMainCategoryData.name}</h1>
          <p className="text-muted-foreground">
            {t('categories.productsInSubcategories', { count: selectedMainCategoryData.productCount, subcount: subcategories.length })}
          </p>
        </div>

        {/* Subcategory Cards */}
        <SubcategoryBubbles
          subcategories={subcategories}
          selectedSubcategory={null}
          onSubcategorySelect={(fullCategory) => {
            if (fullCategory) {
              // Extract subcategory name from full category
              const parts = fullCategory.split(' > ')
              const subName = parts.length > 1 ? parts.slice(1).join(' > ') : parts[0]
              navigate(`/dashboard/categories/${encodeURIComponent(selectedMainCategoryData.name)}/${encodeURIComponent(subName)}`)
            }
          }}
          mainCategoryName={selectedMainCategoryData.name}
        />
      </div>
    )
  }

  // Render products view (subcategory selected)
  if (viewLevel === 'products' && selectedSubcategoryData) {
    return (
      <div className="space-y-6 pb-24 md:pb-8">
        {/* Breadcrumbs */}
        <CategoryBreadcrumbs items={breadcrumbs} />

        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold mb-2">{selectedSubcategoryData.name}</h1>
          <p className="text-muted-foreground">
            {t('categories.products', { count: totalCount })}
          </p>
        </div>

        {/* Filters */}
        <GlassCard>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder={t('categories.searchProducts')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              {manufacturers.length > 0 && (
                <Select value={selectedManufacturer} onValueChange={setSelectedManufacturer}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder={t('products.manufacturer')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('products.allManufacturers')}</SelectItem>
                    {manufacturers.map((man) => (
                      <SelectItem key={man} value={man}>{man}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Select value={stockFilter} onValueChange={setStockFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder={t('categories.stock')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('products.allStock')}</SelectItem>
                  <SelectItem value="in-stock">{t('products.inStock')}</SelectItem>
                  <SelectItem value="low-stock">{t('products.lowStock')}</SelectItem>
                  <SelectItem value="out-of-stock">{t('products.outOfStock')}</SelectItem>
                </SelectContent>
              </Select>
              {hasActiveFilters && (
                <Button variant="outline" onClick={clearFilters}>
                  <X className="w-4 h-4 mr-2" />
                  {t('categories.clear')}
                </Button>
              )}
            </div>

            {/* Active filters */}
            {hasActiveFilters && (
              <div className="flex flex-wrap gap-2 items-center pt-2 border-t">
                <span className="text-sm text-muted-foreground">{t('categories.active')}:</span>
                {searchQuery && (
                  <Badge variant="secondary" className="gap-1">
                    {t('products.search')}: {searchQuery}
                    <button onClick={() => setSearchQuery('')} className="ml-1 hover:text-destructive">
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                )}
                {selectedManufacturer !== 'all' && (
                  <Badge variant="secondary" className="gap-1">
                    {selectedManufacturer}
                    <button onClick={() => setSelectedManufacturer('all')} className="ml-1 hover:text-destructive">
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                )}
                {stockFilter !== 'all' && (
                  <Badge variant="secondary" className="gap-1">
                    {stockFilter.replace('-', ' ')}
                    <button onClick={() => setStockFilter('all')} className="ml-1 hover:text-destructive">
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                )}
              </div>
            )}
          </div>
        </GlassCard>

        {/* Products Grid */}
        {productsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <GlassCard key={i} className="overflow-hidden">
                <Skeleton className="aspect-square w-full" />
                <div className="p-4 space-y-3">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              </GlassCard>
            ))}
          </div>
        ) : products.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map((product) => (
                <ProductGridCard
                  key={product.id}
                  product={product}
                  onQuickView={handleQuickView}
                  onDelete={isAdmin ? handleDelete : undefined}
                  isAdmin={isAdmin}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <GlassCard>
                <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  {t('products.showing')} {(currentPage - 1) * ITEMS_PER_PAGE + 1} {t('products.to')}{' '}
                  {Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} {t('products.of')} {totalCount} {t('products.products')}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    {t('products.previous')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    {t('products.next')}
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
                </div>
              </GlassCard>
            )}
          </>
        ) : (
          <GlassCard>
            <div className="text-center py-16">
              <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-lg font-semibold mb-2">{t('categories.noProductsFound')}</h3>
              <p className="text-muted-foreground mb-4">
                {hasActiveFilters ? t('categories.tryAdjustingFilters') : t('categories.noProductsInCategory')}
              </p>
              {hasActiveFilters && (
                <Button variant="outline" onClick={clearFilters}>
                  <X className="w-4 h-4 mr-2" />
                  {t('products.clearFilters')}
                </Button>
              )}
            </div>
          </GlassCard>
        )}

        {/* Quick View Modal */}
        <ProductQuickViewModal
          product={selectedProduct}
          open={isQuickViewOpen}
          onClose={() => {
            setIsQuickViewOpen(false)
            setSelectedProduct(null)
          }}
        />
      </div>
    )
  }

  // Fallback - category not found
  return (
    <div className="space-y-6 pb-24 md:pb-8">
      <CategoryBreadcrumbs items={[]} />
      <GlassCard>
        <div className="text-center py-16">
          <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
          <h3 className="text-lg font-semibold mb-2">{t('categories.categoryNotFound')}</h3>
          <p className="text-muted-foreground mb-4">
            {t('categories.categoryDoesNotExist')}
          </p>
          <Button onClick={() => navigate('/dashboard/categories')}>
            {t('categories.browseAllCategories')}
          </Button>
        </div>
      </GlassCard>
    </div>
  )
}

