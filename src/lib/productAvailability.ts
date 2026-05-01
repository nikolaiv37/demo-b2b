export function hasNumericStock(quantity: number | null | undefined): quantity is number {
  return typeof quantity === 'number' && Number.isFinite(quantity)
}

export function getAvailabilityState(quantity: number | null | undefined) {
  if (!hasNumericStock(quantity)) return 'unknown'
  return quantity > 0 ? 'in-stock' : 'out-of-stock'
}
