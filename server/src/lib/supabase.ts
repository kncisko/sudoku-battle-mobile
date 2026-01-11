import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Check if Supabase is configured
const isSupabaseConfigured = !!supabaseUrl && !!supabaseServiceKey;

if (!isSupabaseConfigured) {
  console.warn('⚠️  Supabase not configured. Game results will not be tracked.');
  console.warn('   Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables to enable tracking.');
}

// Create Supabase client with service role key (for server-side operations)
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

export { isSupabaseConfigured };
