// src/lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase URL or anon key – check your .env.local')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

// Temporary simple types until we regenerate proper ones
export type Product = {
  id: number
  supplier_id: string
  model: string | null
  sku: string
  retail_price: number | null
  weboffer_price: number
  name: string
  name_bg?: string | null
  category: string | null
  manufacturer: string | null
  description: string | null
  description_bg?: string | null
  availability: string | null
  quantity: number
  weight: number | null
  transportational_weight: number | null
  date_expected: string | null
  main_image: string | null
  images: string[]
  is_visible: boolean
  created_at: string
  updated_at: string
}

export type Database = any // we’ll regenerate this properly later