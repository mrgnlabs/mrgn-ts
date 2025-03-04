import { createClient } from "@supabase/supabase-js";

export function createBrowserSupabaseClient() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      // No need to manually set headers, cookies will be sent automatically
    },
  });

  return supabase;
}
