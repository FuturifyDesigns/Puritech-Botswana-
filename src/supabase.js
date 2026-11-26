import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  'https://azvpkkxbtnbbgpyvzbuw.supabase.co',
  'sb_publishable_Q6CYqtwDRngF4TZXebFZ3g_3DIIl-5Z',
  { auth: { persistSession: true, autoRefreshToken: true } }
);

export async function uploadImage(file) {
  const accepted = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };
  if (!file || !accepted[file.type]) throw new Error('Choose a JPG, PNG, WebP or GIF image.');
  if (!file.size) throw new Error('The image file is empty.');
  if (file.size > 10 * 1024 * 1024) throw new Error('Images must be smaller than 10 MB.');
  const path = `${crypto.randomUUID()}.${accepted[file.type]}`;
  const { error } = await supabase.storage.from('site-images').upload(path, file, {
    contentType: file.type, upsert: false
  });
  if (error) throw error;
  return supabase.storage.from('site-images').getPublicUrl(path).data.publicUrl;
}
