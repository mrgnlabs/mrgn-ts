import { createClient } from "@supabase/supabase-js";

export function createBrowserSupabaseClient() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`, // Use our JWT token
      },
    },
  });

  return supabase;
}
