/**
 * YatraLocal - Application & Supabase Client Configuration (/js/config.js)
 * 
 * NOTE: The anon key is PUBLIC by design. Security is enforced strictly via
 * Supabase Row Level Security (RLS) policies. NEVER put the service_role key here.
 * 
 * Evaluators & Developers:
 * You can replace these with your project credentials or set them via:
 * localStorage.setItem('yl_supabase_url', 'https://xyz.supabase.co');
 * localStorage.setItem('yl_supabase_anon_key', 'eyJhbGciOi...');
 */

const STORAGE_URL = typeof localStorage !== 'undefined' ? localStorage.getItem('yl_supabase_url') : null;
const STORAGE_KEY = typeof localStorage !== 'undefined' ? localStorage.getItem('yl_supabase_anon_key') : null;

export const SUPABASE_CONFIG = {
  url: STORAGE_URL || 'https://jigklgcbttmmvrfevini.supabase.co',
  anonKey: STORAGE_KEY || 'sb_publishable_jT4AgY5-o0KH24KyQdR-4g_ADSZrS7P',
  isConfigured: function() {
    return Boolean(
      this.url && 
      !this.url.includes('yatralocal-demo.supabase.co') && 
      this.anonKey && 
      !this.anonKey.includes('demo-anon-key-placeholder')
    );
  }
};
