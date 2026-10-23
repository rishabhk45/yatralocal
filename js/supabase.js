/**
 * YatraLocal - Supabase Client Bridge (/js/supabase.js)
 * 
 * Powered by official @supabase/supabase-js (v2.48.1 pinned).
 * Provides resilient initialization with offline/local fallback.
 */

import { SUPABASE_CONFIG } from './config.js';

let supabaseInstance = null;
let isOnline = false;

// Pinned Supabase ESM CDN
const CDN_URL = 'https://esm.sh/@supabase/supabase-js@2.48.1';

/**
 * Initializes and returns the Supabase client
 */
export async function getSupabase() {
  if (supabaseInstance) return supabaseInstance;

  // 1. Check if configured with real project credentials
  if (!SUPABASE_CONFIG.isConfigured()) {
    return createLocalFallbackClient();
  }

  try {
    let createClient;
    if (typeof window !== 'undefined' && window.supabase && window.supabase.createClient) {
      createClient = window.supabase.createClient;
    } else {
      // Dynamic import from pinned CDN
      const mod = await import(CDN_URL);
      createClient = mod.createClient;
    }

    if (createClient) {
      supabaseInstance = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      });
      isOnline = true;
      return supabaseInstance;
    }
  } catch (err) {
    console.warn('[YatraLocal] Supabase CDN/network connection unavailable; engaging offline fallback:', err.message);
  }

  return createLocalFallbackClient();
}

/**
 * Fallback client for offline exploration, demos, and testing
 */
function createLocalFallbackClient() {
  if (supabaseInstance) return supabaseInstance;

  const getStorageUser = () => {
    try {
      const u = localStorage.getItem('yl_demo_auth_user');
      return u ? JSON.parse(u) : null;
    } catch (_) {
      return null;
    }
  };

  supabaseInstance = {
    _isFallback: true,
    auth: {
      getUser: async () => ({ data: { user: getStorageUser() }, error: null }),
      getSession: async () => {
        const u = getStorageUser();
        return { data: { session: u ? { user: u } : null }, error: null };
      },
      onAuthStateChange: (callback) => {
        const u = getStorageUser();
        if (u) callback('SIGNED_IN', { user: u });
        return { data: { subscription: { unsubscribe: () => {} } } };
      },
      signUp: async ({ email, password, options }) => {
        const fakeUser = {
          id: 'usr_' + Math.random().toString(36).substring(2, 10),
          email,
          user_metadata: { name: (options && options.data && options.data.name) || email.split('@')[0] }
        };
        localStorage.setItem('yl_demo_auth_user', JSON.stringify(fakeUser));
        return { data: { user: fakeUser, session: { user: fakeUser } }, error: null };
      },
      signInWithPassword: async ({ email, password }) => {
        const fakeUser = {
          id: 'usr_' + Math.random().toString(36).substring(2, 10),
          email,
          user_metadata: { name: email.split('@')[0] }
        };
        localStorage.setItem('yl_demo_auth_user', JSON.stringify(fakeUser));
        return { data: { user: fakeUser, session: { user: fakeUser } }, error: null };
      },
      signOut: async () => {
        localStorage.removeItem('yl_demo_auth_user');
        return { error: null };
      }
    },
    from: (table) => {
      return {
        select: (cols) => {
          return {
            eq: function(field, val) {
              return this;
            },
            order: function(field, opts) {
              return this;
            },
            then: async (resolve) => {
              // Return seed or local reviews for demos
              let stored = [];
              try {
                stored = JSON.parse(localStorage.getItem('yl_reviews') || '[]');
              } catch (_) {}
              resolve({ data: stored, error: null });
            }
          };
        },
        insert: async (rows) => {
          let list = [];
          try {
            list = JSON.parse(localStorage.getItem('yl_reviews') || '[]');
          } catch (_) {}

          const toInsert = Array.isArray(rows) ? rows : [rows];
          for (const row of toInsert) {
            const exists = list.some(r => r.user_id === row.user_id && r.place_key === row.place_key && r.target_type === row.target_type);
            if (exists) {
              return { data: null, error: { code: '23505', message: 'duplicate key value violates unique constraint "unique_user_target_review"' } };
            }
          }

          const newEntries = toInsert.map(r => ({
            id: 'rev_' + Math.random().toString(36).substring(2, 10),
            created_at: new Date().toISOString(),
            ...r
          }));
          list.unshift(...newEntries);
          localStorage.setItem('yl_reviews', JSON.stringify(list));
          return { data: newEntries, error: null };
        },
        update: (values) => {
          const chain = {
            eq: function() { return this; },
            then: function(resolve) { resolve({ data: [values], error: null }); }
          };
          return chain;
        },
        delete: () => {
          const chain = {
            eq: function() { return this; },
            then: function(resolve) { resolve({ data: [], error: null }); }
          };
          return chain;
        }
      };
    }
  };

  return supabaseInstance;
}
