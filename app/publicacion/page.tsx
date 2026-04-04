import { supabase } from '@/lib/supabase'
import PublicationClient from './PublicationClient'

export default async function PublicacionPage() {
  // Fetch books ready to be published (status 4)
  const { data: books, error } = await supabase
    .from('books')
    .select('*, profiles(id, email, phone)')
    .eq('status_code', 4)

  if (error) {
    return <div style={{ padding: '2rem', color: 'red' }}>Error: {error.message}</div>
  }

  // Group books by user
  const groupedLots: Record<string, { user: any, books: any[] }> = {};

  (books || []).forEach(book => {
    const userId = book.user_id;
    if (!groupedLots[userId]) {
      groupedLots[userId] = {
        user: book.profiles,
        books: []
      };
    }
    groupedLots[userId].books.push(book);
  });

  const lotsArray = Object.values(groupedLots);

  return <PublicationClient initialLots={lotsArray} />
}
