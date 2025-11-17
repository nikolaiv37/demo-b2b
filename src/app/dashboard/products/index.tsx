import { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'
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
import { Plus, Search, Package, Filter, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

const ITEMS_PER_PAGE = 24

export function ProductsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedManufacturer, setSelectedManufacturer] = useState<string>('all')
  const [selectedAvailability, setSelectedAvailability] = useState<string>('all')
  const [stockFilter, setStockFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false)

  const { user, profile } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const isAdmin = profile?.role === 'admin'

  // Fetch all products
  const { data: products, isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as Product[]
    },
    enabled: true,
  })

  // Extract unique values for filters
  const { categories, manufacturers, availabilityOptions } = useMemo(() => {
    if (!products) return { categories: [], manufacturers: [], availabilityOptions: [] }

    const cats = Array.from(new Set(products.map(p => p.category).filter(Boolean))) as string[]
    const mans = Array.from(new Set(products.map(p => p.manufacturer).filter(Boolean))) as string[]
    const avails = Array.from(new Set(products.map(p => p.availability).filter(Boolean))) as string[]

    return {
      categories: cats.sort(),
      manufacturers: mans.sort(),
      availabilityOptions: avails.sort(),
    }
  }, [products])

  // Filter products
  const filteredProducts = useMemo(() => {
    if (!products) return []

    return products.filter((product) => {
      // Search filter
      const searchLower = searchQuery.toLowerCase()
      const matchesSearch =
        !searchQuery ||
        product.name?.toLowerCase().includes(searchLower) ||
        product.sku?.toLowerCase().includes(searchLower) ||
        product.description?.toLowerCase().includes(searchLower) ||
        product.category?.toLowerCase().includes(searchLower)

      // Category filter
      const matchesCategory =
        selectedCategory === 'all' || product.category === selectedCategory

      // Manufacturer filter
      const matchesManufacturer =
        selectedManufacturer === 'all' || product.manufacturer === selectedManufacturer

      // Availability filter
      const matchesAvailability =
        selectedAvailability === 'all' || product.availability === selectedAvailability

      // Stock filter
      const quantity = product.quantity ?? 0
      const matchesStock =
        stockFilter === 'all' ||
        (stockFilter === 'in-stock' && quantity > 0) ||
        (stockFilter === 'low-stock' && quantity > 0 && quantity <= 10) ||
        (stockFilter === 'out-of-stock' && quantity === 0)

      return (
        matchesSearch &&
        matchesCategory &&
        matchesManufacturer &&
        matchesAvailability &&
        matchesStock
      )
    })
  }, [products, searchQuery, selectedCategory, selectedManufacturer, selectedAvailability, stockFilter])

  // Pagination
  const totalPages = Math.ceil((filteredProducts?.length || 0) / ITEMS_PER_PAGE)
  const paginatedProducts = useMemo(() => {
    if (!filteredProducts) return []
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    const end = start + ITEMS_PER_PAGE
    return filteredProducts.slice(start, end)
  }, [filteredProducts, currentPage])

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

  const handleEdit = (product: Product) => {
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">Products</h1>
          <p className="text-muted-foreground">
            {isLoading ? 'Loading...' : `${filteredProducts?.length || 0} products`}
          </p>
        </div>
        <div className="flex gap-3">
          <Link to="/dashboard/csv-import">
            <Button variant="outline">
              <Package className="w-4 h-4 mr-2" />
              Import CSV
            </Button>
          </Link>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Product
          </Button>
        </div>
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
                  {Math.min(currentPage * ITEMS_PER_PAGE, filteredProducts.length)} of{' '}
                  {filteredProducts.length} products
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
            <Package className="w-20 h-20 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">
              {hasActiveFilters ? 'No products match your filters' : 'No products found'}
            </h3>
            <p className="text-muted-foreground mb-6">
              {hasActiveFilters
                ? 'Try adjusting your search or filters'
                : 'Start by importing products from a CSV file'}
            </p>
            {hasActiveFilters ? (
              <Button variant="outline" onClick={clearFilters}>
                <X className="w-4 h-4 mr-2" />
                Clear All Filters
              </Button>
            ) : (
              <Link to="/dashboard/csv-import">
                <Button>
                  <Package className="w-4 h-4 mr-2" />
                  Import CSV
                </Button>
              </Link>
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
