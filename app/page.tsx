export const dynamic = 'force-dynamic';

import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default async function AdminDashboard() {

  // 1. Ventas Totales y Pedidos Pendientes
  // Limitamos el query sin paginación masiva por ahora para la prueba, ideal en producción usar sumatorias SQL RPC
  const { data: orders } = await supabase.from('orders').select('total_with_shipping, status_code')

  let ventasTotales = 0;
  let pedidosPendientes = 0;

  if (orders) {
    orders.forEach(o => {
      ventasTotales += Number(o.total_with_shipping) || 0;
      // 4 es "entregado", cualquier cosa antes de eso es "pendiente de despachar / en ruta"
      if (o.status_code < 4) {
        pedidosPendientes++;
      }
    })
  }

  // 3. Lotes nuevos (En revisión): books with status_code = 1
  const { count: lotesRevision } = await supabase.from('books').select('*', { count: 'exact', head: true }).eq('status_code', 1)

  // 4. Libros Totales (Publicados activos con imágenes): books with status_code = 6
  const { count: librosActivos } = await supabase.from('books').select('*', { count: 'exact', head: true }).eq('status_code', 6)

  // 5. Libros pendientes de imágenes: status_code = 5
  const { count: librosPendientesImagenes } = await supabase.from('books').select('*', { count: 'exact', head: true }).eq('status_code', 5)

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F5F2E7', padding: '3rem 2rem', fontFamily: "'Montserrat', sans-serif" }}>
      
      {/* Fila 0: Header y tarjetas principales (Ventas y Activos) */}
      <header style={{ maxWidth: '1100px', margin: '0 auto 3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '2rem' }}>
        <div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2.5rem', color: '#1B3022', fontWeight: 900, marginBottom: '0.5rem' }}>Dashboard Principal</h1>
          <p style={{ color: '#666', fontSize: '0.95rem' }}>Resumen operativo de hoy. Tienes lo vital a un vistazo.</p>
        </div>
        
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
          {/* Tarjeta 1 - Ventas Totales */}
          <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 4px 6px rgba(0,0,0,0.03)', borderLeft: '5px solid #1B3022', minWidth: '220px' }}>
            <p style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '0.8rem', color: '#888', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Ventas Totales</p>
            <p style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '2.5rem', color: '#1B3022', fontWeight: 900 }}>
              ${ventasTotales.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.5rem' }}>Ingresos consolidados</p>
          </div>

          {/* Tarjeta 4 - Activos */}
          <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 4px 6px rgba(0,0,0,0.03)', borderLeft: '5px solid #2980b9', minWidth: '220px' }}>
            <p style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '0.8rem', color: '#888', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Libros Activos</p>
            <p style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '2.5rem', color: '#2980b9', fontWeight: 900 }}>
              {librosActivos || 0}
            </p>
            <p style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.5rem' }}>Ejemplares disponibles públicos</p>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: '1100px', margin: '0 auto' }}>
        
        {/* Fila 1: Lotes esperando aprobación y Pendientes de imagen */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
          {/* Tarjeta 3 - Lotes */}
          <Link href="/lotes" style={{ textDecoration: 'none', display: 'block' }}>
            <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 4px 6px rgba(0,0,0,0.03)', borderLeft: '5px solid #f39c12', height: '100%' }}>
              <p style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '0.8rem', color: '#888', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Lotes Esperando Aprobación</p>
              <p style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '2.5rem', color: '#f39c12', fontWeight: 900 }}>
                {lotesRevision || 0}
              </p>
              <p style={{ fontSize: '0.75rem', color: '#f39c12', marginTop: '0.5rem', fontWeight: 600 }}>Nuevos ejemplares por revisar</p>
            </div>
          </Link>

          {/* Tarjeta 5 - Pendientes de imagen */}
          <Link href="/imagenes" style={{ textDecoration: 'none', display: 'block' }}>
            <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 4px 6px rgba(0,0,0,0.03)', borderLeft: '5px solid #8e44ad', height: '100%' }}>
              <p style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '0.8rem', color: '#888', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Pendientes de Imagen</p>
              <p style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '2.5rem', color: '#8e44ad', fontWeight: 900 }}>
                {librosPendientesImagenes || 0}
              </p>
              <p style={{ fontSize: '0.75rem', color: '#8e44ad', marginTop: '0.5rem', fontWeight: 600 }}>Sin foto de publicación aún</p>
            </div>
          </Link>
        </div>

        {/* Fila 2: Pedidos Pendientes */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem', marginBottom: '3rem' }}>
          {/* Tarjeta 2 - Pedidos Pendientes */}
          <Link href="/pedidos" style={{ textDecoration: 'none', display: 'block' }}>
            <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 4px 6px rgba(0,0,0,0.03)', borderLeft: '5px solid #c0392b', height: '100%' }}>
              <p style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '0.8rem', color: '#888', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Pedidos Pendientes</p>
              <p style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '2.5rem', color: '#c0392b', fontWeight: 900 }}>
                {pedidosPendientes}
              </p>
              <p style={{ fontSize: '0.75rem', color: '#c0392b', marginTop: '0.5rem', fontWeight: 600 }}>Requieren ser despachados</p>
            </div>
          </Link>
        </div>

      </main>
    </div>
  )
}
