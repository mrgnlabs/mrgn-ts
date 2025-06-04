// lib/supabase/server.ts (or whatever path you prefer)
import { createPagesServerClient as createHelperClient } from "@supabase/auth-helpers-nextjs";
import { NextApiRequest, NextApiResponse } from "next";

export const createServerSupabaseClient = (req: NextApiRequest, res: NextApiResponse) => {
  return createHelperClient(
    { req, res },
    {
      supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    }
  );
};
