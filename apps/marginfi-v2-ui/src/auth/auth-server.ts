import { createClient } from '@supabase/supabase-js'

export const createServerSupabaseClient = () => 
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!, 
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )