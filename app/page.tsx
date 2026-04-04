import { supabase } from '@/lib/supabase'

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

  // 4. Libros Totales (Publicados activos): books with status_code = 5
  const { count: librosActivos } = await supabase.from('books').select('*', { count: 'exact', head: true }).eq('status_code', 5)

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F5F2E7', padding: '3rem 2rem', fontFamily: "'Montserrat', sans-serif" }}>
      <header style={{ maxWidth: '1100px', margin: '0 auto 3rem' }}>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2.5rem', color: '#1B3022', fontWeight: 900, marginBottom: '0.5rem' }}>Dashboard Principal</h1>
        <p style={{ color: '#666', fontSize: '0.95rem' }}>Resumen operativo de hoy. Tienes lo vital a un vistazo.</p>
      </header>
      
      <main style={{ maxWidth: '1100px', margin: '0 auto' }}>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
          
          {/* Tarjeta 1 - Ventas Totales */}
          <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 4px 6px rgba(0,0,0,0.03)', borderLeft: '5px solid #1B3022' }}>
            <p style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '0.8rem', color: '#888', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Ventas Totales</p>
            <p style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '2.5rem', color: '#1B3022', fontWeight: 900 }}>
                ${ventasTotales.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.5rem' }}>Ingresos consolidados</p>
          </div>

          {/* Tarjeta 2 - Pedidos Pendientes */}
          <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 4px 6px rgba(0,0,0,0.03)', borderLeft: '5px solid #c0392b' }}>
            <p style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '0.8rem', color: '#888', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Pedidos Pendientes</p>
            <p style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '2.5rem', color: '#c0392b', fontWeight: 900 }}>
                {pedidosPendientes}
            </p>
            <p style={{ fontSize: '0.75rem', color: '#c0392b', marginTop: '0.5rem', fontWeight: 600 }}>Requieren ser despachados</p>
          </div>

          {/* Tarjeta 3 - Lotes */}
          <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 4px 6px rgba(0,0,0,0.03)', borderLeft: '5px solid #f39c12' }}>
            <p style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '0.8rem', color: '#888', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Lotes Esperando Confirmación</p>
            <p style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '2.5rem', color: '#f39c12', fontWeight: 900 }}>
                {lotesRevision || 0}
            </p>
            <p style={{ fontSize: '0.75rem', color: '#f39c12', marginTop: '0.5rem', fontWeight: 600 }}>Nuevos ejemplares por revisar</p>
          </div>

          {/* Tarjeta 4 - Activos */}
          <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 4px 6px rgba(0,0,0,0.03)', borderLeft: '5px solid #2980b9' }}>
            <p style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '0.8rem', color: '#888', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Libros Activos en Tienda</p>
            <p style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '2.5rem', color: '#2980b9', fontWeight: 900 }}>
                {librosActivos || 0}
            </p>
            <p style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.5rem' }}>Ejemplares disponibles públicos</p>
          </div>

        </div>

      </main>
    </div>
  )
}
