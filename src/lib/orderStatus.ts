export function getOrderStatusTranslationKey(status?: string | null): string | null {
  if (!status) return null

  const normalizedStatus = status.startsWith('complaints.')
    ? status.replace('complaints.', '')
    : status

  const statusKeyMap: Record<string, string> = {
    processing: 'orderStatus.processing',
    awaiting_payment: 'orderStatus.awaitingPayment',
    shipped: 'orderStatus.shipped',
    completed: 'orderStatus.completedSent',
    rejected: 'orderStatus.rejected',
    approved: 'orderStatus.approved',
    pending: 'orderStatus.pending',
    new: 'orderStatus.new',
    expired: 'orderStatus.expired',
    cancelled: 'orderStatus.cancelled',
  }

  return statusKeyMap[normalizedStatus] ?? null
}
