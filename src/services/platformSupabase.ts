import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) ||
  'https://fwjsxknbdkxzkoxvuncp.supabase.co';

const supabaseKey =
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ||
  'sb_publishable_D2_QLrItrkQ2Ksx7aiU8gg_yXqguL4C';

export const platformSupabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: window.location.pathname === '/atr-control',
    storageKey: 'adega_pro_platform_admin_auth'
  }
});
