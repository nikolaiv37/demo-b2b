import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'

// Define styles
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 30,
    borderBottom: '2 solid #000',
    paddingBottom: 15,
  },
  companyInfo: {
    marginBottom: 10,
  },
  companyName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  companyDetails: {
    fontSize: 9,
    color: '#666',
    lineHeight: 1.5,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    fontStyle: 'italic',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 10,
    borderBottom: '1 solid #ccc',
    paddingBottom: 5,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  label: {
    width: '30%',
    fontWeight: 'bold',
  },
  value: {
    width: '70%',
  },
  table: {
    marginTop: 20,
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    padding: 8,
    fontWeight: 'bold',
    borderBottom: '1 solid #ccc',
  },
  tableRow: {
    flexDirection: 'row',
    padding: 8,
    borderBottom: '1 solid #eee',
  },
  tableCell: {
    fontSize: 9,
  },
  colImage: {
    width: '10%',
  },
  colName: {
    width: '30%',
  },
  colSku: {
    width: '15%',
  },
  colQty: {
    width: '10%',
    textAlign: 'right',
  },
  colPrice: {
    width: '15%',
    textAlign: 'right',
  },
  colTotal: {
    width: '20%',
    textAlign: 'right',
    fontWeight: 'bold',
  },
  imagePlaceholder: {
    width: 30,
    height: 30,
    backgroundColor: '#f0f0f0',
    border: '1 solid #ccc',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 6,
    color: '#999',
  },
  totals: {
    marginTop: 20,
    alignSelf: 'flex-end',
    width: '40%',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
    paddingVertical: 3,
  },
  totalLabel: {
    fontWeight: 'bold',
  },
  totalValue: {
    fontWeight: 'bold',
  },
  grandTotal: {
    borderTop: '2 solid #000',
    paddingTop: 5,
    marginTop: 5,
    fontSize: 12,
  },
  footer: {
    marginTop: 40,
    paddingTop: 20,
    borderTop: '1 solid #ccc',
    fontSize: 8,
    color: '#666',
    textAlign: 'center',
  },
  footerTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  footerText: {
    lineHeight: 1.5,
    marginBottom: 3,
  },
})

interface OrderItem {
  product_id?: string
  product_name: string
  sku: string
  quantity: number
  unit_price: number
  total: number
  image_url?: string
}

interface Order {
  id: number | string
  order_number: number
  company_name: string
  email: string
  phone: string | null
  items: OrderItem[]
  total: number
  created_at: string
}

interface ProformaInvoicePDFProps {
  order: Order
  companyName?: string
  companyAddress?: string
  companyPhone?: string
  companyEmail?: string
  companyVat?: string
}

// Format date in Bulgarian format (dd.mm.yyyy)
function formatDateBG(dateString: string): string {
  const date = new Date(dateString)
  const day = date.getDate().toString().padStart(2, '0')
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const year = date.getFullYear()
  return `${day}.${month}.${year}`
}

// Format currency
function formatCurrency(amount: number): string {
  return `€${amount.toFixed(2)}`
}

export function ProformaInvoicePDF({
  order,
  companyName = 'FurniTrade',
  companyAddress = '123 Furniture Street, Sofia, Bulgaria',
  companyPhone = '+359 2 123 4567',
  companyEmail = 'info@furnitrade.com',
  companyVat = 'BG123456789',
}: ProformaInvoicePDFProps) {
  const subtotal = order.items.reduce((sum, item) => sum + item.total, 0)
  const tax = 0 // VAT can be added if needed
  const grandTotal = subtotal + tax

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.companyInfo}>
            <Text style={styles.companyName}>{companyName}</Text>
            <Text style={styles.companyDetails}>
              {companyAddress}
              {'\n'}
              Phone: {companyPhone} | Email: {companyEmail}
              {'\n'}
              VAT: {companyVat}
            </Text>
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title}>PROFORMA INVOICE</Text>
        <Text style={styles.subtitle}>For Quote Purposes Only - Non-Binding</Text>

        {/* Order Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Information</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Order Number:</Text>
            <Text style={styles.value}>#{order.order_number}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Date:</Text>
            <Text style={styles.value}>
              {formatDateBG(order.created_at)} ({new Date(order.created_at).toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })})
            </Text>
          </View>
        </View>

        {/* Customer Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customer Information</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Company Name:</Text>
            <Text style={styles.value}>{order.company_name}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Email:</Text>
            <Text style={styles.value}>{order.email}</Text>
          </View>
          {order.phone && (
            <View style={styles.row}>
              <Text style={styles.label}>Phone:</Text>
              <Text style={styles.value}>{order.phone}</Text>
            </View>
          )}
        </View>

        {/* Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableCell, styles.colImage]}>Image</Text>
            <Text style={[styles.tableCell, styles.colName]}>Product Name</Text>
            <Text style={[styles.tableCell, styles.colSku]}>SKU</Text>
            <Text style={[styles.tableCell, styles.colQty]}>Qty</Text>
            <Text style={[styles.tableCell, styles.colPrice]}>Unit Price</Text>
            <Text style={[styles.tableCell, styles.colTotal]}>Total</Text>
          </View>
          {order.items.map((item, index) => (
            <View key={index} style={styles.tableRow}>
              <View style={styles.colImage}>
                {item.image_url ? (
                  <Image
                    src={item.image_url}
                    style={{ width: 30, height: 30 }}
                    cache={false}
                  />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <Text>N/A</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.tableCell, styles.colName]}>{item.product_name}</Text>
              <Text style={[styles.tableCell, styles.colSku]}>{item.sku}</Text>
              <Text style={[styles.tableCell, styles.colQty]}>{item.quantity}</Text>
              <Text style={[styles.tableCell, styles.colPrice]}>{formatCurrency(item.unit_price)}</Text>
              <Text style={[styles.tableCell, styles.colTotal]}>{formatCurrency(item.total)}</Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal:</Text>
            <Text style={styles.totalValue}>{formatCurrency(subtotal)}</Text>
          </View>
          {tax > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>VAT:</Text>
              <Text style={styles.totalValue}>{formatCurrency(tax)}</Text>
            </View>
          )}
          <View style={[styles.totalRow, styles.grandTotal]}>
            <Text style={styles.totalLabel}>Total:</Text>
            <Text style={styles.totalValue}>{formatCurrency(grandTotal)}</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerTitle}>PROFORMA INVOICE - FOR QUOTE PURPOSES ONLY</Text>
          <Text style={styles.footerText}>
            This document is a proforma invoice and does not constitute a binding offer or commitment to sell.
          </Text>
          <Text style={styles.footerText}>
            Prices and availability are subject to change without notice. Final pricing and terms will be confirmed
            upon order approval.
          </Text>
          <Text style={styles.footerText}>
            This proforma invoice is valid for 30 days from the date of issue.
          </Text>
        </View>
      </Page>
    </Document>
  )
}

