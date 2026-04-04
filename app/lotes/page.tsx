import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default async function LotesPage() {
  // Fetch books in review (status 1)
  const { data: books, error } = await supabase
    .from('books')
    .select('*, profiles(id, email, phone)')
    .eq('status_code', 1)

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

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F5F2E7', padding: '3rem 2rem', fontFamily: "'Montserrat', sans-serif" }}>
      <header style={{ maxWidth: '1100px', margin: '0 auto 3rem' }}>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2.5rem', color: '#1B3022', fontWeight: 900, marginBottom: '0.5rem' }}>Aprobación de Lotes</h1>
        <p style={{ color: '#666', fontSize: '0.95rem' }}>Lotes recibidos pendientes de tu revisión masiva y asignación de precios.</p>
      </header>

      <main style={{ maxWidth: '1100px', margin: '0 auto' }}>
        {lotsArray.length === 0 ? (
          <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '4rem', textAlign: 'center', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
             <p style={{ fontSize: '1.2rem', color: '#888', margin: 0 }}>No hay lotes pendientes de revisión actualmente. ¡Todo al día! 🎉</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {lotsArray.map((lot, index) => (
              <div key={index} style={{ 
                backgroundColor: 'white', borderRadius: '16px', padding: '2rem', 
                boxShadow: '0 4px 15px rgba(0,0,0,0.03)', display: 'flex', 
                alignItems: 'center', justifyContent: 'space-between',
                borderLeft: '5px solid #f39c12'
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1B3022', margin: 0 }}>
                      Lote de Venta
                    </h2>
                    <span style={{ backgroundColor: '#fcf3e3', color: '#f39c12', fontSize: '0.75rem', fontWeight: 800, padding: '0.3rem 0.8rem', borderRadius: '999px', textTransform: 'uppercase' }}>
                      En revisión
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <p style={{ fontSize: '1.1rem', color: '#1A1A1A', fontWeight: 600, margin: 0 }}>
                       Vendedor: <span style={{ fontWeight: 800 }}>{lot.user?.email || 'Desconocido'}</span> 
                    </p>
                    {lot.user?.phone && (
                      <a 
                        href={`https://wa.me/${lot.user.phone.replace(/\\D/g, '')}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', backgroundColor: '#25D366', color: 'white', padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 700, textDecoration: 'none' }}
                      >
                        WhatsApp
                      </a>
                    )}
                  </div>
                  <p style={{ fontSize: '0.95rem', color: '#888', margin: 0, fontWeight: 500 }}>
                    📚 Contiene <strong style={{ color: '#1B3022' }}>{lot.books.length}</strong> libro{lot.books.length !== 1 ? 's' : ''} esperando validación.
                  </p>
                </div>

                <Link href={`/lotes/${lot.user.id}`} style={{ 
                  backgroundColor: '#1B3022', color: 'white', padding: '0.9rem 1.8rem', 
                  borderRadius: '999px', textDecoration: 'none', fontWeight: 700, 
                  fontSize: '0.85rem', letterSpacing: '0.05em'
                }}>
                  VER DETALLE →
                </Link>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
