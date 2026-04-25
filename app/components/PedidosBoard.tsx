'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import OrderDrawer from './OrderDrawer';

type Order = {
  id: string;
  order_number: number;
  contact_name: string;
  contact_phone: string;
  total_with_shipping: number;
  status_code: number;
  created_at: string;
  payment_confirmed_at: string | null;
  preparation_at: string | null;
  in_transit_at: string | null;
  delivered_at: string | null;
  payment_method: string;
};

const COLUMNS = [
  { id: 1, title: 'Nuevos (Por confirmar pago)', icon: '🟡', bg: '#fffdf0', border: '#ffeaa7' },
  { id: 2, title: 'Preparando (Empaque)', icon: '🔵', bg: '#f0f8ff', border: '#74b9ff' },
  { id: 3, title: 'En Ruta', icon: '🟣', bg: '#f8f0ff', border: '#a29bfe' },
  { id: 4, title: 'Entregados', icon: '🟢', bg: '#f0fff4', border: '#55efc4' },
];

export default function PedidosBoard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    // Ordenamos por fecha de creación descendente para ver los más recientes
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching orders:', error);
    } else {
      setOrders(data || []);
    }
    setLoading(false);
  };

  const advanceOrder = async (orderId: string, currentStatus: number) => {
    const nextStatus = currentStatus + 1;
    if (nextStatus > 4) return;

    let updateData: any = { status_code: nextStatus };
    const now = new Date().toISOString();

    if (nextStatus === 2) {
      updateData.preparation_at = now;
    } else if (nextStatus === 3) {
      updateData.in_transit_at = now;
    } else if (nextStatus === 4) {
      updateData.delivered_at = now;
    }

    const { error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId);

    if (error) {
      alert('Error al actualizar el estado del pedido.');
      return;
    }

    if (nextStatus === 2) {
      await supabase
        .from('books')
        .update({ status_code: 8 })
        .eq('order_id', orderId);
    } else if (nextStatus === 4) {
      await supabase
        .from('books')
        .update({ status_code: 9, paid_to_libroloop_at: now })
        .eq('order_id', orderId);
    }

    // Update local state for immediate feedback
    setOrders(prev =>
      prev.map(o => (o.id === orderId ? { ...o, ...updateData } : o))
    );
  };

  const getOrderDate = (order: Order, status: number) => {
    let dateStr = order.created_at;
    if (status === 2 && order.preparation_at) dateStr = order.preparation_at;
    if (status === 3 && order.in_transit_at) dateStr = order.in_transit_at;
    if (status === 4 && order.delivered_at) dateStr = order.delivered_at;

    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'long'
    });
  };



  if (loading) {
    return <div style={{ textAlign: 'center', padding: '2rem' }}>Cargando tablero de pedidos...</div>;
  }

  return (
    <section>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, minmax(280px, 1fr))',
        gap: '1.5rem',
        alignItems: 'start',
        overflowX: 'auto',
        paddingBottom: '1rem', // Give space for the scrollbar
      }}>
        {COLUMNS.map((col) => {
          const colOrders = orders.filter(o => o.status_code === col.id);

          return (
            <div
              key={col.id}
              style={{
                backgroundColor: col.bg,
                border: `1px solid ${col.border}`,
                borderRadius: '12px',
                padding: '1rem',
                minHeight: '600px',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem'
              }}
            >
              <h3 style={{
                fontFamily: "'Montserrat', sans-serif",
                fontWeight: 700,
                fontSize: '1rem',
                color: '#333',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '0.5rem',
                borderBottom: `2px solid ${col.border}`,
                paddingBottom: '0.5rem'
              }}>
                <span>{col.icon}</span> {col.title} <span style={{ marginLeft: 'auto', backgroundColor: '#fff', borderRadius: '12px', padding: '0.1rem 0.5rem', fontSize: '0.8rem', opacity: 0.7 }}>{colOrders.length}</span>
              </h3>

              {colOrders.map(order => (
                <div
                  key={order.id}
                  style={{
                    backgroundColor: 'white',
                    borderRadius: '8px',
                    padding: '1rem',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                    borderLeft: `4px solid ${col.border}`
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 800, color: '#1B3022', fontFamily: "'Montserrat', sans-serif" }}>
                      #LL-{order.order_number}
                    </span>
                    <span style={{ fontSize: '0.85rem', color: '#555', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      🕒 {getOrderDate(order, col.id)}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: col.id < 4 ? '1fr 1fr' : '1fr', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <button
                      onClick={() => setSelectedOrderId(order.id)}
                      style={{
                        backgroundColor: '#3498db',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '0.5rem',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.3rem',
                        transition: 'opacity 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                      onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                    >
                      📄 Detalle
                    </button>

                    {col.id < 4 && (
                      <button
                        onClick={() => advanceOrder(order.id, col.id)}
                        style={{
                          backgroundColor: '#1B3022',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '0.5rem',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'opacity 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                        onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                      >
                        Avanzar ➔
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {colOrders.length === 0 && (
                <div style={{ textAlign: 'center', color: '#999', fontSize: '0.85rem', marginTop: '1rem' }}>
                  Sin pedidos
                </div>
              )}
            </div>
          );
        })}
      </div>

      {selectedOrderId && (
        <OrderDrawer orderId={selectedOrderId} onClose={() => setSelectedOrderId(null)} />
      )}
    </section>
  );
}
