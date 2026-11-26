import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  'https://azvpkkxbtnbbgpyvzbuw.supabase.co',
  'sb_publishable_Q6CYqtwDRngF4TZXebFZ3g_3DIIl-5Z',
  { auth: { persistSession: true, autoRefreshToken: true } }
);

export async function uploadImage(file) {
  if (!file?.type.startsWith('image/')) throw new Error('Choose an image file.');
  if (file.size > 10 * 1024 * 1024) throw new Error('Images must be smaller than 10 MB.');
  const extension = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const path = `${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from('site-images').upload(path, file, {
    contentType: file.type, upsert: false
  });
  if (error) throw error;
  return supabase.storage.from('site-images').getPublicUrl(path).data.publicUrl;
}
