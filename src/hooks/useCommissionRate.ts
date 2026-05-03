import { useAuthStore } from '@/stores/authStore'

/**
 * Hook to get the current user's commission rate.
 * 
 * Returns:
 * - commission rate (0.00 - 0.50) for company/buyer users with a rate set
 * - 0 for admins (they always see base prices)
 * - 0 for unauthenticated users
 * - 0 if rate is null/undefined
 * 
 * Usage:
 * ```tsx
 * const { commissionRate, hasDiscount, isCompanyUser } = useCommissionRate()
 * if (hasDiscount) {
 *   // Apply discount to prices
 * }
 * ```
 */
export function useCommissionRate() {
  const profile = useAuthStore((state) => state.profile)
  
  // Older environments may still persist client users as 'buyer'.
  const isCompanyUser = profile?.role === 'company' || profile?.role === 'buyer'
  
  // Get the commission rate (or 0 if not set)
  const commissionRate = isCompanyUser ? (profile?.commission_rate ?? 0) : 0
  
  // Check if user has an active discount
  const hasDiscount = isCompanyUser && commissionRate > 0
  
  return {
    /**
     * The user's commission rate (0.00 - 0.50)
     * 0 for admins and unauthenticated users
     */
    commissionRate,
    
    /**
     * Whether the user has an active discount (company/buyer user with rate > 0)
     */
    hasDiscount,
    
    /**
     * Whether the user is a client user (regardless of discount)
     */
    isCompanyUser,
    
    /**
     * The user's profile (for additional info if needed)
     */
    profile,
  }
}
