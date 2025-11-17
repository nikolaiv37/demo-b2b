import Papa from 'papaparse'
import { Product } from '@/types'

export interface CSVRow {
  id?: string | number
  model?: string
  sku: string
  retail_price?: string | number
  weboffer_price: string | number
  name: string
  category?: string
  manufacturer?: string
  description?: string
  availability?: string
  quantity?: string | number
  weight?: string | number
  transportational_weight?: string | number
  date_expected?: string
  main_image?: string
  image1?: string
  image2?: string
  image3?: string
  image4?: string
  image5?: string
  image6?: string
  image7?: string
  image8?: string
  image9?: string
  image10?: string
  // Ignore all attribute columns (17 of them)
  [key: string]: string | number | undefined
}

export interface ParseResult {
  data: CSVRow[]
  errors: Papa.ParseError[]
  meta: Papa.ParseMeta
}

/**
 * Parse CSV file with proper UTF-8 handling for Greek characters
 * Uses semicolon delimiter and quoteChar for proper escaping
 * Handles field mismatches gracefully (trailing empty fields)
 */
export function parseCSV(file: File, delimiter: string = ';'): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      delimiter: delimiter,
      quoteChar: '"',
      escapeChar: '"',
      skipEmptyLines: 'greedy', // More aggressive empty line skipping
      encoding: 'UTF-8',
      // Don't throw errors on field mismatches (trailing empty fields are OK)
      transformHeader: (header: string) => {
        // Normalize header names: trim, lowercase, replace spaces with underscores
        return header.trim().toLowerCase().replace(/\s+/g, '_')
      },
      transform: (value: string) => {
        // Preserve UTF-8 encoding for Greek characters
        return value
      },
      complete: (results) => {
        // Filter out field mismatch errors (they're just warnings about trailing empty fields)
        const nonFatalErrors = results.errors.filter(
          (error) => error.type !== 'FieldMismatch' || error.code !== 'TooFewFields'
        )

        // Filter out completely empty rows and rows without SKU
        const validData = (results.data as CSVRow[]).filter((row) => {
          return row && row.sku && typeof row.sku === 'string' && row.sku.trim().length > 0
        })

        console.log('Parsed CSV:', {
          totalRows: results.data.length,
          validRows: validData.length,
          fieldMismatchWarnings: results.errors.filter(
            (e) => e.type === 'FieldMismatch'
          ).length,
          otherErrors: nonFatalErrors.length,
        })

        resolve({
          data: validData,
          errors: nonFatalErrors, // Only return non-field-mismatch errors
          meta: results.meta,
        })
      },
      error: (error) => {
        reject(error)
      },
    })
  })
}

/**
 * Safely parse number with European decimal comma support
 * Handles both "9.50" and "9,50" formats
 */
function parseNumber(value: string | number | undefined | null): number | null {
  if (value === null || value === undefined || value === '') {
    return null
  }
  
  const str = value.toString().trim()
  if (!str) return null
  
  // Replace comma with dot for European format, but preserve if it's a thousands separator
  // If comma is followed by exactly 2 digits, it's likely a decimal separator
  let normalized = str.replace(/,(\d{2})$/, '.$1')
  // If no dot exists, replace comma with dot
  if (!normalized.includes('.')) {
    normalized = normalized.replace(',', '.')
  }
  
  const num = parseFloat(normalized)
  return isNaN(num) ? null : num
}

/**
 * Safely parse integer
 */
function parseInteger(value: string | number | undefined | null): number {
  if (value === null || value === undefined || value === '') {
    return 0
  }
  
  const str = value.toString().trim()
  if (!str) return 0
  
  // Remove any non-digit characters except minus sign
  const cleaned = str.replace(/[^\d-]/g, '')
  const num = Number.parseInt(cleaned, 10)
  return isNaN(num) ? 0 : num
}

/**
 * Check if a string is a valid HTTP(S) URL
 */
function isValidImageUrl(value: string | number | undefined | null): boolean {
  if (!value || typeof value !== 'string') return false
  const trimmed = value.trim()
  return trimmed.length > 0 && (trimmed.startsWith('http://') || trimmed.startsWith('https://'))
}

/**
 * Convert CSV row to Product object matching exact Megapap format
 * Handles all 10 image columns and ignores 17 trailing attribute columns
 */
export function csvRowToProduct(row: CSVRow, supplierId: string): Record<string, unknown> {
  // Validate required SKU
  if (!row.sku || typeof row.sku !== 'string') {
    throw new Error(`Invalid row: missing or invalid SKU`)
  }

  const sku = row.sku.toString().trim()
  if (!sku) {
    throw new Error(`Invalid row: empty SKU`)
  }

  // Extract all valid image URLs from image1-image10 columns
  const imageUrls: string[] = []
  for (let i = 1; i <= 10; i++) {
    const imageKey = `image${i}` as keyof CSVRow
    const imageValue = row[imageKey]
    if (imageValue && isValidImageUrl(imageValue)) {
      imageUrls.push(imageValue.toString().trim())
    }
  }

  // Determine main_image: use main_image if valid, otherwise first image, otherwise null
  let mainImage: string | null = null
  if (row.main_image && isValidImageUrl(row.main_image)) {
    mainImage = row.main_image.toString().trim()
  } else if (imageUrls.length > 0) {
    mainImage = imageUrls[0]
  }

  // Parse all fields according to exact requirements
  return {
    supplier_id: supplierId,
    model: row.model ? row.model.toString().trim() : null,
    sku: sku,
    retail_price: parseNumber(row.retail_price),
    weboffer_price: parseNumber(row.weboffer_price) ?? 0, // Required, default to 0
    name: row.name ? row.name.toString().trim() : '',
    category: row.category ? row.category.toString().trim() : null,
    manufacturer: row.manufacturer ? row.manufacturer.toString().trim() : null,
    description: row.description ? row.description.toString().trim() : null,
    availability: row.availability ? row.availability.toString().trim() : 'In Stock',
    quantity: parseInteger(row.quantity),
    weight: parseNumber(row.weight),
    transportational_weight: parseNumber(row.transportational_weight),
    date_expected: row.date_expected ? row.date_expected.toString().trim() : null,
    main_image: mainImage,
    images: imageUrls, // Already filtered to valid URLs only
    is_visible: true,
  }
}

export function exportToCSV(products: Product[]): string {
  const csvData = products.map((product) => ({
    sku: product.sku,
    name: product.name,
    description: product.description || '',
    category: product.category,
    moq: product.moq,
    retail_price: product.retail_price,
    wholesale_price: product.wholesale_price,
    stock: product.stock,
    images: product.images.join(','),
  }))

  return Papa.unparse(csvData)
}

