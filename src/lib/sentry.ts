import * as Sentry from '@sentry/react'

type SentryUserContext = {
  userId?: string | null
  tenantId?: string | null
  tenantSlug?: string | null
  role?: string | null
}

type CaptureAppErrorContext = {
  componentStack?: string
  handled?: boolean
  source?: string
}

let sentryEnabled = false

const SENSITIVE_QUERY_KEYS = new Set([
  'access_token',
  'refresh_token',
  'token',
  'invite_token',
  'password',
  'otp',
  'code',
])

function sanitizeUrl(rawUrl: string): string {
  try {
    const url = new URL(rawUrl, window.location.origin)

    for (const key of [...url.searchParams.keys()]) {
      if (SENSITIVE_QUERY_KEYS.has(key.toLowerCase())) {
        url.searchParams.set(key, '[redacted]')
      }
    }

    if ([...SENSITIVE_QUERY_KEYS].some((key) => url.hash.includes(key))) {
      url.hash = '#[redacted]'
    }

    return url.toString()
  } catch {
    return rawUrl
  }
}

export function initSentry(): boolean {
  const dsn = import.meta.env.VITE_SENTRY_DSN?.trim()
  if (!dsn || sentryEnabled) return sentryEnabled

  Sentry.init({
    dsn,
    enabled: true,
    environment: import.meta.env.VITE_APP_ENV || import.meta.env.MODE,
    release: import.meta.env.VITE_APP_VERSION || undefined,
    debug: false,
    sendDefaultPii: false,
    maxBreadcrumbs: 0,
    integrations(defaultIntegrations) {
      return [
        ...defaultIntegrations.filter((integration) => integration.name !== 'Breadcrumbs'),
        // Keep default global error handlers, but disable automatic breadcrumbs so
        // we don't collect console text, form/UI interactions, or request trails
        // that may contain order, customer, invite, or CSV-related data.
        Sentry.breadcrumbsIntegration({
          console: false,
          dom: false,
          fetch: false,
          history: false,
          sentry: false,
          xhr: false,
        }),
      ]
    },
    beforeSend(event) {
      if (event.request?.url) {
        event.request.url = sanitizeUrl(event.request.url)
      }

      if (event.user) {
        event.user = {
          id: event.user.id,
          ip_address: null,
        }
      }

      if (event.request) {
        delete event.request.cookies
        delete event.request.data
        delete event.request.headers
      }

      return event
    },
  })

  sentryEnabled = true
  return true
}

export function setSentryUserContext(context: SentryUserContext): void {
  if (!sentryEnabled || !Sentry.getClient()) return

  const role = context.role || 'anonymous'
  const tenantId = context.tenantId || 'none'
  const tenantSlug = context.tenantSlug || 'none'

  Sentry.setUser(context.userId ? { id: context.userId, ip_address: null } : null)
  Sentry.setTag('role', role)
  Sentry.setTag('tenant_id', tenantId)
  Sentry.setTag('tenant_slug', tenantSlug)
  Sentry.setContext('app', {
    role,
    tenantId: context.tenantId || null,
    tenantSlug: context.tenantSlug || null,
  })
}

export function captureAppError(error: unknown, context?: CaptureAppErrorContext): void {
  if (!sentryEnabled || !Sentry.getClient()) return

  Sentry.withScope((scope) => {
    if (context?.source || context?.handled !== undefined) {
      scope.setContext('app_error', {
        source: context?.source || 'app',
        handled: context?.handled ?? false,
      })
    }

    if (context?.componentStack) {
      scope.setContext('react', {
        componentStack: context.componentStack,
      })
    }

    Sentry.captureException(error)
  })
}
