export const dynamic = 'force-dynamic';

import { supabase } from '@/lib/supabase'
import LotViewer from './LotViewer'
import Link from 'next/link'

export default async function LoteDetallePage({ params }: { params: Promise<{ user_id: string }> }) {
  
  const resolvedParams = await params;
  const userId = resolvedParams.user_id;

  const { data: books, error } = await supabase
    .from('books')
    .select('*')
    .eq('user_id', userId)
    .eq('status_code', 1)
    .order('created_at', { ascending: true })

  if (error) {
    return <div style={{ padding: '2rem', color: 'red' }}>Error cargando el lote: {error.message}</div>
  }

  if (!books || books.length === 0) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#F5F2E7', padding: '3rem 2rem', fontFamily: "'Montserrat', sans-serif" }}>
        <main style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center', backgroundColor: 'white', padding: '4rem', borderRadius: '16px' }}>
          <h2 style={{ fontSize: '1.5rem', color: '#1B3022', marginBottom: '1rem' }}>No hay libros pendientes.</h2>
          <p style={{ color: '#666', marginBottom: '2rem' }}>Posiblemente este lote ya fue procesado en su totalidad.</p>
          <Link href="/lotes" style={{ backgroundColor: '#1B3022', color: 'white', padding: '0.8rem 1.5rem', borderRadius: '8px', textDecoration: 'none', fontWeight: 600 }}>
            VOLVER A LOTES
          </Link>
        </main>
      </div>
    )
  }

  return (
      <LotViewer serverBooks={books} />
  )
}
