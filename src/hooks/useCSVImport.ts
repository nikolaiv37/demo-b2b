import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'
import { parseCSV, csvRowToProduct, CSVRow } from '@/lib/csv/parser'
import { trackEvent, AnalyticsEvents } from '@/lib/analytics'
import { toast } from '@/components/ui/use-toast'

export function useCSVImport() {
  const [progress, setProgress] = useState(0)
  const [statusText, setStatusText] = useState('')
  const [previewData, setPreviewData] = useState<CSVRow[]>([])
  const queryClient = useQueryClient()

  const previewMutation = useMutation({
    mutationFn: async (file: File) => {
      setProgress(0)
      setPreviewData([])

      try {
        // Parse CSV with semicolon delimiter
        const parseResult = await parseCSV(file, ';')

        console.log('CSV Parse Result:', {
          totalRows: parseResult.data.length,
          errors: parseResult.errors,
          firstRow: parseResult.data[0],
        })

        if (parseResult.errors.length > 0) {
          console.error('CSV Parse Errors:', parseResult.errors)
          // Show warnings but don't fail if we have data
          if (parseResult.data.length === 0) {
            throw new Error(`CSV parsing failed: ${parseResult.errors[0].message}`)
          }
        }

        if (parseResult.data.length === 0) {
          throw new Error('No valid data found in CSV file. Please check the file format.')
        }

        // Store preview data (first 10 rows)
        setPreviewData(parseResult.data.slice(0, 10))

        return {
          totalRows: parseResult.data.length,
          data: parseResult.data,
        }
      } catch (error) {
        console.error('Preview error:', error)
        throw error
      }
    },
    onError: (error) => {
      console.error('Preview mutation error:', error)
      toast({
        title: 'Preview Failed',
        description: error instanceof Error ? error.message : 'Failed to preview CSV file',
        variant: 'destructive',
      })
    },
  })

  const importMutation = useMutation({
    mutationFn: async ({ file, data }: { file: File; data: CSVRow[] }) => {
      setProgress(0)
      setStatusText('Starting import...')

      trackEvent(AnalyticsEvents.CSV_IMPORT_STARTED, {
        fileName: file.name,
        fileSize: file.size,
        totalRows: data.length,
      })

      // Get current user (handle dev mode)
      const { data: { user } } = await supabase.auth.getUser()
      
      // Use dev mode user ID if in dev mode, otherwise require authentication
      const isDevMode = import.meta.env.VITE_DEV_MODE === 'true'
      
      // For dev mode, use a simple text ID (not UUID) to avoid foreign key constraint issues
      // If your database has a foreign key constraint, you'll need to run the fix-supplier-id-constraint.sql migration
      const devUserId = isDevMode ? 'dev-user-123' : null
      const supplierId = user?.id || devUserId
      
      if (!supplierId) {
        throw new Error('User not authenticated')
      }

      console.log('Using supplier_id:', supplierId, { isDevMode, hasUser: !!user, userId: user?.id })

      setStatusText('Preparing products...')
      
      // Convert rows to products with error handling for malformed rows
      const products: Record<string, unknown>[] = []
      const skippedRows: Array<{ row: number; error: string }> = []
      
      data.forEach((row, index) => {
        try {
          const product = csvRowToProduct(row, supplierId)
          products.push(product)
        } catch (error) {
          // Skip malformed rows instead of crashing
          const rowNumber = index + 2 // +2 because of 0-index and header row
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          skippedRows.push({
            row: rowNumber,
            error: errorMessage,
          })
          console.warn(`Skipping row ${rowNumber}:`, errorMessage)
        }
      })

      if (products.length === 0) {
        throw new Error('No valid products to import. Please check your CSV file.')
      }

      // Bulk upsert products (in batches of 1000 for optimal speed)
      const batchSize = 1000
      const batches = []
      for (let i = 0; i < products.length; i += batchSize) {
        batches.push(products.slice(i, i + batchSize))
      }

      let importedCount = 0
      const failedRows: Array<{ row: number; error: string }> = []

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i]
        const startRow = i * batchSize + 1
        const endRow = Math.min(startRow + batch.length - 1, products.length)

        setStatusText(`Importing ${startRow}-${endRow} of ${products.length}...`)
        setProgress(Math.floor(((i + 1) / batches.length) * 100))

        try {
          // Upsert batch with onConflict: 'sku' and ignoreDuplicates: false (updates on duplicate)
          const { error } = await supabase
            .from('products')
            .upsert(batch, {
              onConflict: 'sku',
              ignoreDuplicates: false, // Update existing rows instead of skipping
            })

          if (error) {
            console.error(`Batch ${i + 1} error:`, error)
            // Log error but continue with remaining batches
            failedRows.push({
              row: startRow,
              error: error.message,
            })
            // Don't show toast for every batch error to avoid spam
            if (i === 0) {
              toast({
                title: 'Batch Error',
                description: `Error in rows ${startRow}-${endRow}: ${error.message}. Continuing with remaining batches...`,
                variant: 'destructive',
              })
            }
          } else {
            importedCount += batch.length
          }
        } catch (error) {
          console.error(`Batch ${i + 1} exception:`, error)
          failedRows.push({
            row: startRow,
            error: error instanceof Error ? error.message : 'Unknown error',
          })
        }
      }

      setProgress(100)
      setStatusText('Import complete!')

      trackEvent(AnalyticsEvents.CSV_IMPORT_COMPLETED, {
        productsImported: importedCount,
        totalRows: products.length,
        failedRows: failedRows.length,
        skippedRows: skippedRows.length,
      })

      return {
        success: true,
        imported: importedCount,
        total: data.length, // Total rows in CSV
        valid: products.length, // Valid products processed
        failed: failedRows.length,
        skipped: skippedRows.length,
        errors: [...failedRows, ...skippedRows],
      }
    },
    onSuccess: (result) => {
      // Invalidate products query to refresh the list
      queryClient.invalidateQueries({ queryKey: ['products'] })
      
      // Show success toast with detailed stats
      const messages = []
      if (result.skipped > 0) {
        messages.push(`${result.skipped} rows skipped`)
      }
      if (result.failed > 0) {
        messages.push(`${result.failed} rows failed`)
      }
      const details = messages.length > 0 ? ` (${messages.join(', ')})` : ''
      
      toast({
        title: 'Import Successful! 🎉',
        description: `Successfully imported ${result.imported} products!${details}`,
        variant: 'default',
        duration: 5000,
      })

      // Don't auto-redirect - let user click the button to view products
    },
    onError: (error) => {
      trackEvent(AnalyticsEvents.CSV_IMPORT_FAILED, {
        error: error instanceof Error ? error.message : 'Unknown error',
      })

      toast({
        title: 'Import Failed',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      })
    },
  })

  return {
    previewCSV: previewMutation.mutate,
    isPreviewing: previewMutation.isPending,
    previewData,
    previewResult: previewMutation.data,
    previewError: previewMutation.error,
    importCSV: importMutation.mutate,
    isImporting: importMutation.isPending,
    progress,
    statusText,
    result: importMutation.data,
    error: importMutation.error,
  }
}

