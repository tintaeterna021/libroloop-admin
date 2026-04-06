import type { Metadata } from "next";
import "./globals.css";
import Link from 'next/link'

export const metadata: Metadata = {
  title: "Libroloop Admin",
  description: "Panel Administrativo de Libroloop",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  
  const linkStyle = { padding: '0.8rem 1rem', display: 'block', textDecoration: 'none', color: 'rgba(255,255,255,0.7)', fontFamily: "'Montserrat', sans-serif", fontSize: '0.9rem', fontWeight: 600, borderRadius: '8px' };

  return (
    <html lang="es">
      <body style={{ margin: 0, padding: 0, boxSizing: 'border-box', backgroundColor: '#F5F2E7' }}>
        <div style={{ display: 'flex', minHeight: '100vh', width: '100%' }}>
          
          {/* Sidebar */}
          <aside style={{ 
            width: '260px', 
            backgroundColor: '#1B3022', 
            color: 'white', 
            display: 'flex', 
            flexDirection: 'column', 
            padding: '2rem 1rem', 
            position: 'sticky',
            top: 0,
            height: '100vh',
            boxShadow: '4px 0 15px rgba(0,0,0,0.1)'
          }}>
            <div style={{ padding: '0 1rem', marginBottom: '3rem' }}>
              <span style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.8rem', fontWeight: 900, letterSpacing: '-0.5px' }}>
                Libroloop<span style={{ color: '#ebf4ec', fontSize: '1rem', marginLeft: '6px' }}>ADMIN</span>
              </span>
            </div>

            <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
              <Link href="/" style={{ ...linkStyle, color: '#F5F2E7', backgroundColor: 'rgba(255,255,255,0.15)' }}>
                Dashboard
              </Link>
              <Link href="/lotes" style={linkStyle}>
                1. Aprobación de Libros
              </Link>
              <Link href="/publicacion" style={linkStyle}>
                2. Publicar Libros
              </Link>
              <Link href="/imagenes" style={linkStyle}>
                3. Imágenes de Publicación
              </Link>
              <Link href="/pedidos" style={linkStyle}>
                4. Gestión de Pedidos
              </Link>
              <Link href="/inventario" style={linkStyle}>
                5. Inventario General
              </Link>
              <Link href="/finanzas" style={linkStyle}>
                6. Finanzas y Pagos
              </Link>
              <Link href="/usuarios" style={linkStyle}>
                7. Directorio Usuarios
              </Link>
            </nav>

            <div style={{ marginTop: 'auto', padding: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)'}}>
              <p style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', margin: 0 }}>
                Sesión Segura / Admin
              </p>
            </div>
          </aside>

          {/* Main Content Area */}
          <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {children}
          </main>
          
        </div>
      </body>
    </html>
  );
}
