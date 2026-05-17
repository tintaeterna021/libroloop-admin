import { supabase } from '@/lib/supabase'
import InventoryClient from './InventoryClient'

export const dynamic = 'force-dynamic';

export default async function InventarioPage() {
  // Fetch books with their related user profiles
  const { data: books, error } = await supabase
    .from('books')
    .select('id, user_id, title, sale_price, status_code, internal_comment, created_at, storage_option, original_front_image_url, original_back_image_url, publish_front_image_url, publish_back_image_url, purged_at, profiles(phone)')
    .order('created_at', { ascending: false });

  if (error) {
    return <div style={{ padding: '2rem', color: 'red' }}>Error loading inventory: {error.message}</div>;
  }

  return <InventoryClient initialBooks={(books as any) || []} />;
}
