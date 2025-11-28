import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { GlassCard } from '@/components/GlassCard'
import { CSVUploader } from '@/components/CSVUploader'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/components/ui/use-toast'
import { useCSVImport } from '@/hooks/useCSVImport'
import { CheckCircle2, Download, FileSpreadsheet, Package, ArrowRight, AlertCircle } from 'lucide-react'

export function CSVImportPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)
  const [uploaderResetKey, setUploaderResetKey] = useState(0)
  const navigate = useNavigate()
  const { toast } = useToast()
  
  const {
    previewCSV,
    isPreviewing,
    previewData,
    previewResult,
    previewError,
    validationResult,
    importCSV,
    isImporting,
    progress,
    statusText,
    result,
    error: importError,
  } = useCSVImport()

  // Show success state when import completes
  useEffect(() => {
    if (result && !isImporting) {
      setShowSuccess(true)
    }
  }, [result, isImporting])

  const handleFileSelect = (file: File) => {
    console.log('File selected:', file.name, file.size, file.type)
    setSelectedFile(file)
    setShowSuccess(false) // Reset success state on new file
    // Automatically preview the file
    previewCSV(file)
  }

  const handleConfirmImport = () => {
    console.log('Confirm import clicked', { selectedFile, previewResult, validationResult })
    if (selectedFile && previewResult && previewResult.data && validationResult) {
      // Only allow import if there are valid rows
      if (validationResult.validRows === 0) {
        toast({
          title: 'No Valid Products',
          description: 'There are no valid products to import. Please fix the errors in your CSV file.',
          variant: 'destructive',
        })
        return
      }
      
      setShowSuccess(false) // Reset success state
      console.log('Starting import with', validationResult.validRows, 'valid products')
      // Import only valid products
      importCSV({ file: selectedFile, data: validationResult.validData as Record<string, unknown>[] })
    } else {
      console.error('Cannot import:', { selectedFile, previewResult, validationResult })
      toast({
        title: 'Import Error',
        description: 'Please wait for the file preview and validation to complete before importing.',
        variant: 'destructive',
      })
    }
  }

  const handleViewProducts = () => {
    navigate('/dashboard/products')
  }

  const handleImportAnother = () => {
    setSelectedFile(null)
    setShowSuccess(false)
    // Reset the uploader by changing the key
    setUploaderResetKey(prev => prev + 1)
  }

  const downloadTemplate = () => {
    const template = `sku;name;description;category;manufacturer;model;retail_price;weboffer_price;availability;quantity;weight;transportational_weight;date_expected;main_image;image1
CHAIR-001;Modern Dining Chair;Comfortable dining chair with wooden legs;Chairs;ACME Corp;MC-2024;299.99;199.99;In Stock;50;5.5;7.0;;https://example.com/chair1.jpg;https://example.com/chair1.jpg
SOFA-001;3-Seater Sofa;Luxurious fabric sofa;Sofas;HomeStyle;SF-3S;1299.99;899.99;In Stock;20;45.0;55.0;;https://example.com/sofa1.jpg;https://example.com/sofa1.jpg
TABLE-001;Coffee Table;Solid wood coffee table;Tables;WoodWorks;CT-100;499.99;349.99;In Stock;30;18.5;22.0;;https://example.com/table1.jpg;https://example.com/table1.jpg`

    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'product-import-template.csv'
    a.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">CSV Import</h1>
        <p className="text-muted-foreground">
          Bulk import products from a CSV file with semicolon (;) delimiter
        </p>
      </div>

      {/* Instructions */}
      <GlassCard>
        <h2 className="text-xl font-semibold mb-3">How to Import</h2>
        <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
          <li>Download the CSV template below (uses semicolon delimiter)</li>
          <li>Fill in your product data following the format</li>
          <li>Upload your completed CSV file using drag-and-drop</li>
          <li>Review the preview of your data</li>
          <li>Click "Confirm Import" to import all products into the database</li>
        </ol>
        <Button
          variant="outline"
          className="mt-4"
          onClick={downloadTemplate}
        >
          <Download className="w-4 h-4 mr-2" />
          Download Template (semicolon delimited)
        </Button>
      </GlassCard>

      {/* File Upload */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Upload CSV File</h2>
        <CSVUploader
          key={uploaderResetKey}
          onFileSelect={handleFileSelect}
          isUploading={isPreviewing || isImporting}
          progress={isPreviewing ? 50 : progress}
        />
      </div>

      {/* Preview Error */}
      {previewError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <p className="font-semibold mb-1">Preview Error</p>
            <p className="text-sm">
              {previewError instanceof Error ? previewError.message : 'Failed to preview CSV file'}
            </p>
            <p className="text-xs mt-2 text-muted-foreground">
              Please check that your file is a valid CSV with semicolon (;) delimiter.
            </p>
          </AlertDescription>
        </Alert>
      )}

      {/* Import Error */}
      {importError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <p className="font-semibold mb-1">Import Error</p>
            <p className="text-sm">
              {importError instanceof Error ? importError.message : 'Failed to import products'}
            </p>
          </AlertDescription>
        </Alert>
      )}

      {/* Preview Data */}
      {previewResult && validationResult && !result && (
        <GlassCard>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xl font-semibold flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5" />
                Preview & Validation
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Showing first 10 valid rows of {validationResult.validRows} valid out of {validationResult.totalRows} total rows
              </p>
            </div>
            <div className="flex gap-2">
              <Badge variant="default" className="text-lg px-4 py-2 bg-green-600">
                {validationResult.validRows} valid
              </Badge>
              {validationResult.invalidRows > 0 && (
                <Badge variant="destructive" className="text-lg px-4 py-2">
                  {validationResult.invalidRows} invalid
                </Badge>
              )}
            </div>
          </div>

          {/* Validation Summary */}
          {validationResult.invalidRows > 0 && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <p className="font-semibold mb-1">
                  {validationResult.invalidRows} row(s) have validation errors
                </p>
                <p className="text-sm">
                  Only valid rows will be imported. Please review the errors below.
                </p>
                {validationResult.errors.length > 0 && (
                  <div className="mt-2 max-h-32 overflow-y-auto">
                    <ul className="text-xs list-disc list-inside space-y-1">
                      {validationResult.errors.slice(0, 5).map((error, idx) => (
                        <li key={idx}>
                          Row {error.row}: {error.field ? `${error.field}: ` : ''}{error.message}
                        </li>
                      ))}
                      {validationResult.errors.length > 5 && (
                        <li className="text-muted-foreground">
                          ... and {validationResult.errors.length - 5} more errors
                        </li>
                      )}
                    </ul>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Preview Table */}
          {previewData.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-2 font-semibold">Image</th>
                    <th className="text-left p-2 font-semibold">SKU</th>
                    <th className="text-left p-2 font-semibold">Name</th>
                    <th className="text-left p-2 font-semibold">Category</th>
                    <th className="text-right p-2 font-semibold">Wholesale Price</th>
                    <th className="text-right p-2 font-semibold">Stock</th>
                    <th className="text-center p-2 font-semibold">Images</th>
                  </tr>
                </thead>
                <tbody>
                  {previewData.map((product, index) => (
                    <tr 
                      key={index} 
                      className="border-b border-border/50 hover:bg-muted/50"
                    >
                      <td className="p-2">
                        {product.main_image && (
                          <img 
                            src={product.main_image as string} 
                            alt={product.name as string}
                            className="w-12 h-12 object-cover rounded border"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none'
                            }}
                          />
                        )}
                      </td>
                      <td className="p-2 font-mono text-xs">
                        {product.sku}
                      </td>
                      <td className="p-2">
                        {product.name}
                      </td>
                      <td className="p-2">{product.category || '-'}</td>
                      <td className="p-2 text-right font-medium">
                        {product.wholesale_price !== undefined && product.wholesale_price !== null
                          ? `€${Number(product.wholesale_price).toFixed(2)}`
                          : '€0.00'}
                      </td>
                      <td className="p-2 text-right">
                        {product.stock !== undefined ? Number(product.stock) : 0}
                      </td>
                      <td className="p-2 text-center">
                        <Badge variant="secondary">
                          {(product.images as string[])?.length || 0}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </GlassCard>
      )}

      {/* Import Progress */}
      {isImporting && (
        <GlassCard>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold">Importing Products</h3>
                <span className="text-sm font-medium">{progress}%</span>
              </div>
              <Progress value={progress} className="h-3" />
            </div>
            <p className="text-sm text-muted-foreground font-medium">{statusText}</p>
            {progress > 0 && progress < 100 && (
              <p className="text-xs text-muted-foreground">
                Please wait while we import your products...
              </p>
            )}
          </div>
        </GlassCard>
      )}

      {/* Success Result - Always visible when import completes */}
      {(result || showSuccess) && !isImporting && (
        <GlassCard className="border-2 border-green-500/50 bg-green-50/50 dark:bg-green-950/20">
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-white" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold mb-2 text-green-700 dark:text-green-400">
                  Import Complete! 🎉
                </h3>
                <p className="text-muted-foreground mb-4 text-lg">
                  {result?.imported || 0} products have been imported successfully.
                  {result?.skipped && result.skipped > 0 && (
                    <span className="text-yellow-600 dark:text-yellow-400">
                      {' '}{result.skipped} rows skipped.
                    </span>
                  )}
                  {result?.failed && result.failed > 0 && (
                    <span className="text-orange-600 dark:text-orange-400">
                      {' '}{result.failed} rows failed.
                    </span>
                  )}
                </p>
                
                <div className="flex flex-wrap gap-2 mb-4">
                  <Badge variant="secondary" className="text-base px-3 py-1">
                    Total: {result?.total || 0}
                  </Badge>
                  <Badge variant="default" className="bg-green-500 text-white text-base px-3 py-1">
                    Imported: {result?.imported || 0}
                  </Badge>
                  {result?.skipped && result.skipped > 0 && (
                    <Badge variant="outline" className="text-base px-3 py-1 border-yellow-500 text-yellow-700 dark:text-yellow-400">
                      Skipped: {result.skipped}
                    </Badge>
                  )}
                  {result?.failed && result.failed > 0 && (
                    <Badge variant="destructive" className="text-base px-3 py-1">
                      Failed: {result.failed}
                    </Badge>
                  )}
                </div>

                <div className="flex gap-3 mt-6">
                  <Button
                    onClick={handleViewProducts}
                    size="lg"
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    <Package className="w-5 h-5 mr-2" />
                    View Products
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                  <Button
                    onClick={handleImportAnother}
                    variant="outline"
                    size="lg"
                  >
                    Import Another File
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </GlassCard>
      )}

      {/* Confirm Import Button */}
      {previewResult && validationResult && validationResult.validRows > 0 && !result && !isImporting && !showSuccess && (
        <Button
          onClick={handleConfirmImport}
          disabled={isImporting || isPreviewing}
          size="lg"
          className="w-full"
        >
          {isPreviewing 
            ? 'Loading preview...'
            : isImporting 
            ? `Importing... ${progress}%` 
            : `Confirm Import (${validationResult.validRows} valid product${validationResult.validRows !== 1 ? 's' : ''})`
          }
        </Button>
      )}

      {/* Loading State */}
      {isPreviewing && !previewError && (
        <GlassCard>
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
            <p className="text-sm text-muted-foreground">Parsing CSV file...</p>
          </div>
        </GlassCard>
      )}
    </div>
  )
}

