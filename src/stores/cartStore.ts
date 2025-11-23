import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Product, CartItem } from '@/types'

interface CartState {
  items: CartItem[]
  addItem: (product: Product, quantity: number, userRole?: 'admin' | 'sales' | 'buyer' | 'company') => {
    success: boolean
    message?: string
  }
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number, userRole?: 'admin' | 'sales' | 'buyer' | 'company') => {
    success: boolean
    message?: string
  }
  clearCart: () => void
  getTotal: () => number
  getItemCount: () => number
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (product, quantity, _userRole) => {
        // Validate stock (use quantity field)
        const stock = product.quantity ?? 0
        if (quantity > stock) {
          return {
            success: false,
            message: `Only ${stock} units available in stock`,
          }
        }

        if (quantity <= 0) {
          return {
            success: false,
            message: 'Quantity must be greater than 0',
          }
        }

        const items = get().items
        const existingItemIndex = items.findIndex(
          (item) => item.product.id === product.id
        )

        if (existingItemIndex > -1) {
          // Update existing item
          const newQuantity = items[existingItemIndex].quantity + quantity
          if (newQuantity > stock) {
            return {
              success: false,
              message: `Only ${stock} units available in stock`,
            }
          }

          // Use weboffer_price (wholesale price)
          const unitPrice = product.weboffer_price || 0
          const updatedItems = [...items]
          updatedItems[existingItemIndex] = {
            ...updatedItems[existingItemIndex],
            quantity: newQuantity,
            price: unitPrice,
            total: unitPrice * newQuantity,
          }

          set({ items: updatedItems })
        } else {
          // Add new item - use weboffer_price (wholesale price)
          const unitPrice = product.weboffer_price || 0
          const newItem: CartItem = {
            product,
            quantity,
            price: unitPrice,
            total: unitPrice * quantity,
          }

          set({ items: [...items, newItem] })
        }

        return { success: true }
      },

      removeItem: (productId) => {
        set((state) => ({
          items: state.items.filter((item) => item.product.id !== productId),
        }))
      },

      updateQuantity: (productId, quantity, _userRole) => {
        const items = get().items
        const itemIndex = items.findIndex((item) => item.product.id === productId)

        if (itemIndex === -1) {
          return {
            success: false,
            message: 'Item not found in cart',
          }
        }

        const item = items[itemIndex]
        
        if (quantity === 0) {
          get().removeItem(productId)
          return { success: true }
        }

        // Validate stock (use quantity field)
        const stock = item.product.quantity ?? 0
        if (quantity > stock) {
          return {
            success: false,
            message: `Only ${stock} units available in stock`,
          }
        }

        // Use weboffer_price (wholesale price)
        const unitPrice = item.product.weboffer_price || 0
        const updatedItems = [...items]
        updatedItems[itemIndex] = {
          ...item,
          quantity,
          price: unitPrice,
          total: unitPrice * quantity,
        }

        set({ items: updatedItems })
        return { success: true }
      },

      clearCart: () => {
        set({ items: [] })
      },

      getTotal: () => {
        return get().items.reduce((total, item) => total + item.total, 0)
      },

      getItemCount: () => {
        return get().items.reduce((count, item) => count + item.quantity, 0)
      },
    }),
    {
      name: 'furnitrade-cart',
    }
  )
)

