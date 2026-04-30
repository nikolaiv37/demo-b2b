import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

function readText(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8')
}

function readJson(relativePath) {
  return JSON.parse(readText(relativePath))
}

function getValue(object, dottedPath) {
  return dottedPath.split('.').reduce((current, key) => current?.[key], object)
}

function extractMatches(source, regex) {
  return [...source.matchAll(regex)].map((match) => match[1]).filter(Boolean)
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

const en = readJson('src/locales/en.json').common
const bg = readJson('src/locales/bg.json').common

const filesToScan = [
  'src/app/auth/login.tsx',
  'src/components/SidebarNav.tsx',
  'src/app/dashboard/orders/index.tsx',
  'src/app/dashboard/clients/index.tsx',
  'src/app/dashboard/settings/index.tsx',
  'src/app/dashboard/csv-import/index.tsx',
  'src/App.tsx',
]

const translationKeyPatterns = [
  /t\(\s*['"]([A-Za-z0-9_.-]+)['"]/g,
  /titleKey:\s*['"]([A-Za-z0-9_.-]+)['"]/g,
  /pageTitleKeys:[\s\S]*?=\s*\{([\s\S]*?)\n\}/g,
]

const discoveredKeys = new Set()

for (const relativePath of filesToScan) {
  const source = readText(relativePath)

  for (const key of extractMatches(source, translationKeyPatterns[0])) {
    if (key.includes('.')) {
      discoveredKeys.add(key)
    }
  }

  for (const key of extractMatches(source, translationKeyPatterns[1])) {
    if (key.includes('.')) {
      discoveredKeys.add(key)
    }
  }

  const mapBlock = extractMatches(source, translationKeyPatterns[2])[0]
  if (mapBlock) {
    for (const key of extractMatches(mapBlock, /:\s*['"]([A-Za-z0-9_.-]+)['"]/g)) {
      if (key.includes('.')) {
        discoveredKeys.add(key)
      }
    }
  }
}

for (const key of discoveredKeys) {
  assert(getValue(en, key) !== undefined, `Missing EN translation key: ${key}`)
  assert(getValue(bg, key) !== undefined, `Missing BG translation key: ${key}`)
}

const featuresSource = readText('src/config/features.ts')
const sidebarSource = readText('src/components/SidebarNav.tsx')

assert(featuresSource.includes('analyticsVisible: false'), 'Expected analyticsVisible to remain false')
assert(
  featuresSource.includes('manageCategoriesSidebarVisible: false'),
  'Expected manageCategoriesSidebarVisible to remain false',
)
assert(featuresSource.includes('csvImportVisible: true'), 'Expected csvImportVisible to remain true')
assert(
  featuresSource.includes('csvImportSidebarVisible: true'),
  'Expected csvImportSidebarVisible to remain true',
)

assert(
  sidebarSource.includes("feature: 'analyticsVisible'"),
  'Sidebar should gate analytics link behind analyticsVisible',
)
assert(
  sidebarSource.includes("feature: 'manageCategoriesSidebarVisible'"),
  'Sidebar should gate manage categories link behind manageCategoriesSidebarVisible',
)
assert(
  sidebarSource.includes("href: '/dashboard/clients'") && sidebarSource.includes('adminOnly: true'),
  'Clients nav item should remain adminOnly',
)
assert(
  sidebarSource.includes('isAdmin && demoFeatures.csvImportVisible && demoFeatures.csvImportSidebarVisible'),
  'CSV Product Import should remain admin-only in the sidebar',
)

const requiredSmokeKeys = [
  'nav.csvImport',
  'settings.profileSettings',
  'settings.saveProfile',
  'orders.title',
  'distributors.title',
  'csvImport.pageTitle',
  'auth.email',
]

for (const key of requiredSmokeKeys) {
  assert(getValue(en, key) !== undefined, `Critical EN key missing: ${key}`)
  assert(getValue(bg, key) !== undefined, `Critical BG key missing: ${key}`)
}

console.log(`Smoke checks passed: ${discoveredKeys.size} translation keys verified across ${filesToScan.length} files.`)
