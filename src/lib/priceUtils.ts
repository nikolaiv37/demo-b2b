/**
 * Price calculation utilities for personalized commission discounts.
 * 
 * Commission rates are stored as decimals (0.00 - 0.50) representing 0-50% discount.
 * Example: rate=0.15 means 15% discount → price * 0.85
 */

function normalizeBasePrice(basePrice: number | string | null | undefined): number {
  const parsed =
    typeof basePrice === 'string' ? Number(basePrice) : basePrice

  if (!Number.isFinite(parsed)) {
    return 0
  }

  return Number(parsed)
}

export function normalizeCommissionRate(commissionRate: number | null | undefined): number {
  if (!Number.isFinite(commissionRate)) {
    return 0
  }

  return Math.max(0, Math.min(0.5, Number(commissionRate)))
}

/**
 * Apply commission rate to a base price.
 * @param basePrice - The original weboffer_price
 * @param commissionRate - Decimal rate (0.00 to 0.50), e.g., 0.15 = 15% discount
 * @returns Adjusted price rounded to 2 decimal places
 */
export function applyCommissionRate(
  basePrice: number | string | null | undefined,
  commissionRate: number | null | undefined
): number {
  const normalizedBasePrice = normalizeBasePrice(basePrice)
  const clampedRate = normalizeCommissionRate(commissionRate)

  if (clampedRate === 0) {
    return Math.round(normalizedBasePrice * 100) / 100
  }

  const adjustedPrice = normalizedBasePrice * (1 - clampedRate)

  return Math.round(adjustedPrice * 100) / 100
}

/**
 * Check if a user should see adjusted prices.
 * Only company users with a commission rate > 0 get discounts.
 */
export function shouldApplyCommission(
  role: string | null | undefined,
  commissionRate: number | null | undefined
): boolean {
  // Buyer is the current client role. Keep legacy company support for older data.
  if (role !== 'buyer' && role !== 'company') return false
  
  // Must have a positive commission rate
  return normalizeCommissionRate(commissionRate) > 0
}

/**
 * Format commission rate as a percentage string.
 * @param rate - Decimal rate (e.g., 0.15)
 * @returns Formatted percentage (e.g., "15%")
 */
export function formatCommissionRate(rate: number | null | undefined): string {
  if (!rate || rate === 0) return '0%'
  const percentage = rate * 100
  return `${percentage.toFixed(percentage % 1 === 0 ? 0 : 1)}%`
}
