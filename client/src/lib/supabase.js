import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Graceful degradation: if no Supabase credentials, return a mock client
const isMissingCredentials =
  !supabaseUrl ||
  !supabaseAnonKey ||
  supabaseUrl.includes('your-project') ||
  supabaseAnonKey.includes('your-anon-key');

export const supabase = isMissingCredentials
  ? null
  : createClient(supabaseUrl, supabaseAnonKey);

export const supabaseReady = !isMissingCredentials;

// ─── Storage helpers ──────────────────────────────────────────────────────────
const BUCKET = 'pack-images';

export async function uploadPackImage(file) {
  if (!supabase) throw new Error('Supabase not configured');
  const ext = file.name.split('.').pop();
  const path = `uploads/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file);
  if (error) throw error;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function createPack(name, ownerUsername) {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase
    .from('packs')
    .insert({ name, owner_username: ownerUsername })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function addPackItem(packId, name, imageUrl, position) {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase
    .from('pack_items')
    .insert({ pack_id: packId, name, image_url: imageUrl, position })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function fetchUserPacks(username) {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('packs')
    .select('*, pack_items(*)')
    .eq('owner_username', username)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}
