import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

export const supabaseReady = !!supabase;

// Helper to upload pack images to Supabase Storage
export async function uploadPackImage(file) {
  if (!supabase) throw new Error('Supabase not configured');
  
  const fileExt = file.name.split('.').pop();
  const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
  const filePath = `pack-images/${fileName}`;

  const { data, error } = await supabase.storage
    .from('gallery')
    .upload(filePath, file);

  if (error) throw error;

  const { data: { publicUrl } } = supabase.storage
    .from('gallery')
    .getPublicUrl(filePath);

  return publicUrl;
}

// Global Discovery helpers
export async function fetchAllPublicPacks() {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('packs')
    .select(`
      id, name, description, created_at, is_official,
      items:pack_items(id, name, imageUrl:image_url)
    `)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createPack(name, description, isOfficial = false) {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase
    .from('packs')
    .insert({ name, description, is_official: isOfficial })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function addPackItem(packId, name, imageUrl, position) {
  if (!supabase) return;
  const { error } = await supabase
    .from('pack_items')
    .insert({ pack_id: packId, name, image_url: imageUrl, position });
  
  if (error) throw error;
}
