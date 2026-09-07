import { createBrowserClient } from '@supabase/ssr'
import { getSupabaseConfig } from './config'
import type { Database } from './database.types'

// Single browser client for the whole app. createBrowserClient memoises
// internally, but keeping one module-level instance also keeps a single auth
// state listener and one realtime socket.
const { url, anonKey } = getSupabaseConfig()

export const supabase = createBrowserClient<Database>(url, anonKey)

export type SupabaseClient = typeof supabase
