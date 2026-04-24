import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import OrderDetailClient from './OrderDetailClient'

export const dynamic = 'force-dynamic';

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const orderId = resolvedParams.id;

  // 1. Fetch Order
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single();

  if (orderError || !order) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#F5F2E7', padding: '3rem 2rem', fontFamily: "'Montserrat', sans-serif", textAlign: 'center' }}>
        <h2 style={{ color: '#c0392b', marginBottom: '1rem' }}>Pedido no encontrado</h2>
        <Link href="/pedidos" style={{ color: '#1B3022', fontWeight: 800 }}>← Volver al tablero</Link>
      </div>
    );
  }

  // 1.5 Fetch Shipping Address
  let address = null;
  if (order.shipping_address_id) {
    const { data: addrData } = await supabase
      .from('addresses')
      .select('*')
      .eq('id', order.shipping_address_id)
      .single();
    if (addrData) address = addrData;
  }

  // 2. Fetch Books for this order
  const { data: books, error: booksError } = await supabase
    .from('books')
    .select('*')
    .eq('order_id', orderId);

  if (booksError) {
    console.error('Error fetching books for order:', booksError);
  }

  let enrichedBooks = books || [];
  if (enrichedBooks.length > 0) {
    const userIds = [...new Set(enrichedBooks.map(b => b.user_id).filter(Boolean))];
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, phone')
        .in('id', userIds);
      
      const profileMap = (profiles || []).reduce((acc, p) => ({ ...acc, [p.id]: { name: p.name, phone: p.phone } }), {});
      
      enrichedBooks = enrichedBooks.map(b => ({
        ...b,
        seller_name: profileMap[b.user_id]?.name || 'Vendedor Desconocido',
        seller_phone: profileMap[b.user_id]?.phone || ''
      }));
    }
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F5F2E7', padding: '3rem 2rem', fontFamily: "'Montserrat', sans-serif" }}>
      <header style={{ maxWidth: '1000px', margin: '0 auto 2rem' }}>
        <Link href="/pedidos" style={{ background: 'none', border: 'none', color: '#1B3022', fontWeight: 800, cursor: 'pointer', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', padding: 0, textDecoration: 'none' }}>
          ← Volver al Tablero
        </Link>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2.5rem', color: '#1B3022', fontWeight: 900, marginBottom: '0.5rem' }}>
          Detalle del Pedido #LL-{order.order_number}
        </h1>
        <p style={{ color: '#666', fontSize: '0.95rem' }}>
          Información de contacto, envío y artículos incluidos.
        </p>
      </header>

      <main style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <OrderDetailClient order={order} books={enrichedBooks} address={address} />
      </main>
    </div>
  )
}
