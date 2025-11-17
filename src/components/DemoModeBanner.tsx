import { AlertCircle } from 'lucide-react'
import { GlassCard } from './GlassCard'

export function DemoModeBanner() {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
  
  // Only show if using placeholder credentials
  if (!supabaseUrl.includes('placeholder')) {
    return null
  }

  return (
    <GlassCard className="border-yellow-500/50 bg-yellow-500/10">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-semibold text-yellow-900 dark:text-yellow-200 mb-1">
            🎨 Demo Mode - UI Preview Only
          </h3>
          <p className="text-sm text-yellow-800 dark:text-yellow-300 mb-2">
            You're viewing the UI with placeholder credentials. Auth and database features won't work yet.
          </p>
          <div className="text-xs text-yellow-700 dark:text-yellow-400 space-y-1">
            <p><strong>To enable full functionality:</strong></p>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>Create a Supabase project at <a href="https://supabase.com" target="_blank" rel="noopener" className="underline">supabase.com</a></li>
              <li>Run the database schema from <code className="bg-black/20 px-1 rounded">supabase/schema.sql</code></li>
              <li>Update <code className="bg-black/20 px-1 rounded">.env</code> with your real credentials</li>
              <li>Restart the dev server</li>
            </ol>
          </div>
        </div>
      </div>
    </GlassCard>
  )
}

