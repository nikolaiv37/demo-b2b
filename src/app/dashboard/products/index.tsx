import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { GlassCard } from '@/components/GlassCard'
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
import { Search, X, ChevronLeft, ChevronRight } from 'lucide-react'

const ITEMS_PER_PAGE = 24
const INITIAL_LOAD_SIZE = 150 // Load 150 products initially for fast render

export function ProductsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedManufacturer, setSelectedManufacturer] = useState<string>('all')
  const [selectedAvailability, setSelectedAvailability] = useState<string>('all')
  const [stockFilter, setStockFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false)

  const { profile } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const isAdmin = profile?.role === 'admin'

  // Build base query with filters (for both count and data queries)
  const buildBaseQuery = () => {
    let query = supabase.from('products').select('*', { count: 'exact' })

    // Search filter (server-side)
    if (searchQuery) {
      query = query.or(
        `name.ilike.%${searchQuery}%,sku.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,category.ilike.%${searchQuery}%`
      )
    }

    // Category filter
    if (selectedCategory !== 'all') {
      query = query.eq('category', selectedCategory)
    }

    // Manufacturer filter
    if (selectedManufacturer !== 'all') {
      query = query.eq('manufacturer', selectedManufacturer)
    }

    // Availability filter
    if (selectedAvailability !== 'all') {
      query = query.eq('availability', selectedAvailability)
    }

    // Stock filter
    if (stockFilter === 'in-stock') {
      query = query.gt('quantity', 0)
    } else if (stockFilter === 'low-stock') {
      query = query.gt('quantity', 0).lte('quantity', 10)
    } else if (stockFilter === 'out-of-stock') {
      query = query.eq('quantity', 0)
    }

    return query.order('created_at', { ascending: false })
  }

  // Calculate pagination range
  const getPaginationRange = () => {
    // For initial load (page 1), load INITIAL_LOAD_SIZE products for fast subsequent pages
    if (currentPage === 1) {
      return { from: 0, to: INITIAL_LOAD_SIZE - 1 }
    }
    // For subsequent pages, calculate the range
    const pagesFromInitialLoad = Math.ceil(INITIAL_LOAD_SIZE / ITEMS_PER_PAGE)
    if (currentPage <= pagesFromInitialLoad) {
      // For pages 2-7, we can use cached data from page 1, but also fetch to be safe
      // Actually, let's just use the cache - no need to fetch again
      return null // Signal to use cache
    }
    // For pages beyond initial load, fetch the specific range
    const from = INITIAL_LOAD_SIZE + (currentPage - pagesFromInitialLoad - 1) * ITEMS_PER_PAGE
    const to = from + ITEMS_PER_PAGE - 1
    return { from, to }
  }

  // Fetch paginated products with server-side filters
  const range = getPaginationRange()
  const { data: products, isLoading } = useQuery({
    queryKey: [
      'products',
      'paginated',
      searchQuery,
      selectedCategory,
      selectedManufacturer,
      selectedAvailability,
      stockFilter,
      currentPage,
    ],
    queryFn: async () => {
      if (!range) {
        // For pages 2-7, return empty - we'll use cached page 1 data
        return []
      }
      const query = buildBaseQuery().range(range.from, range.to)

      const { data, error } = await query

      if (error) throw error
      return data as Product[]
    },
    enabled: true,
    placeholderData: (previousData) => previousData, // Keep previous data while loading
  })

  // Get cached data from page 1 query for pages 2-7
  const cachedPage1Data = queryClient.getQueryData<Product[]>([
    'products',
    'paginated',
    searchQuery,
    selectedCategory,
    selectedManufacturer,
    selectedAvailability,
    stockFilter,
    1,
  ])

  // Fetch total count with same filters
  const { data: totalCount } = useQuery({
    queryKey: [
      'products',
      'count',
      searchQuery,
      selectedCategory,
      selectedManufacturer,
      selectedAvailability,
      stockFilter,
    ],
    queryFn: async () => {
      // Build count query - use head: true to get only count
      let countQuery = supabase.from('products').select('*', { count: 'exact', head: true })

      // Apply same filters as data query
      if (searchQuery) {
        countQuery = countQuery.or(
          `name.ilike.%${searchQuery}%,sku.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,category.ilike.%${searchQuery}%`
        )
      }
      if (selectedCategory !== 'all') {
        countQuery = countQuery.eq('category', selectedCategory)
      }
      if (selectedManufacturer !== 'all') {
        countQuery = countQuery.eq('manufacturer', selectedManufacturer)
      }
      if (selectedAvailability !== 'all') {
        countQuery = countQuery.eq('availability', selectedAvailability)
      }
      if (stockFilter === 'in-stock') {
        countQuery = countQuery.gt('quantity', 0)
      } else if (stockFilter === 'low-stock') {
        countQuery = countQuery.gt('quantity', 0).lte('quantity', 10)
      } else if (stockFilter === 'out-of-stock') {
        countQuery = countQuery.eq('quantity', 0)
      }

      const { count, error } = await countQuery

      if (error) throw error
      return count ?? 0
    },
    enabled: true,
  })

  // Fetch filter options (categories, manufacturers, availability) - cached separately
  const { data: filterOptions } = useQuery({
    queryKey: ['products', 'filter-options'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('category, manufacturer, availability')
        .limit(10000) // Get enough to extract unique values

      if (error) throw error

      const categories = Array.from(
        new Set(data.map((p) => p.category).filter(Boolean))
      ).sort() as string[]
      const manufacturers = Array.from(
        new Set(data.map((p) => p.manufacturer).filter(Boolean))
      ).sort() as string[]
      const availabilityOptions = Array.from(
        new Set(data.map((p) => p.availability).filter(Boolean))
      ).sort() as string[]

      return { categories, manufacturers, availabilityOptions }
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  })

  const { categories = [], manufacturers = [], availabilityOptions = [] } = filterOptions || {}

  // Calculate paginated products for display
  const paginatedProducts = useMemo(() => {
    // For pages 2-7, use cached data from page 1 if available
    const pagesFromInitialLoad = Math.ceil(INITIAL_LOAD_SIZE / ITEMS_PER_PAGE)
    if (currentPage > 1 && currentPage <= pagesFromInitialLoad && cachedPage1Data) {
      const start = (currentPage - 1) * ITEMS_PER_PAGE
      const end = start + ITEMS_PER_PAGE
      return cachedPage1Data.slice(start, end)
    }

    // For page 1, show first ITEMS_PER_PAGE from the initial load
    if (currentPage === 1 && products) {
      return products.slice(0, ITEMS_PER_PAGE)
    }
    
    // For later pages, use the fetched products directly
    if (products) {
      return products
    }
    
    return []
  }, [products, currentPage, cachedPage1Data])

  // Calculate total pages based on total count
  const totalPages = Math.ceil((totalCount || 0) / ITEMS_PER_PAGE)

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, selectedCategory, selectedManufacturer, selectedAvailability, stockFilter])

  const deleteMutation = useMutation({
    mutationFn: async (productId: string | number) => {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['products', 'count'] })
      queryClient.invalidateQueries({ queryKey: ['products', 'filter-options'] })
      toast({
        title: 'Product deleted',
        description: 'The product has been removed successfully.',
      })
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to delete product.',
        variant: 'destructive',
      })
    },
  })

  const handleQuickView = (product: Product) => {
    setSelectedProduct(product)
    setIsQuickViewOpen(true)
  }

  const handleEdit = (_product: Product) => {
    // TODO: Implement edit functionality
    toast({
      title: 'Edit Product',
      description: 'Edit functionality coming soon.',
    })
  }

  const handleDelete = (product: Product) => {
    if (confirm(`Are you sure you want to delete "${product.name}"?`)) {
      deleteMutation.mutate(product.id)
    }
  }

  const clearFilters = () => {
    setSearchQuery('')
    setSelectedCategory('all')
    setSelectedManufacturer('all')
    setSelectedAvailability('all')
    setStockFilter('all')
    setCurrentPage(1)
  }

  const hasActiveFilters =
    searchQuery ||
    selectedCategory !== 'all' ||
    selectedManufacturer !== 'all' ||
    selectedAvailability !== 'all' ||
    stockFilter !== 'all'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">All Products</h1>
        <p className="text-muted-foreground">
          {isLoading && !totalCount ? 'Loading...' : `${totalCount ?? 0} products`}
        </p>
      </div>

      {/* Search and Filters */}
      <GlassCard>
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search products by name, SKU, description, or category..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setCurrentPage(1)
              }}
              className="pl-10"
            />
          </div>

          {/* Filters */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
            <Select
              value={selectedCategory}
              onValueChange={(value) => {
                setSelectedCategory(value)
                setCurrentPage(1)
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={selectedManufacturer}
              onValueChange={(value) => {
                setSelectedManufacturer(value)
                setCurrentPage(1)
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Manufacturer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Manufacturers</SelectItem>
                {manufacturers.map((man) => (
                  <SelectItem key={man} value={man}>
                    {man}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={selectedAvailability}
              onValueChange={(value) => {
                setSelectedAvailability(value)
                setCurrentPage(1)
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Availability" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Availability</SelectItem>
                {availabilityOptions.map((avail) => (
                  <SelectItem key={avail} value={avail}>
                    {avail}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={stockFilter}
              onValueChange={(value) => {
                setStockFilter(value)
                setCurrentPage(1)
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Stock Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stock</SelectItem>
                <SelectItem value="in-stock">In Stock</SelectItem>
                <SelectItem value="low-stock">Low Stock (1-10)</SelectItem>
                <SelectItem value="out-of-stock">Out of Stock</SelectItem>
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button
                variant="outline"
                onClick={clearFilters}
                className="w-full"
              >
                <X className="w-4 h-4 mr-2" />
                Clear Filters
              </Button>
            )}
          </div>

          {/* Active Filters Display */}
          {hasActiveFilters && (
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-sm text-muted-foreground">Active filters:</span>
              {searchQuery && (
                <Badge variant="secondary" className="gap-1">
                  Search: {searchQuery}
                  <button
                    onClick={() => setSearchQuery('')}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              )}
              {selectedCategory !== 'all' && (
                <Badge variant="secondary" className="gap-1">
                  Category: {selectedCategory}
                  <button
                    onClick={() => setSelectedCategory('all')}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              )}
              {selectedManufacturer !== 'all' && (
                <Badge variant="secondary" className="gap-1">
                  Manufacturer: {selectedManufacturer}
                  <button
                    onClick={() => setSelectedManufacturer('all')}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              )}
              {selectedAvailability !== 'all' && (
                <Badge variant="secondary" className="gap-1">
                  {selectedAvailability}
                  <button
                    onClick={() => setSelectedAvailability('all')}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              )}
              {stockFilter !== 'all' && (
                <Badge variant="secondary" className="gap-1">
                  Stock: {stockFilter.replace('-', ' ')}
                  <button
                    onClick={() => setStockFilter('all')}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              )}
            </div>
          )}
        </div>
      </GlassCard>

      {/* Products Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <GlassCard key={i} className="overflow-hidden">
              <Skeleton className="aspect-square w-full" />
              <div className="p-4 space-y-3">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-full" />
              </div>
            </GlassCard>
          ))}
        </div>
      ) : paginatedProducts && paginatedProducts.length > 0 ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {paginatedProducts.map((product) => (
              <ProductGridCard
                key={product.id}
                product={product}
                onQuickView={handleQuickView}
                onEdit={isAdmin ? handleEdit : undefined}
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
                  Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{' '}
                  {Math.min(currentPage * ITEMS_PER_PAGE, totalCount || 0)} of{' '}
                  {totalCount || 0} products
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum: number
                      if (totalPages <= 5) {
                        pageNum = i + 1
                      } else if (currentPage <= 3) {
                        pageNum = i + 1
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i
                      } else {
                        pageNum = currentPage - 2 + i
                      }
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setCurrentPage(pageNum)}
                          className="w-10"
                        >
                          {pageNum}
                        </Button>
                      )
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
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
            <div className="w-20 h-20 mx-auto mb-4 text-muted-foreground flex items-center justify-center">
              <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">
              {hasActiveFilters ? 'No products match your filters' : 'No products found'}
            </h3>
            <p className="text-muted-foreground mb-6">
              {hasActiveFilters
                ? 'Try adjusting your search or filters'
                : 'No products available at the moment'}
            </p>
            {hasActiveFilters && (
              <Button variant="outline" onClick={clearFilters}>
                <X className="w-4 h-4 mr-2" />
                Clear All Filters
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
