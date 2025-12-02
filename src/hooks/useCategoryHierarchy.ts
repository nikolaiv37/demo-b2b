import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { Product } from '@/types'

export interface CategoryInfo {
  mainCategory: string
  subcategory: string
  fullCategory: string
  imageUrl: string | null
  productCount: number
}

export interface CategoryHierarchy {
  mainCategories: Map<
    string,
    {
      name: string
      imageUrl: string | null
      subcategories: Map<string, CategoryInfo>
      productCount: number
    }
  >
}

/**
 * Parse category string into main category and subcategory
 * Format: "Main Category > Subcategory" or just "Category"
 */
function parseCategory(category: string | null | undefined): {
  mainCategory: string
  subcategory: string | null
} {
  if (!category) {
    return { mainCategory: 'Uncategorized', subcategory: null }
  }

  const parts = category.split('>').map(p => p.trim())
  if (parts.length > 1) {
    return {
      mainCategory: parts[0],
      subcategory: parts.slice(1).join(' > '), // Handle nested subcategories
    }
  }

  return { mainCategory: category, subcategory: null }
}

/**
 * Hook to fetch and organize category hierarchy from products.
 * Uses normalized categories table via products.category_id when available,
 * with a graceful fallback to legacy text-based products.category.
 */
export function useCategoryHierarchy(companyId?: string) {
  return useQuery({
    queryKey: ['category-hierarchy', companyId],
    queryFn: async (): Promise<CategoryHierarchy> => {
      console.log('[useCategoryHierarchy] fetching category hierarchy', {
        companyId,
        at: new Date().toISOString(),
      })

      // First, fetch all categories with their image_urls to create a lookup map
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('id, name, parent_id, image_url')

      if (categoriesError) {
        console.error('useCategoryHierarchy categories query error:', categoriesError)
        // Continue anyway - we can still build hierarchy from products
      }

      // Create maps for category images:
      // - main category name -> image_url
      // - full subcategory path \"Main > Sub\" -> image_url
      const categoryImageMap = new Map<string, string | null>()
      const subcategoryImageMap = new Map<string, string | null>()
      if (categoriesData) {
        const categoryById = new Map<string, { id: string; name: string; parent_id: string | null; image_url: string | null }>()
        categoriesData.forEach((cat) => {
          categoryById.set(cat.id, cat)
        })

        categoriesData.forEach((cat) => {
          if (!cat.parent_id) {
            // Main category
            categoryImageMap.set(cat.name, cat.image_url)
          } else {
            // Subcategory: build full path \"Parent > Child\"
            const parent = categoryById.get(cat.parent_id)
            if (parent) {
              const fullName = `${parent.name} > ${cat.name}`
              subcategoryImageMap.set(fullName, cat.image_url)
            }
          }
        })
      }

      // Fetch all visible products with their linked category (if any)
      // Note: Supabase/PostgREST defaults to a 1,000 row limit; use an explicit range
      // to ensure product counts reflect the full dataset.
      const { data, error } = await supabase
        .from('products')
        .select(
          `
          category,
          category_id,
          main_image,
          images,
          quantity,
          categories (
            id,
            name,
            parent_id,
            image_url
          )
        `
        )
        .eq('is_visible', true)
        .range(0, 9999)

      if (error) {
        console.error('useCategoryHierarchy query error:', error)
        throw error
      }

      const products = (data || []) as unknown as (Pick<
        Product,
        'category' | 'main_image' | 'images' | 'quantity'
      > & {
        category_id?: string | null
        categories?: {
          id: string
          name: string
          parent_id: string | null
          image_url: string | null
        } | null
      })[]

      // Build hierarchy
      const mainCategories = new Map<
        string,
        {
          name: string
          imageUrl: string | null
          subcategories: Map<string, CategoryInfo>
          productCount: number
        }
      >()

      // Helper function to score image quality (prefer white/transparent backgrounds)
      const scoreImage = (imageUrl: string | null, isMainImage: boolean, imageCount: number): number => {
        if (!imageUrl) return 0
        
        let score = 0
        
        // Prefer main_image (usually product photos on white background)
        if (isMainImage) score += 10
        
        // Prefer products with more images (often means professional product photos)
        score += Math.min(imageCount, 5)
        
        // Prefer image URLs that might indicate product photos (common patterns)
        const urlLower = imageUrl.toLowerCase()
        if (urlLower.includes('product') || urlLower.includes('catalog') || urlLower.includes('wp/lj')) {
          score += 3
        }
        
        // Prefer .webp or .jpg (often better quality product photos)
        if (urlLower.includes('.webp') || urlLower.includes('.jpg') || urlLower.includes('.jpeg')) {
          score += 2
        }
        
        return score
      }

      // Process each product
      products.forEach((product) => {
        const linkedCategory = product.categories

        let mainCategory: string
        let subcategory: string | null
        let fullCategory: string

        if (linkedCategory) {
          const hasTextCategory =
            typeof product.category === 'string' &&
            product.category.trim().length > 0

          if (hasTextCategory) {
            // Prefer the updated legacy text-based category string when present
            const parsed = parseCategory(product.category)
            mainCategory = parsed.mainCategory
            subcategory = parsed.subcategory
            fullCategory = product.category as string

            console.log('[useCategoryHierarchy] Processing product', {
              linkedCategoryName: linkedCategory?.name,
              productCategoryText: product.category,
              willUse: 'product.category',
            })
          } else {
            // Fall back to normalized category name when no text category is present
            if (!linkedCategory.parent_id) {
              mainCategory = linkedCategory.name
              subcategory = null
              fullCategory = linkedCategory.name
            } else {
              const legacy = linkedCategory.name
              const parsed = parseCategory(legacy)
              mainCategory = parsed.mainCategory
              subcategory = parsed.subcategory
              fullCategory = legacy
            }

            console.log('[useCategoryHierarchy] Processing product', {
              linkedCategoryName: linkedCategory?.name,
              productCategoryText: product.category,
              willUse: 'linkedCategory.name',
            })
          }
        } else {
          // Fallback entirely to legacy text-based category
          const parsed = parseCategory(product.category)
          mainCategory = parsed.mainCategory
          subcategory = parsed.subcategory
          fullCategory = product.category || 'Uncategorized'

          console.log('[useCategoryHierarchy] Processing product', {
            linkedCategoryName: null,
            productCategoryText: product.category,
            willUse: 'product.category (no linkedCategory)',
          })
        }
        
        // Prioritize main_image (usually product photos on white background)
        const mainImageUrl = product.main_image || null
        const firstImageUrl = product.images?.[0] || null
        const imageUrl = mainImageUrl || firstImageUrl
        const imageCount = product.images?.length || 0
        const isMainImage = !!mainImageUrl

        // Get or create main category
        if (!mainCategories.has(mainCategory)) {
          // Check if this category has an image_url from the categories table
          const categoryImageUrl = categoryImageMap.get(mainCategory) || null
          
          mainCategories.set(mainCategory, {
            name: mainCategory,
            imageUrl: categoryImageUrl, // Use category image_url if available
            subcategories: new Map(),
            productCount: 0,
          })
        }

        const mainCat = mainCategories.get(mainCategory)!
        mainCat.productCount++

        // Set main category image - prefer category image_url, then product images
        // Only use product images if category doesn't have an image_url set
        if (!mainCat.imageUrl && imageUrl) {
          const currentScore = mainCat.imageUrl ? scoreImage(mainCat.imageUrl, false, 0) : 0
          const newScore = scoreImage(imageUrl, isMainImage, imageCount)
          
          if (!mainCat.imageUrl || newScore > currentScore) {
            mainCat.imageUrl = imageUrl
          }
        }

        // Handle subcategories
        if (subcategory) {
          if (!mainCat.subcategories.has(subcategory)) {
            // Prefer subcategory image from categories table (full path \"Main > Sub\")
            const subcategoryImageUrl = subcategoryImageMap.get(fullCategory) || null

            mainCat.subcategories.set(subcategory, {
              mainCategory,
              subcategory,
              fullCategory,
              imageUrl: subcategoryImageUrl,
              productCount: 0,
            })
          }

          const subCat = mainCat.subcategories.get(subcategory)!
          subCat.productCount++

          // Set subcategory image - prefer category image_url, then product images
          // Only use product images if subcategory doesn't have an image_url set
          if (!subCat.imageUrl && imageUrl) {
            const currentScore = subCat.imageUrl ? scoreImage(subCat.imageUrl, false, 0) : 0
            const newScore = scoreImage(imageUrl, isMainImage, imageCount)
            
            if (!subCat.imageUrl || newScore > currentScore) {
              subCat.imageUrl = imageUrl
            }
          }
        } else {
          // If no subcategory, create a default one
          if (!mainCat.subcategories.has('All')) {
            mainCat.subcategories.set('All', {
              mainCategory,
              subcategory: 'All',
              fullCategory,
              imageUrl: null,
              productCount: 0,
            })
          }

          const defaultSub = mainCat.subcategories.get('All')!
          defaultSub.productCount++

          // Set default subcategory image - prefer images with white/transparent backgrounds
          if (imageUrl) {
            const currentScore = defaultSub.imageUrl ? scoreImage(defaultSub.imageUrl, false, 0) : 0
            const newScore = scoreImage(imageUrl, isMainImage, imageCount)
            
            if (!defaultSub.imageUrl || newScore > currentScore) {
              defaultSub.imageUrl = imageUrl
            }
          }
        }
      })

      // Recalculate main category product counts using exact Supabase counts
      // to avoid the 1,000-row limit affecting totals.
      const mainCategoryValues = Array.from(mainCategories.values())
      await Promise.all(
        mainCategoryValues.map(async (mainCat) => {
          const { count, error } = await supabase
            .from('products')
            .select('*', { count: 'exact', head: true })
            .eq('is_visible', true)
            .ilike('category', `${mainCat.name}%`)

          if (!error && typeof count === 'number') {
            mainCat.productCount = count
          }
        })
      )

      // Sort main categories by product count (descending)
      const sortedMainCategories = new Map(
        Array.from(mainCategories.entries()).sort((a, b) => b[1].productCount - a[1].productCount)
      )

      // Sort subcategories within each main category
      sortedMainCategories.forEach((mainCat) => {
        const sortedSubs = new Map(
          Array.from(mainCat.subcategories.entries()).sort((a, b) => b[1].productCount - a[1].productCount)
        )
        mainCat.subcategories = sortedSubs
      })

      return { mainCategories: sortedMainCategories }
    },
    staleTime: 0, // Always refetch on mount to ensure real-time sync with category renames
  })
}

