import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'
import { GlassCard } from '@/components/GlassCard'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/hooks/useAuth'
import { formatDate } from '@/lib/utils'
import { Search, Users } from 'lucide-react'

interface Customer {
  email: string
  name: string
  totalOrders: number
  totalSpent: number
  lastOrderDate: string
}

export function CustomersPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const { company } = useAuth()

  const { data: customers, isLoading } = useQuery({
    queryKey: ['customers', company?.id],
    queryFn: async () => {
      if (!company?.id) return []

      // Get all orders for this company
      const { data: orders, error } = await supabase
        .from('orders')
        .select('customer_email, customer_name, total, created_at, payment_status')
        .eq('company_id', company.id)
        .eq('payment_status', 'paid')

      if (error) throw error

      // Group by customer email
      const customerMap = new Map<string, Customer>()

      orders.forEach((order) => {
        const existing = customerMap.get(order.customer_email)
        if (existing) {
          existing.totalOrders += 1
          existing.totalSpent += order.total
          if (new Date(order.created_at) > new Date(existing.lastOrderDate)) {
            existing.lastOrderDate = order.created_at
          }
        } else {
          customerMap.set(order.customer_email, {
            email: order.customer_email,
            name: order.customer_name || 'N/A',
            totalOrders: 1,
            totalSpent: order.total,
            lastOrderDate: order.created_at,
          })
        }
      })

      return Array.from(customerMap.values()).sort(
        (a, b) => b.totalSpent - a.totalSpent
      )
    },
    enabled: !!company?.id,
  })

  const filteredCustomers = customers?.filter(
    (customer) =>
      customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Customers</h1>
        <p className="text-muted-foreground">
          View and manage your customer relationships
        </p>
      </div>

      <GlassCard>
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : filteredCustomers && filteredCustomers.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Total Orders</TableHead>
                <TableHead>Total Spent</TableHead>
                <TableHead>Last Order</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers.map((customer) => (
                <TableRow key={customer.email}>
                  <TableCell>
                    <div>
                      <p className="font-semibold">{customer.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {customer.email}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{customer.totalOrders}</Badge>
                  </TableCell>
                  <TableCell className="font-semibold">
                    ${customer.totalSpent.toFixed(2)}
                  </TableCell>
                  <TableCell>{formatDate(customer.lastOrderDate)}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        customer.totalSpent > 1000 ? 'default' : 'secondary'
                      }
                    >
                      {customer.totalSpent > 1000 ? 'VIP' : 'Regular'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-12">
            <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No customers found</h3>
            <p className="text-muted-foreground">
              {searchQuery
                ? 'Try adjusting your search'
                : 'Customers will appear here after placing orders'}
            </p>
          </div>
        )}
      </GlassCard>
    </div>
  )
}

