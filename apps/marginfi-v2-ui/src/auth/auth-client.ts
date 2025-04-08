import { createClient } from "@supabase/supabase-js";

// Create a singleton instance that will be reused
let supabaseInstance: ReturnType<typeof createClient> | null = null;

export function createBrowserSupabaseClient() {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  supabaseInstance = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      // No need to manually set headers, cookies will be sent automatically
    },
  });

  return supabaseInstance;
}
