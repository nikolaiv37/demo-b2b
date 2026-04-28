export const demoFeatures = {
  econt: false,
  stripeBilling: false,
  unpaidBalances: false,
  legacyQuotes: false,
  platformConsoleVisible: false,
  csvImportVisible: true,
  complaintsVisible: true,
  analyticsVisible: true,
} as const

export type DemoFeature = keyof typeof demoFeatures

export function isFeatureEnabled(feature: DemoFeature): boolean {
  return demoFeatures[feature]
}

export function isLocalDemoHost(hostname = window.location.hostname): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.local')
}

export function isUnsafeDevModeEnabled(): boolean {
  return import.meta.env.VITE_DEV_MODE === 'true' && !isLocalDemoHost()
}

export function isLocalDevModeEnabled(): boolean {
  return import.meta.env.VITE_DEV_MODE === 'true' && isLocalDemoHost()
}

export function assertSafeDemoRuntime(): void {
  if (isUnsafeDevModeEnabled()) {
    throw new Error('Unsafe demo configuration: VITE_DEV_MODE=true is only allowed on localhost or *.local hosts.')
  }
}
