import { createClient } from '@supabase/supabase-js';

// Retrieve config from env or localStorage override
export const getSupabaseConfig = () => {
  const envUrl = import.meta.env.VITE_SUPABASE_URL;
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const localUrl = localStorage.getItem('mla_supabase_url');
  const localKey = localStorage.getItem('mla_supabase_key');

  const envUrlOk = envUrl && envUrl !== 'your_supabase_project_url' ? envUrl : '';
  const envKeyOk = envKey && envKey !== 'your_supabase_anon_public_key' ? envKey : '';
  // Build-time environment config takes priority; a stored override is only a fallback.
  const url = envUrlOk || localUrl || '';
  const key = envKeyOk || localKey || '';

  return {
    url: url.trim(),
    key: key.trim(),
    isConfigured: Boolean(url && key && url.startsWith('http') && key.length > 20)
  };
};

export const saveSupabaseConfig = (url, key) => {
  if (url) localStorage.setItem('mla_supabase_url', url.trim());
  if (key) localStorage.setItem('mla_supabase_key', key.trim());
};

export const clearSupabaseConfig = () => {
  localStorage.removeItem('mla_supabase_url');
  localStorage.removeItem('mla_supabase_key');
};

const config = getSupabaseConfig();

// Safe fallback URL/Key so createClient doesn't crash on initial load before config is supplied
const defaultUrl = config.url || 'https://placeholder.supabase.co';
const defaultKey = config.key || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholder';

export let supabase = createClient(defaultUrl, defaultKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
});

export const reinitializeSupabase = (url, key) => {
  saveSupabaseConfig(url, key);
  supabase = createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    }
  });
  return supabase;
};

// Currency Formatter for Indian Rupees (₹)
export const formatINR = (amount) => {
  const num = Number(amount) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
    minimumFractionDigits: 0
  }).format(num);
};
