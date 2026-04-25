'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import OrderDetailClient from '../pedidos/[id]/OrderDetailClient';

export default function OrderDrawer({ orderId, onClose }: { orderId: string, onClose: () => void }) {
  const [order, setOrder] = useState<any>(null);
  const [books, setBooks] = useState<any[]>([]);
  const [address, setAddress] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const { data: o } = await supabase.from('orders').select('*').eq('id', orderId).single();
      if (o) {
        setOrder(o);
        if (o.shipping_address_id) {
          const { data: a } = await supabase.from('addresses').select('*').eq('id', o.shipping_address_id).single();
          setAddress(a);
        }
        const { data: b } = await supabase.from('books').select('*').eq('order_id', orderId);
        let enrichedBooks = b || [];
        if (enrichedBooks.length > 0) {
          const userIds = [...new Set(enrichedBooks.map(bk => bk.user_id).filter(Boolean))];
          if (userIds.length > 0) {
            const { data: profiles } = await supabase.from('profiles').select('id, name, phone').in('id', userIds);
            const profileMap: Record<string, any> = (profiles || []).reduce((acc: any, p: any) => ({ ...acc, [p.id]: { name: p.name, phone: p.phone } }), {});
            enrichedBooks = enrichedBooks.map(bk => ({
              ...bk,
              seller_name: profileMap[bk.user_id]?.name || 'Vendedor Desconocido',
              seller_phone: profileMap[bk.user_id]?.phone || ''
            }));
          }
        }
        setBooks(enrichedBooks);
      }
      setLoading(false);
    }
    fetchData();

    // Bloquear scroll del body al abrir
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [orderId]);

  return (
    <>
      <div 
        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000 }} 
        onClick={onClose} 
      />
      <div 
        style={{ 
          position: 'fixed', top: 0, right: 0, bottom: 0, width: '100%', maxWidth: '900px', 
          backgroundColor: '#F5F2E7', zIndex: 1001, overflowY: 'auto', padding: '2rem', 
          boxShadow: '-5px 0 15px rgba(0,0,0,0.1)'
        }}
      >
        <button 
          onClick={onClose} 
          style={{ 
            background: 'none', border: 'none', fontSize: '2rem', cursor: 'pointer', 
            position: 'absolute', top: '1rem', right: '1.5rem', color: '#1B3022' 
          }}
        >
          &times;
        </button>
        {loading ? (
          <div style={{ textAlign: 'center', marginTop: '4rem', fontSize: '1.2rem', color: '#666' }}>Cargando detalles del pedido...</div>
        ) : order ? (
          <div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2rem', color: '#1B3022', fontWeight: 900, marginBottom: '2rem' }}>
              Detalle del Pedido #LL-{order.order_number}
            </h2>
            <OrderDetailClient order={order} books={books} address={address} />
          </div>
        ) : (
          <div style={{ textAlign: 'center', marginTop: '4rem', fontSize: '1.2rem', color: '#c0392b' }}>Pedido no encontrado</div>
        )}
      </div>
    </>
  );
}
