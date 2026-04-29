// Email client placeholder.
// TODO: Route email sending through a Supabase Edge Function; never call Resend
// directly from browser code or expose a Resend API key through VITE_* env vars.

export interface EmailTemplate {
  to: string
  from?: string
  subject: string
  html: string
}

export async function sendEmail(template: EmailTemplate) {
  void template
  if (import.meta.env.DEV) {
    console.warn('Email sending is disabled in the browser. Route via Supabase Edge Function before enabling.')
  }
  return { disabled: true }
}

// Email templates
export const EmailTemplates = {
  quoteReceived: (customerName: string, quoteId: string, total: number) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #333;">Quote Request Received</h1>
      <p>Hello ${customerName},</p>
      <p>We have received your quote request (ID: ${quoteId}).</p>
      <p><strong>Total Amount:</strong> $${total.toFixed(2)}</p>
      <p>Our team will review your request and get back to you within 24 hours.</p>
      <p>Thank you for your business!</p>
      <hr />
      <p style="color: #666; font-size: 12px;">Centivon | Demo B2B Portal</p>
    </div>
  `,

  quoteApproved: (customerName: string, quoteId: string, total: number, approvalUrl: string) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #22c55e;">Quote Approved!</h1>
      <p>Hello ${customerName},</p>
      <p>Great news! Your quote (ID: ${quoteId}) has been approved.</p>
      <p><strong>Total Amount:</strong> $${total.toFixed(2)}</p>
      <p>
        <a href="${approvalUrl}" 
           style="background-color: #22c55e; color: white; padding: 12px 24px; 
                  text-decoration: none; border-radius: 6px; display: inline-block;">
          Proceed to Checkout
        </a>
      </p>
      <p>Thank you for your business!</p>
      <hr />
      <p style="color: #666; font-size: 12px;">Centivon | Demo B2B Portal</p>
    </div>
  `,

  orderShipped: (customerName: string, orderId: string, trackingNumber: string) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #3b82f6;">Order Shipped!</h1>
      <p>Hello ${customerName},</p>
      <p>Your order (ID: ${orderId}) has been shipped.</p>
      <p><strong>Tracking Number:</strong> ${trackingNumber}</p>
      <p>You can track your shipment using the tracking number above.</p>
      <p>Thank you for your business!</p>
      <hr />
      <p style="color: #666; font-size: 12px;">Centivon | Demo B2B Portal</p>
    </div>
  `,

  quoteRejected: (customerName: string, quoteId: string, reason?: string) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #ef4444;">Quote Update</h1>
      <p>Hello ${customerName},</p>
      <p>We regret to inform you that your quote (ID: ${quoteId}) could not be approved at this time.</p>
      ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
      <p>Please feel free to contact us if you have any questions or would like to discuss alternative options.</p>
      <p>Thank you for your understanding.</p>
      <hr />
      <p style="color: #666; font-size: 12px;">Centivon | Demo B2B Portal</p>
    </div>
  `,
}
