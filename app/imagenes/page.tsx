import { supabase } from '@/lib/supabase'
import ImagenesClient from './ImagenesClient'
import Link from 'next/link'

export default async function ImagenesPage() {
  // Libros en status 5 = Listos para imágenes
  const { data: books, error } = await supabase
    .from('books')
    .select('id, title, author, original_front_image_url, publish_front_image_url, publish_back_image_url, link_amazon, link_gandhi, link_buscalibre, link_sotano, user_id')
    .eq('status_code', 5)
    .order('published_at', { ascending: true })

  if (error) {
    return <div style={{ padding: '2rem', color: 'red' }}>Error: {error.message}</div>
  }

  if (!books || books.length === 0) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#F5F2E7', padding: '3rem 2rem', fontFamily: "'Montserrat', sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '4rem', textAlign: 'center', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', maxWidth: '500px' }}>
          <p style={{ fontSize: '3rem', margin: '0 0 1rem' }}>🎉</p>
          <h2 style={{ fontSize: '1.4rem', color: '#1B3022', fontWeight: 800, marginBottom: '0.5rem' }}>¡Sin pendientes!</h2>
          <p style={{ color: '#888', marginBottom: '2rem' }}>No hay libros esperando imágenes de publicación.</p>
          <Link href="/publicacion" style={{ backgroundColor: '#1B3022', color: 'white', padding: '0.8rem 1.5rem', borderRadius: '8px', textDecoration: 'none', fontWeight: 700, fontSize: '0.9rem' }}>
            Ir a Publicación
          </Link>
        </div>
      </div>
    )
  }

  return <ImagenesClient books={books} />
}
