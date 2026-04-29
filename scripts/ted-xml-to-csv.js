import fs from 'fs'
import path from 'path'

// Internal onboarding/import sample only.
// This TED conversion script is intentionally kept out of the product UI and
// should not be treated as generic customer-facing import functionality.
const SCRIPT_DIR = path.dirname(decodeURIComponent(new URL(import.meta.url).pathname))
const ROOT_DIR = path.resolve(SCRIPT_DIR, '..')
const INPUT_FILE = path.join(ROOT_DIR, 'ted_bg.xml')
const OUTPUT_FILE = path.join(SCRIPT_DIR, 'ted-products.csv')

const COLUMNS = [
  'sku',
  'name',
  'description',
  'category',
  'moq',
  'retail_price',
  'wholesale_price',
  'stock',
  'images',
]

function decodeXmlEntities(value) {
  if (!value) return ''

  let decoded = value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')

  for (let i = 0; i < 5; i += 1) {
    const next = decoded
      .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
      .replace(/&#x([0-9a-fA-F]+);/g, (_, code) => String.fromCodePoint(parseInt(code, 16)))
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')

    if (next === decoded) return decoded
    decoded = next
  }

  return decoded
}

function getTagContent(xml, tagName) {
  const match = xml.match(new RegExp(`<${tagName}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tagName}>`, 'i'))
  return match ? decodeXmlEntities(match[1]).trim() : ''
}

function getBlocks(xml, tagName) {
  const blocks = []
  const pattern = new RegExp(`<${tagName}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tagName}>`, 'gi')
  let match

  while ((match = pattern.exec(xml)) !== null) {
    blocks.push(match[1])
  }

  return blocks
}

function stripHtml(value) {
  return decodeXmlEntities(value)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizePrice(value) {
  const parsed = Number(String(value || '').replace(',', '.').trim())
  return Number.isFinite(parsed) ? parsed.toFixed(2) : '0.00'
}

function wholesalePrice(retailPrice) {
  return (Number(retailPrice) * 0.75).toFixed(2)
}

function csvEscape(value) {
  const text = String(value == null ? '' : value)
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

function csvLine(row) {
  return COLUMNS.map((column) => csvEscape(row[column])).join(',')
}

function getImages(productXml) {
  const imagesBlockMatch = productXml.match(/<images(?:\s[^>]*)?>([\s\S]*?)<\/images>/i)
  if (!imagesBlockMatch) return ''

  return getBlocks(imagesBlockMatch[1], 'image')
    .map((image) => decodeXmlEntities(image).trim())
    .filter(Boolean)
    .join('|')
}

function getVariantSizeLabel(variantXml) {
  const parametersBlock = getTagContent(variantXml, 'parameters')
  const parameterBlock = getBlocks(parametersBlock, 'parameter')[0] || ''
  return getTagContent(parameterBlock, 'value') || getTagContent(variantXml, 'name')
}

function buildParentRow(productXml) {
  const retailPrice = normalizePrice(getTagContent(productXml, 'price'))
  const stockStatus = getTagContent(productXml, 'stock_status').toLowerCase()
  const subCategory = getTagContent(productXml, 'sub_category')
  const category = subCategory || getTagContent(productXml, 'category')
  const moq = getTagContent(productXml, 'minimum') || '1'

  return {
    sku: getTagContent(productXml, 'sku'),
    name: getTagContent(productXml, 'title'),
    description: stripHtml(getTagContent(productXml, 'description')),
    category,
    moq,
    retail_price: retailPrice,
    wholesale_price: wholesalePrice(retailPrice),
    stock: stockStatus === 'in stock' ? '100' : '0',
    images: getImages(productXml),
  }
}

function rowsFromProduct(productXml) {
  const parentRow = buildParentRow(productXml)
  const variantsBlock = getTagContent(productXml, 'variants')
  const variants = variantsBlock ? getBlocks(variantsBlock, 'variant') : []

  if (variants.length === 0) {
    return [parentRow]
  }

  return variants.map((variantXml) => {
    const sizeLabel = getVariantSizeLabel(variantXml)
    const skuLabel = sizeLabel.trim().replace(/\s+/g, '-')
    const retailPrice = normalizePrice(getTagContent(variantXml, 'price') || parentRow.retail_price)
    const variantSku = getTagContent(variantXml, 'sku') || parentRow.sku

    return {
      ...parentRow,
      sku: skuLabel ? `${variantSku}-${skuLabel}` : variantSku,
      name: sizeLabel ? `${parentRow.name} - ${sizeLabel}` : parentRow.name,
      retail_price: retailPrice,
      wholesale_price: wholesalePrice(retailPrice),
    }
  })
}

function main() {
  const xml = fs.readFileSync(INPUT_FILE, 'utf8')
  const products = getBlocks(xml, 'product')
  const rows = products.flatMap(rowsFromProduct)
  const csv = [COLUMNS.join(','), ...rows.map(csvLine)].join('\n') + '\n'

  fs.writeFileSync(OUTPUT_FILE, csv, 'utf8')
  console.log(`Wrote ${rows.length} rows to ${path.relative(ROOT_DIR, OUTPUT_FILE)}`)
  console.log([COLUMNS.join(','), ...rows.slice(0, 3).map(csvLine)].join('\n'))
}

main()
