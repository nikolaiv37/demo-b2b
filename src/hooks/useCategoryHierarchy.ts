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
  mainCategories: Map<string, {
    name: string
    imageUrl: string | null
    subcategories: Map<string, CategoryInfo>
    productCount: number
  }>
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
 * Hook to fetch and organize category hierarchy from products
 */
export function useCategoryHierarchy(companyId?: string) {
  return useQuery({
    queryKey: ['category-hierarchy', companyId],
    queryFn: async (): Promise<CategoryHierarchy> => {
      // First, get total count to know how many products we need to fetch
      let countQuery = supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .not('category', 'is', null)
        .neq('category', '')

      if (companyId) {
        countQuery = countQuery.or(`supplier_id.eq.${companyId},company_id.eq.${companyId}`)
      }

      const { count: totalCount, error: countError } = await countQuery

      if (countError) {
        console.error('useCategoryHierarchy count error:', countError)
        throw countError
      }

      const total = totalCount || 0
      console.log('useCategoryHierarchy: Total products to fetch:', total)

      // Fetch all products in batches (Supabase default limit is 1000)
      const BATCH_SIZE = 1000
      const allProducts: Pick<Product, 'category' | 'main_image' | 'images' | 'quantity'>[] = []

      for (let offset = 0; offset < total; offset += BATCH_SIZE) {
        let query = supabase
          .from('products')
          .select('category, main_image, images, quantity, supplier_id')
          .not('category', 'is', null)
          .neq('category', '')
          .range(offset, offset + BATCH_SIZE - 1)

        // Filter by company if provided
        if (companyId) {
          query = query.or(`supplier_id.eq.${companyId},company_id.eq.${companyId}`)
        }

        const { data, error } = await query

        if (error) {
          console.error('useCategoryHierarchy query error:', error)
          throw error
        }

        if (data) {
          allProducts.push(...(data as Pick<Product, 'category' | 'main_image' | 'images' | 'quantity'>[]))
        }
      }

      console.log('useCategoryHierarchy: Fetched products:', allProducts.length)

      const products = allProducts

      // Build hierarchy
      const mainCategories = new Map<string, {
        name: string
        imageUrl: string | null
        subcategories: Map<string, CategoryInfo>
        productCount: number
      }>()

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
        const { mainCategory, subcategory } = parseCategory(product.category)
        const fullCategory = product.category || 'Uncategorized'
        
        // Prioritize main_image (usually product photos on white background)
        const mainImageUrl = product.main_image || null
        const firstImageUrl = product.images?.[0] || null
        const imageUrl = mainImageUrl || firstImageUrl
        const imageCount = product.images?.length || 0
        const isMainImage = !!mainImageUrl

        // Get or create main category
        if (!mainCategories.has(mainCategory)) {
          mainCategories.set(mainCategory, {
            name: mainCategory,
            imageUrl: null,
            subcategories: new Map(),
            productCount: 0,
          })
        }

        const mainCat = mainCategories.get(mainCategory)!
        mainCat.productCount++

        // Set main category image - prefer images with white/transparent backgrounds
        if (imageUrl) {
          const currentScore = mainCat.imageUrl ? scoreImage(mainCat.imageUrl, false, 0) : 0
          const newScore = scoreImage(imageUrl, isMainImage, imageCount)
          
          if (!mainCat.imageUrl || newScore > currentScore) {
            mainCat.imageUrl = imageUrl
          }
        }

        // Handle subcategories
        if (subcategory) {
          if (!mainCat.subcategories.has(subcategory)) {
            mainCat.subcategories.set(subcategory, {
              mainCategory,
              subcategory,
              fullCategory,
              imageUrl: null,
              productCount: 0,
            })
          }

          const subCat = mainCat.subcategories.get(subcategory)!
          subCat.productCount++

          // Set subcategory image - prefer images with white/transparent backgrounds
          if (imageUrl) {
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
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes
  })
}

