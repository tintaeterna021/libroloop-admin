export const dynamic = 'force-dynamic';

import { supabase } from '@/lib/supabase'
import PublicationViewer from './PublicationViewer'
import Link from 'next/link'

export default async function PublicationDetailPage({ params }: { params: Promise<{ user_id: string }> }) {
  
  const resolvedParams = await params;
  const userId = resolvedParams.user_id;

  const { data: books, error } = await supabase
    .from('books')
    .select('*, profiles:user_id(email, phone)')
    .eq('user_id', userId)
    .eq('status_code', 4) // Solo libros aprobados
    .order('created_at', { ascending: true })

  if (error) {
    return <div style={{ padding: '2rem', color: 'red' }}>Error cargando los libros aprobados: {error.message}</div>
  }

  if (!books || books.length === 0) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#F5F2E7', padding: '3rem 2rem', fontFamily: "'Montserrat', sans-serif" }}>
        <main style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center', backgroundColor: 'white', padding: '4rem', borderRadius: '16px' }}>
          <h2 style={{ fontSize: '1.5rem', color: '#1B3022', marginBottom: '1rem' }}>No hay libros listos para publicar de este usuario.</h2>
          <p style={{ color: '#666', marginBottom: '2rem' }}>O ya fueron publicados o no tienen status 4 (Aprobados).</p>
          <Link href="/publicacion" style={{ backgroundColor: '#1B3022', color: 'white', padding: '0.8rem 1.5rem', borderRadius: '8px', textDecoration: 'none', fontWeight: 600 }}>
            VOLVER A PUBLICACIÓN
          </Link>
        </main>
      </div>
    )
  }

  return (
      <PublicationViewer serverBooks={books} />
  )
}
