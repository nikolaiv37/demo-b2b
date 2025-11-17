import { z } from 'zod'

export const productCSVSchema = z.object({
  sku: z.string().min(1, 'SKU is required'),
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  category: z.string().min(1, 'Category is required'),
  moq: z.coerce.number().int().positive().default(1),
  retail_price: z.coerce.number().positive('Retail price must be positive'),
  wholesale_price: z.coerce.number().positive('Wholesale price must be positive'),
  stock: z.coerce.number().int().nonnegative().default(0),
  images: z.string().optional(),
})

export type ProductCSVData = z.infer<typeof productCSVSchema>

export interface ValidationResult {
  valid: boolean
  errors: Array<{
    row: number
    field?: string
    message: string
  }>
  validData: ProductCSVData[]
}

export function validateCSVData(data: any[]): ValidationResult {
  const errors: ValidationResult['errors'] = []
  const validData: ProductCSVData[] = []
  const skuSet = new Set<string>()

  data.forEach((row, index) => {
    const rowNumber = index + 2 // +2 because of 0-index and header row

    try {
      const validated = productCSVSchema.parse(row)

      // Check for duplicate SKUs
      if (skuSet.has(validated.sku)) {
        errors.push({
          row: rowNumber,
          field: 'sku',
          message: `Duplicate SKU: ${validated.sku}`,
        })
        return
      }

      // Validate wholesale price is less than retail price
      if (validated.wholesale_price > validated.retail_price) {
        errors.push({
          row: rowNumber,
          field: 'wholesale_price',
          message: 'Wholesale price must be less than or equal to retail price',
        })
        return
      }

      skuSet.add(validated.sku)
      validData.push(validated)
    } catch (error) {
      if (error instanceof z.ZodError) {
        error.errors.forEach((err) => {
          errors.push({
            row: rowNumber,
            field: err.path[0]?.toString(),
            message: err.message,
          })
        })
      } else {
        errors.push({
          row: rowNumber,
          message: 'Unknown validation error',
        })
      }
    }
  })

  return {
    valid: errors.length === 0,
    errors,
    validData,
  }
}

