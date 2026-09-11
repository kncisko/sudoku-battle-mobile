import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (process.env.SUPABASE_URL || '').trim();
const supabaseServiceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

const SUPABASE_TIMEOUT_MS = 8000;

// Check if Supabase is configured
const isSupabaseConfigured = !!supabaseUrl && !!supabaseServiceKey;

if (!isSupabaseConfigured) {
  console.warn('⚠️  Supabase not configured. Game results will not be tracked.');
  console.warn('   Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables to enable tracking.');
}

/**
 * Custom fetch that aborts at the TCP level if the server doesn't respond
 * within SUPABASE_TIMEOUT_MS. This is more reliable than Promise.race +
 * setTimeout because it cancels the underlying socket, not just the promise.
 */
function fetchWithTimeout(url: RequestInfo | URL, options?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => {
    controller.abort();
    console.warn(`[supabase] fetch aborted after ${SUPABASE_TIMEOUT_MS}ms:`, url.toString().split('?')[0]);
  }, SUPABASE_TIMEOUT_MS);

  return fetch(url, { ...options, signal: controller.signal })
    .finally(() => clearTimeout(id));
}

// Create Supabase client with service role key (for server-side operations)
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseServiceKey, {
      global: { fetch: fetchWithTimeout }
    })
  : null;

export { isSupabaseConfigured };

/**
 * Promise-level timeout kept as a secondary safety net on top of
 * the AbortController in fetchWithTimeout.
 */
export function withTimeout<T>(thenable: PromiseLike<T>, label: string, ms = SUPABASE_TIMEOUT_MS): Promise<T> {
  const promise = Promise.resolve(thenable);
  let timerId: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timerId = setTimeout(
      () => reject(new Error(`[timeout] ${label} did not respond within ${ms}ms`)),
      ms
    );
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timerId));
}
