'use client'

import { useState } from 'react'
import { calculatePrices } from '@/lib/pricing'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function PublicationClient({ initialLots }: { initialLots: any[] }) {
    const [lots, setLots] = useState(initialLots)
    const [isSubmitting, setIsSubmitting] = useState<Record<string, boolean>>({})
    const [selectedOptions, setSelectedOptions] = useState<Record<string, 'opcion1' | 'opcion2' | ''>>({})

    // Si la selección no se ha hecho, por defecto se tomará opcion2 si no es candidato a opcion1, o vacía si debe elegir.

    const handlePublish = async (userId: string, userBooks: any[]) => {
        const isOption1Available = userBooks.length >= 10;

        // Determinar qué opción aplicar
        let finalOption = selectedOptions[userId];

        if (!finalOption) {
            if (!isOption1Available) {
                // Si no es candidato a opcion 1, forzamos opcion 2
                finalOption = 'opcion2';
            } else {
                alert('Debes indicar qué opción de almacenaje eligió el usuario.');
                return;
            }
        }

        setIsSubmitting(prev => ({ ...prev, [userId]: true }))

        try {
            const updatePromises = userBooks.map(book => {
                const prices = calculatePrices(book.original_price || 0)

                let sellerPayout = 0;
                let profit = 0;

                if (finalOption === 'opcion1') {
                    sellerPayout = prices.sellerOption1;
                    profit = prices.profitOption1;
                } else {
                    sellerPayout = prices.sellerOption2;
                    profit = prices.profitOption2;
                }

                const payload = {
                    status_code: 5,
                    published_at: new Date().toISOString(),
                    sale_price: prices.salePrice,
                    seller_payout_amount: sellerPayout,
                    profit_amount: profit,
                    storage_option: finalOption
                }

                return supabase.from('books').update(payload).eq('id', book.id)
            });

            const results = await Promise.all(updatePromises);

            const errors = results.filter(r => r.error).map(r => r.error?.message);
            if (errors.length > 0) {
                throw new Error(`Errores al publicar: ${errors.join(', ')}`);
            }

            // Eliminamos al usuario de la lista local en vez de recargar toda la página
            alert('¡Publicación exitosa! Libros marcados como status 5.');
            setLots(prev => prev.filter(lot => lot.user?.id !== userId));

        } catch (e: any) {
            alert('Error: ' + e.message)
        } finally {
            setIsSubmitting(prev => ({ ...prev, [userId]: false }))
        }
    }

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#F5F2E7', padding: '3rem 2rem', fontFamily: "'Montserrat', sans-serif" }}>
            <header style={{ maxWidth: '1100px', margin: '0 auto 3rem' }}>
                <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2.5rem', color: '#1B3022', fontWeight: 900, marginBottom: '0.5rem' }}>Publicación de Lotes</h1>
                <p style={{ color: '#666', fontSize: '0.95rem' }}>Libros aprobados listos para calcular precios, notificar al vendedor y publicar de inmediato.</p>
            </header>

            <main style={{ maxWidth: '1100px', margin: '0 auto' }}>
                {lots.length === 0 ? (
                    <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '4rem', textAlign: 'center', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
                        <p style={{ fontSize: '1.2rem', color: '#888', margin: 0 }}>No hay libros pendientes de publicación en este momento. 🎉</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                        {lots.map((lot, index) => {
                            const isOption1Available = lot.books.length >= 10;
                            const userName = lot.user?.email ? lot.user.email.split('@')[0] : 'Vendedor';
                            const userPhone = lot.user?.phone ? lot.user.phone.replace(/\D/g, '') : '';
                            const currentSelection = selectedOptions[lot.user.id] || '';

                            // MENSAJE WHATSAPP SIN EMOJIS
                            let msg = '';
                            if (isOption1Available) {
                                msg = `Hola ${userName}, buenas noticias!\n` +
                                    `Hemos evaluado tus libros y te explico como funcionara tu ganancia dependiendo de la recoleccion que elijas:\n\n` +
                                    `*Opcion 1*: Pasamos por todos los libros en una sola vez. Ganas el 60% de la venta.\n` +
                                    `(Solo necesitas entregar los libros. Liberas espacio de inmediato y no te molestamos cada vez que se logre una venta).\n\n` +
                                    `*Opcion 2*: Tu guardas tus libros. Ganas el 50% de la venta.\n` +
                                    `(Se comparten los libros conforme se venden).\n\n` +
                                    `Siempre sugerimos la Opcion 1 para ganar mas y liberar espacio.\n\n` +
                                    `Detalle de tus ganancias por libro:\n`;

                                lot.books.forEach((book: any, i: number) => {
                                    const { sellerOption1, sellerOption2 } = calculatePrices(book.original_price || 0);
                                    msg += `${i + 1}. "${book.title}"\n`;
                                    msg += `   - Si eliges Opcion 1: $${sellerOption1}\n`;
                                    msg += `   - Si eliges Opcion 2: $${sellerOption2}\n`;
                                });

                                msg += `\nQue esquema prefieres para publicar tus libros?`;
                            } else {
                                msg = `Hola ${userName}, buenas noticias!\n` +
                                    `Hemos evaluado tus libros y estan listos para salir a la venta.\n\n` +
                                    `Forma de recoleccion: Tu guardas tus libros. Te contactamos conforme se vayan vendiendo. De cada libro vendido, tu ganancia sera del 50%.\n\n` +
                                    `Detalle de tu ganancia garantizada:\n`;

                                lot.books.forEach((book: any, i: number) => {
                                    const { sellerOption2 } = calculatePrices(book.original_price || 0);
                                    msg += `${i + 1}. "${book.title}" - Ganas $${sellerOption2}\n`;
                                });

                                msg += `\nEstas de acuerdo para empezar a publicarlos?`;
                            }

                            const waLink = userPhone ? `https://wa.me/${userPhone}?text=${encodeURIComponent(msg)}` : '#';

                            return (
                                <div key={index} style={{
                                    backgroundColor: 'white', borderRadius: '16px', padding: '2rem',
                                    boxShadow: '0 4px 15px rgba(0,0,0,0.05)', display: 'flex',
                                    flexDirection: 'column', gap: '1.5rem',
                                    borderLeft: '5px solid #27ae60'
                                }}>

                                    {/* Cabecera Lote */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
                                                <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1B3022', margin: 0 }}>
                                                    Lote Aprobado
                                                </h2>
                                                <span style={{ backgroundColor: '#e9f7ef', color: '#27ae60', fontSize: '0.75rem', fontWeight: 800, padding: '0.3rem 0.8rem', borderRadius: '999px', textTransform: 'uppercase' }}>
                                                    Listo para publicar
                                                </span>
                                            </div>
                                            <p style={{ fontSize: '1.1rem', color: '#1A1A1A', fontWeight: 600, margin: '0 0 1rem' }}>
                                                Vendedor: <span style={{ fontWeight: 800 }}>{userName}</span>
                                            </p>
                                            <p style={{ fontSize: '0.95rem', color: '#888', margin: '0 0 1rem', fontWeight: 500 }}>
                                                Contiene <strong style={{ color: '#1B3022' }}>{lot.books.length}</strong> libros validados.
                                                {isOption1Available ? <span style={{ color: '#27ae60', marginLeft: '0.5rem' }}>(Califica para Opción 1 ✨)</span> : <span style={{ color: '#f39c12', marginLeft: '0.5rem' }}>(Solo Opción 50/50 - Menos de 10 libros)</span>}
                                            </p>

                                            {/* Enlace directo de WhatsApp construido */}
                                            {userPhone ? (
                                                <a href={waLink} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#25D366', color: 'white', padding: '0.6rem 1.2rem', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 700, textDecoration: 'none' }}>
                                                    💬 WhatsApp: Enviar Opciones Calculadas
                                                </a>
                                            ) : (
                                                <span style={{ color: '#c0392b', fontSize: '0.85rem', fontWeight: 700 }}>⚠️ Usuario sin teléfono registrado</span>
                                            )}
                                        </div>

                                        {/* Panel Interactivo de Publicación */}
                                        <div style={{ backgroundColor: '#f9f9f9', padding: '1.5rem', borderRadius: '12px', minWidth: '350px' }}>
                                            <h3 style={{ fontSize: '1rem', color: '#1A1A1A', fontWeight: 800, marginBottom: '1rem' }}>Acción de Publicación</h3>

                                            {isOption1Available ? (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
                                                    <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', cursor: 'pointer' }}>
                                                        <input
                                                            type="radio"
                                                            name={`option_${lot.user.id}`}
                                                            checked={currentSelection === 'opcion1'}
                                                            onChange={() => setSelectedOptions(prev => ({ ...prev, [lot.user.id]: 'opcion1' }))}
                                                            style={{ marginTop: '0.2rem' }}
                                                        />
                                                        <div>
                                                            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1B3022' }}>Opción 1 (Nosotros )</div>
                                                            <div style={{ fontSize: '0.75rem', color: '#666' }}>Vendedor se lleva el 60%</div>
                                                        </div>
                                                    </label>
                                                    <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', cursor: 'pointer' }}>
                                                        <input
                                                            type="radio"
                                                            name={`option_${lot.user.id}`}
                                                            checked={currentSelection === 'opcion2'}
                                                            onChange={() => setSelectedOptions(prev => ({ ...prev, [lot.user.id]: 'opcion2' }))}
                                                            style={{ marginTop: '0.2rem' }}
                                                        />
                                                        <div>
                                                            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1B3022' }}>Opción 2 (Vendedor)</div>
                                                            <div style={{ fontSize: '0.75rem', color: '#666' }}>Vendedor se lleva el 50%</div>
                                                        </div>
                                                    </label>
                                                </div>
                                            ) : (
                                                <div style={{ marginBottom: '1.5rem' }}>
                                                    <div style={{ display: 'inline-block', padding: '0.5rem 1rem', backgroundColor: '#e9e9e9', borderRadius: '6px', fontSize: '0.85rem', color: '#555', fontWeight: 600 }}>
                                                        ✓ Aplica Opción 2 directa (50%)
                                                    </div>
                                                </div>
                                            )}

                                            <button
                                                onClick={() => handlePublish(lot.user.id, lot.books)}
                                                disabled={isSubmitting[lot.user.id]}
                                                style={{ width: '100%', padding: '1rem', backgroundColor: '#1B3022', color: 'white', borderRadius: '8px', border: 'none', fontWeight: 800, cursor: isSubmitting[lot.user.id] ? 'not-allowed' : 'pointer' }}
                                            >
                                                {isSubmitting[lot.user.id] ? 'PUBLICANDO...' : '🚀 PUBLICAR LOTE'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </main>
        </div>
    )
}
