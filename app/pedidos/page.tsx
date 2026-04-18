import PedidosBoard from '../components/PedidosBoard'

export const metadata = {
  title: 'Gestión de Pedidos - Libroloop Admin'
}

export default function PedidosPage() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F5F2E7', padding: '3rem 2rem', fontFamily: "'Montserrat', sans-serif" }}>
      <header style={{ maxWidth: '1400px', margin: '0 auto 2rem' }}>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2.5rem', color: '#1B3022', fontWeight: 900, marginBottom: '0.5rem' }}>Gestión de Pedidos</h1>
        <p style={{ color: '#666', fontSize: '0.95rem' }}>Administra y notifica el progreso de todas las salidas de inventario.</p>
      </header>

      <main style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <PedidosBoard />
      </main>
    </div>
  )
}
