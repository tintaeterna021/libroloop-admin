'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { calculatePrices } from '@/lib/pricing'

export default function PublicationViewer({ serverBooks }: { serverBooks: any[] }) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedOption, setSelectedOption] = useState<'opcion1' | 'opcion2' | ''>('')

  // El usuario califica a Opción 1 si tiene más de 10 libros
  const canOfferOption1 = serverBooks.length > 10;
  
  const userName = serverBooks[0]?.profiles?.email?.split('@')[0] || 'Vendedor'

  const handlePublish = async () => {
      if (!selectedOption) {
          alert('Debes seleccionar la opción de comisión que eligió el vendedor.');
          return;
      }

      setIsSubmitting(true)
      
      try {
          // Preparamos las promesas de update para cada libro
          const updatePromises = serverBooks.map(book => {
              const prices = calculatePrices(book.sale_price || 0)
              
              let sellerPayout = 0;
              let profit = 0;

              if (selectedOption === 'opcion1') {
                  sellerPayout = prices.sellerOption1;
                  profit = prices.profitOption1;
              } else {
                  sellerPayout = prices.sellerOption2;
                  profit = prices.profitOption2;
              }

              const payload = {
                  status_code: 5,
                  published: true, // o 1 si es numérico
                  published_at: new Date().toISOString(),
                  sale_price: prices.salePrice,
                  seller_payout_amount: sellerPayout,
                  profit_amount: profit,
                  storage_option: selectedOption // Grabamos qué opción se eligió
              }

              return supabase.from('books').update(payload).eq('id', book.id)
          });

          const results = await Promise.all(updatePromises);
          
          const errors = results.filter(r => r.error).map(r => r.error?.message);
          if (errors.length > 0) {
              throw new Error(`Hubo errores al publicar algunos libros: ${errors.join(', ')}`);
          }

          alert('¡Publicación exitosa! Todos los libros están en status 5 y con sus precios definitivos asignados.');
          router.push('/publicacion');

      } catch (e: any) {
          alert('Error: ' + e.message)
      } finally {
          setIsSubmitting(false)
      }
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F5F2E7', padding: '3rem 2rem', fontFamily: "'Montserrat', sans-serif" }}>
      <header style={{ maxWidth: '1100px', margin: '0 auto 3rem' }}>
        <button onClick={() => router.push('/publicacion')} style={{ background: 'none', border: 'none', color: '#1B3022', fontWeight: 800, cursor: 'pointer', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', padding: 0 }}>
          ← Volver a Resumen
        </button>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2.5rem', color: '#1B3022', fontWeight: 900, marginBottom: '0.5rem' }}>Publicar Libros de {userName}</h1>
        <p style={{ color: '#666', fontSize: '0.95rem' }}>Confirma la opción elegida por el vendedor para calcular precios y ganancias definitivas.</p>
      </header>

      <main style={{ maxWidth: '1100px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2rem' }}>
          
         {/* Lado Izquierdo: Lista de Libros */}
         <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '2rem', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
             <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1B3022', marginBottom: '1.5rem', borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>
                 Detalle Final de Precios ({serverBooks.length} libros)
             </h2>
             
             <div style={{ overflowX: 'auto' }}>
                 <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                     <thead>
                         <tr>
                             <th style={{ padding: '1rem 0.5rem', borderBottom: '2px solid #eee', fontSize: '0.85rem', color: '#888', fontWeight: 700 }}>Libro</th>
                             <th style={{ padding: '1rem 0.5rem', borderBottom: '2px solid #eee', fontSize: '0.85rem', color: '#888', fontWeight: 700 }}>Precio Orig.</th>
                             <th style={{ padding: '1rem 0.5rem', borderBottom: '2px solid #eee', fontSize: '0.85rem', color: '#888', fontWeight: 700 }}>Precio Público (55%)</th>
                             <th style={{ padding: '1rem 0.5rem', borderBottom: '2px solid #eee', fontSize: '0.85rem', color: '#888', fontWeight: 700 }}>Ganancia Opción 1 (Nosotros)</th>
                             <th style={{ padding: '1rem 0.5rem', borderBottom: '2px solid #eee', fontSize: '0.85rem', color: '#888', fontWeight: 700 }}>Ganancia Opción 2 (Ellos)</th>
                         </tr>
                     </thead>
                     <tbody>
                         {serverBooks.map(book => {
                             const prices = calculatePrices(book.sale_price || 0);
                             return (
                                 <tr key={book.id} style={{ borderBottom: '1px solid #f9f9f9', backgroundColor: selectedOption ? '#fafafa' : 'transparent' }}>
                                     <td style={{ padding: '1rem 0.5rem', fontSize: '0.9rem', fontWeight: 600, color: '#333' }}>{book.title}</td>
                                     <td style={{ padding: '1rem 0.5rem', fontSize: '0.9rem', color: '#666' }}>${book.original_price}</td>
                                     
                                     <td style={{ padding: '1rem 0.5rem', fontSize: '0.9rem', fontWeight: 800, color: '#1B3022' }}>
                                         ${prices.salePrice}
                                     </td>
                                     
                                     <td style={{ padding: '1rem 0.5rem', fontSize: '0.9rem', fontWeight: 700, color: selectedOption === 'opcion1' ? '#27ae60' : '#888' }}>
                                         {canOfferOption1 ? `$${prices.sellerOption1} (60%)` : '-'}
                                     </td>
                                     
                                     <td style={{ padding: '1rem 0.5rem', fontSize: '0.9rem', fontWeight: 700, color: selectedOption === 'opcion2' ? '#27ae60' : '#888' }}>
                                         ${prices.sellerOption2} (50%)
                                     </td>
                                 </tr>
                             )
                         })}
                     </tbody>
                 </table>
             </div>
         </div>

         {/* Lado Derecho: Acción de Publicar */}
         <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '2rem', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', borderTop: '5px solid #27ae60' }}>
               <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1B3022', margin: '0 0 1rem' }}>Comisión Elegida</h3>
               <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '1.5rem' }}>Indica qué opción aceptó el vendedor en el mensaje de WhatsApp para registrar los cálculos correctos.</p>
               
               <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
                   <label style={{ display: 'flex', gap: '0.8rem', padding: '1rem', border: selectedOption === 'opcion1' ? '2px solid #27ae60' : '1px solid #eee', borderRadius: '8px', cursor: canOfferOption1 ? 'pointer' : 'not-allowed', opacity: canOfferOption1 ? 1 : 0.5, backgroundColor: selectedOption === 'opcion1' ? '#f0fcf4' : 'transparent' }}>
                       <input 
                          type="radio" 
                          name="comision" 
                          value="opcion1" 
                          disabled={!canOfferOption1}
                          checked={selectedOption === 'opcion1'}
                          onChange={() => setSelectedOption('opcion1')}
                          style={{ marginTop: '0.2rem' }}
                       />
                       <div>
                           <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#1B3022' }}>Opción 1: Nosotros almacenamos (60%)</div>
                           <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.3rem' }}>{canOfferOption1 ? 'Gana más, liberan espacio.' : 'Requiere más de 10 libros.'}</div>
                       </div>
                   </label>

                   <label style={{ display: 'flex', gap: '0.8rem', padding: '1rem', border: selectedOption === 'opcion2' ? '2px solid #27ae60' : '1px solid #eee', borderRadius: '8px', cursor: 'pointer', backgroundColor: selectedOption === 'opcion2' ? '#f0fcf4' : 'transparent' }}>
                       <input 
                          type="radio" 
                          name="comision" 
                          value="opcion2" 
                          checked={selectedOption === 'opcion2'}
                          onChange={() => setSelectedOption('opcion2')}
                          style={{ marginTop: '0.2rem' }}
                       />
                       <div>
                           <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#1B3022' }}>Opción 2: Ellos almacenan (50%)</div>
                           <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.3rem' }}>Gana el 50% de la venta, nosotros los recolectamos solo cuando se venden.</div>
                       </div>
                   </label>
               </div>

               <button 
                  onClick={handlePublish}
                  disabled={isSubmitting || !selectedOption}
                  style={{ width: '100%', padding: '1.2rem', backgroundColor: !selectedOption ? '#ccc' : '#1B3022', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 800, cursor: !selectedOption ? 'not-allowed' : 'pointer', letterSpacing: '0.05em' }}
               >
                   {isSubmitting ? 'PUBLICANDO...' : 'CONFIRMAR Y PUBLICAR LOTE'}
               </button>
            </div>
         </div>
      </main>
    </div>
  )
}
