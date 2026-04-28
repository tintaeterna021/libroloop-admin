'use client'

import { useState } from 'react'
import { calculatePrices } from '@/lib/pricing'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function PublicationClient({ initialLots }: { initialLots: any[] }) {
    const [lots, setLots] = useState(initialLots)
    const [isSubmitting, setIsSubmitting] = useState<Record<string, boolean>>({})
    const [selectedOptions, setSelectedOptions] = useState<Record<string, 'opcion1' | 'opcion2' | ''>>({})
    const [copiedId, setCopiedId] = useState<string | null>(null)

    const handleSendWhatsApp = async (phone: string, userId: string, message: string) => {
        try {
            await navigator.clipboard.writeText(message)
            setCopiedId(userId)
            setTimeout(() => setCopiedId(null), 3000)
        } catch {
            // fallback: al menos abre WhatsApp aunque no se copie
        }
        window.open(`https://wa.me/${phone}`, '_blank')
    }

    // Si la selección no se ha hecho, por defecto se tomará opcion2 si no es candidato a opcion1, o vacía si debe elegir.

    const handlePublish = async (userId: string, userBooks: any[]) => {
        const isOption1Available = userBooks.length >= 2;

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
                    accepted_at: new Date().toISOString(), // paso 2: vendedor confirmó opción
                    published_at: new Date().toISOString(),
                    sale_price: prices.salePrice,
                    seller_payout_amount: sellerPayout,
                    profit_amount: profit,
                    storage_option: finalOption === 'opcion1' ? '1' : '2'
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

    const handleRejectClient = async (userId: string, userBooks: any[]) => {
        setIsSubmitting(prev => ({ ...prev, [userId]: true }))

        try {
            const updatePromises = userBooks.map(book => {
                const payload = {
                    status_code: 11,
                    rejected_at: new Date().toISOString()
                }
                return supabase.from('books').update(payload).eq('id', book.id)
            });

            const results = await Promise.all(updatePromises);
            const errors = results.filter(r => r.error).map(r => r.error?.message);
            if (errors.length > 0) {
                throw new Error(`Errores al procesar: ${errors.join(', ')}`);
            }

            alert('Libros marcados como Cliente no aceptó (status 11).');
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
                            const isOption1Available = lot.books.length >= 2;
                            const userName = lot.user?.email ? lot.user.email.split('@')[0] : 'Vendedor';
                            const userPhone = lot.user?.phone ? lot.user.phone.replace(/\D/g, '') : '';
                            const currentSelection = selectedOptions[lot.user.id] || '';

                            // MENSAJE WHATSAPP
                            // Emojis como escapes Unicode para evitar corrupción de encoding de archivo
                            const E = {
                                wave: '\u{1F44B}', // 👋
                                books: '\u{1F4DA}', // 📚
                                spark: '\u2728',    // ✨
                                box: '\u{1F4E6}', // 📦
                                money: '\u{1F4B0}', // 💰
                                house: '\u{1F3E0}', // 🏠
                                truck: '\u{1F69A}', // 🚚
                                smile: '\u{1F60A}', // 😊
                                bulb: '\u{1F4A1}', // 💡
                                arrow: '\u27A1\uFE0F', // ➡️
                                chart: '\uD83D\uDCC8', // 📈
                                sep: '\u2501'.repeat(15), // ━━━━━━━━━━━━━━━
                            }

                            let msg = '';
                            if (isOption1Available) {
                                msg = `\u00a1Hola! ${E.wave} Buenas noticias ${E.books}${E.spark}\nTus libros est\u00e1n listos para publicarse en *LibroLoop*\n${E.sep}\n${E.house} \u00bfC\u00f3mo empezamos?\n${E.sep}\nT\u00fa guardas los libros en casa y los publicamos hoy mismo. En cuanto se venda el primero, nosotros pasamos a tu domicilio a recogerlo. En esta modalidad inicial ganas el 50% de cada venta.\n${E.sep}\n${E.books} Tu ganancia por libro:\n${E.sep}`;
                                lot.books.forEach((book: any) => {
                                    const { sellerOption1, sellerOption2 } = calculatePrices(book.original_price || 0);
                                    msg += `\n\u2022 *${book.title}*\n${E.money} $${sellerOption2}  ${E.arrow}  ${E.box} Sube a $${sellerOption1}`;
                                });
                                msg += `\n${E.sep}\n${E.bulb} Tip para ganar m\u00e1s (60%)\n${E.sep}\nComo notar\u00e1s en la lista, hay dos montos. Cuando pasemos a recoger tu primer libro vendido, puedes aprovechar el viaje y dejarnos el resto de tus libros para almacenarlos. ${E.box}\n\u00a1Con esto tu ganancia sube en autom\u00e1tico al 60% (el precio de la derecha) para todas tus ventas futuras!\n${E.sep}\n\u00bfTe parece bien si los publicamos hoy mismo? ${E.smile}`;
                            } else {
                                msg = `\u00a1Hola! ${E.wave} Buenas noticias ${E.books}${E.spark}\nTu libro est\u00e1 listo para publicarse en *LibroLoop*\n${E.sep}\n${E.house} \u00bfC\u00f3mo empezamos?\n${E.sep}\nT\u00fa guardas el libro en casa y lo publicamos hoy mismo. En cuanto se venda, nosotros pasamos a tu domicilio a recogerlo. En esta modalidad inicial ganas el 50% de la venta.\n${E.sep}\n${E.books} Tu ganancia:\n${E.sep}`;
                                lot.books.forEach((book: any) => {
                                    const { sellerOption1, sellerOption2 } = calculatePrices(book.original_price || 0);
                                    msg += `\n\u2022 *${book.title}*\n${E.money} $${sellerOption2}  ${E.arrow}  ${E.box} Sube a $${sellerOption1}`;
                                });
                                msg += `\n${E.sep}\n${E.bulb} Tip para ganar m\u00e1s (60%)\n${E.sep}\nComo notar\u00e1s, hay dos montos. Ahorita aplicas para el 50%, pero si logras juntar m\u00e1s libros, al momento de tu primera venta nosotros pasamos a recogerlos todos desde el inicio para almacenarlos en nuestra bodega. ${E.box}\n\u00a1Con esto tu ganancia sube en autom\u00e1tico al 60% (el precio de la derecha) para todas tus ventas! ${E.chart}\n${E.sep}\n\u00bfTe parece bien si empezamos a promocionar tu libro? ${E.smile} En cualquier momento puedes subir m\u00e1s libros con tu cuenta.`;
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
                                            <p style={{ fontSize: '1.1rem', color: '#1A1A1A', fontWeight: 600, margin: '0 0 0.25rem' }}>
                                                Vendedor: <span style={{ fontWeight: 800 }}>{userName}</span>
                                            </p>
                                            {userPhone && (
                                                <p style={{ fontSize: '0.95rem', margin: '0 0 1rem' }}>
                                                    WhatsApp: <a href={`https://wa.me/${userPhone}`} target="_blank" rel="noopener noreferrer" style={{ color: '#25D366', fontWeight: 800, textDecoration: 'none' }}>{lot.user.phone}</a>
                                                </p>
                                            )}
                                            <p style={{ fontSize: '0.95rem', color: '#888', margin: '0 0 1rem', fontWeight: 500 }}>
                                                Contiene <strong style={{ color: '#1B3022' }}>{lot.books.length}</strong> libros validados.
                                                {isOption1Available ? <span style={{ color: '#27ae60', marginLeft: '0.5rem' }}>(Califica para Opción 1 ✨)</span> : <span style={{ color: '#f39c12', marginLeft: '0.5rem' }}>(Solo Opción 50/50 - Menos de 2 libros)</span>}
                                            </p>

                                            {/* Boton WhatsApp: copia texto y abre WA sin prefill de URL (evita truncacion) */}
                                            {userPhone ? (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                                    <button
                                                        onClick={() => handleSendWhatsApp(userPhone, lot.user.id, msg)}
                                                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#25D366', color: 'white', padding: '0.6rem 1.2rem', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 700, border: 'none', cursor: 'pointer' }}
                                                    >
                                                        WhatsApp: Copiar y Abrir
                                                    </button>
                                                    {copiedId === lot.user.id && (
                                                        <span style={{ fontSize: '0.78rem', color: '#27ae60', fontWeight: 700 }}>
                                                            Mensaje copiado - pegalo en el chat (Ctrl+V)
                                                        </span>
                                                    )}
                                                </div>
                                            ) : (
                                                <span style={{ color: '#c0392b', fontSize: '0.85rem', fontWeight: 700 }}>Usuario sin telefono registrado</span>
                                            )}
                                        </div>

                                        {/* Panel Interactivo de Publicación */}
                                        <div style={{ backgroundColor: '#f9f9f9', padding: '1.5rem', borderRadius: '12px', minWidth: '350px' }}>
                                            <h3 style={{ fontSize: '1rem', color: '#1A1A1A', fontWeight: 800, marginBottom: '1rem' }}>Elige la opción de almacenamiento:</h3>

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

                                            <div style={{ display: 'flex', gap: '1rem' }}>
                                                <button
                                                    onClick={() => handleRejectClient(lot.user.id, lot.books)}
                                                    disabled={isSubmitting[lot.user.id]}
                                                    style={{ flex: 1, padding: '1rem', backgroundColor: 'transparent', color: '#c0392b', border: '2px solid #c0392b', borderRadius: '8px', fontWeight: 800, cursor: isSubmitting[lot.user.id] ? 'not-allowed' : 'pointer' }}
                                                >
                                                    CLIENTE NO ACEPTÓ
                                                </button>
                                                <button
                                                    onClick={() => handlePublish(lot.user.id, lot.books)}
                                                    disabled={isSubmitting[lot.user.id]}
                                                    style={{ flex: 1, padding: '1rem', backgroundColor: '#1B3022', color: 'white', borderRadius: '8px', border: 'none', fontWeight: 800, cursor: isSubmitting[lot.user.id] ? 'not-allowed' : 'pointer' }}
                                                >
                                                    {isSubmitting[lot.user.id] ? 'GUARDANDO...' : 'GUARDAR'}
                                                </button>
                                            </div>
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
