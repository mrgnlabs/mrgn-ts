import { createClient } from "@supabase/supabase-js";

// Create a singleton instance that will be reused
let supabaseInstance: ReturnType<typeof createClient> | null = null;

export function createBrowserSupabaseClient() {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  // Create Supabase client with proper session configuration
  supabaseInstance = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      flowType: "implicit",
    },
  });

  return supabaseInstance;
}
