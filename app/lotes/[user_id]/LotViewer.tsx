'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { calculatePrices } from '@/lib/pricing'

export default function LotViewer({ serverBooks }: { serverBooks: any[] }) {
    const router = useRouter()
    // Data State
    const [books, setBooks] = useState<any[]>(serverBooks)
    const [currentIndex, setCurrentIndex] = useState(0)

    // Form State (current book's draft data)
    const [form, setForm] = useState<any>(serverBooks[0] || {})

    // Loading/Reject States
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [showRejectReasons, setShowRejectReasons] = useState(false)

    // Red Highlight missing fields API
    const [missingFields, setMissingFields] = useState<string[]>([])

    // ZXing Barcode Scanning State
    const [scanStatus, setScanStatus] = useState<'idle' | 'scanning' | 'success' | 'failed'>('idle')

    // Zoom Refs
    const frontImgRef = useRef<HTMLImageElement>(null)
    const backImgRef = useRef<HTMLImageElement>(null)

    useEffect(() => {
        if (books.length > 0 && books[currentIndex]) {
            setForm(books[currentIndex])
            setMissingFields([])
            setScanStatus('idle')
        }
    }, [currentIndex, books])

    if (books.length === 0) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#F5F2E7', fontFamily: "'Montserrat', sans-serif" }}>
                <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2rem', color: '#1B3022', marginBottom: '1rem' }}>¡Lote Procesado! 🎉</h1>
                <button onClick={() => router.push('/lotes')} style={{ backgroundColor: '#1B3022', color: 'white', padding: '1rem 2rem', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 700 }}>
                    VOLVER A LOTES
                </button>
            </div>
        )
    }

    const currentBook = books[currentIndex]

    // === Zoom Logic ===
    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>, ref: React.RefObject<HTMLImageElement | null>) => {
        if (!ref.current) return;
        const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
        const x = ((e.clientX - left) / width) * 100;
        const y = ((e.clientY - top) / height) * 100;
        ref.current.style.transformOrigin = `${x}% ${y}%`;
        ref.current.style.transform = 'scale(2.7)';
    }

    const handleMouseLeave = (ref: React.RefObject<HTMLImageElement | null>) => {
        if (!ref.current) return;
        ref.current.style.transformOrigin = 'center';
        ref.current.style.transform = 'scale(1)';
    }

    // === ZXing Barcode Scan ===
    const handleBackImageLoad = async () => {
        if (!backImgRef.current || !currentBook.original_back_image_url) return;
        setScanStatus('scanning');
        try {
            const { BrowserMultiFormatReader } = await import('@zxing/library');
            const codeReader = new BrowserMultiFormatReader();
            const result = await codeReader.decodeFromImageElement(backImgRef.current);
            if (result && result.getText()) {
                const detectedIsbn = result.getText();
                setForm(prev => ({ ...prev, isbn: detectedIsbn }));
                setScanStatus('success');
                // Auto trigger search
                handleSearchISBN(detectedIsbn);
            } else {
                setScanStatus('failed');
            }
        } catch (err) {
            setScanStatus('failed');
        }
    }

    // === Advanced Metadata Parsing (Tinta Eterna Port) ===
    const CATEGORY_MAP: Record<string, string> = {
        "fiction": "Ficción",
        "juvenile fiction": "Ficción juvenil",
        "self-help": "Autoayuda",
        "religion": "Religión",
        "health & fitness": "Salud y estado físico",
        "medical": "Medicina",
        "computers": "Computación",
        "technology & engineering": "Tecnología e ingeniería",
        "business & economics": "Negocios y economía",
        "education": "Educación",
        "history": "Historia",
        "art": "Arte",
        "science": "Ciencia",
        "mathematics": "Matemáticas",
        "philosophy": "Filosofía",
        "psychology": "Psicología",
        "social science": "Ciencias sociales",
        "biography & autobiography": "Biografía y autobiografía",
        "poetry": "Poesía",
        "drama": "Drama",
        "law": "Derecho",
        "music": "Música",
        "sports & recreation": "Deportes y recreación",
        "travel": "Viajes",
        "cooking": "Cocina",
        "study aids": "Ayudas de estudio",
        "foreign language study": "Estudio de idiomas",
    }

    // === Handlers ===
    const handleSearchISBN = async (overrideIsbn?: any) => {
        const targetIsbn = typeof overrideIsbn === 'string' ? overrideIsbn : form.isbn;
        if (!targetIsbn) return;
        setIsSubmitting(true)

        // 1. Limpiar todos los campos, retener ISBN
        const isbnsToKeep = targetIsbn
        setForm({ isbn: isbnsToKeep })
        setMissingFields([])

        try {
            // 2. Normalización del ISBN ("clean_isbn")
            const cleanIsbn = isbnsToKeep.replace(/[^\dX]/gi, "").toUpperCase()

            const apiKeyParam = process.env.NEXT_PUBLIC_GOOGLE_BOOKS_API_KEY ? `&key=${process.env.NEXT_PUBLIC_GOOGLE_BOOKS_API_KEY}` : ''
            const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${cleanIsbn}${apiKeyParam}`)
            const data = await res.json()

            if (!res.ok || data.error) {
                if (data.error?.code === 429) {
                    alert("ERROR: Se ha excedido el límite de consultas diarias a la API de Google Books (Error 429). Por favor, intenta de nuevo más tarde o agrega una clave de API (NEXT_PUBLIC_GOOGLE_BOOKS_API_KEY).")
                } else {
                    alert(`ERROR API Google Books: ${data.error?.message || res.statusText}`)
                }
                setIsSubmitting(false)
                return
            }

            let totalItems = data.totalItems || 0
            if (data.items && data.items.length > 0) {
                totalItems = data.items.length
            } else {
                totalItems = 0
            }

            // 3. Condicional de Coincidencias Totales
            if (totalItems === 0) {
                alert("NINGUNA COINCIDENCIA. El libro no está registrado en Google Books. Captura manualmente.")
                const allMissing = ["title", "author", "year", "publisher", "genre", "page_count", "language", "description"]
                setMissingFields(allMissing)
                setForm({
                    isbn: cleanIsbn,
                    link_amazon: `https://www.amazon.com.mx/s?k=${cleanIsbn}`,
                    link_gandhi: `https://www.gandhi.com.mx/?query=${cleanIsbn}`,
                    link_buscalibre: `https://www.buscalibre.com.mx/libros/search?q=${cleanIsbn}`,
                    link_sotano: `https://www.elsotano.com/buscar?SotK=${cleanIsbn}`,
                    link_pendulo: `https://pendulo.com/busqueda/listaLibros.php?tipoBus=full&palabrasBusqueda=${cleanIsbn}`
                })
                return
            }

            if (totalItems > 1) {
                alert(`ATENCIÓN: Se encontraron ${totalItems} coincidencias mundiales. Inyectaremos la mejor calificada, pero revisa cuidadosamente.`)
            }

            const item = data.items[0]
            const volInfo = item.volumeInfo || {}

            // Map Categories
            let categoriasStr = ""
            if (volInfo.categories && volInfo.categories.length > 0) {
                const translated = volInfo.categories.map((c: string) => {
                    const key = c.trim().toLowerCase()
                    return CATEGORY_MAP[key] || c
                })
                categoriasStr = translated.map((cat: string) => cat.charAt(0).toUpperCase() + cat.slice(1).toLowerCase()).join(" / ")
            }

            // Map Lang
            let lang = volInfo.language
            if (lang === "es") lang = "Español"
            else if (lang === "en") lang = "Inglés"

            const foundTitle = volInfo.title || ""
            const foundAuthor = volInfo.authors ? volInfo.authors.join(", ") : ""
            const foundPublisher = volInfo.publisher || ""
            const foundYear = volInfo.publishedDate ? parseInt(volInfo.publishedDate.substring(0, 4)) : ""
            const foundPageCount = volInfo.pageCount || ""
            const foundDescription = volInfo.description || ""
            const foundLanguage = lang || ""
            const foundGenre = categoriasStr

            let missing: string[] = []
            if (!foundTitle) missing.push("title")
            if (!foundAuthor) missing.push("author")
            if (!foundYear) missing.push("year")
            if (!foundPublisher) missing.push("publisher")
            if (!foundGenre) missing.push("genre")
            if (!foundPageCount) missing.push("page_count")
            if (!foundLanguage) missing.push("language")
            if (!foundDescription) missing.push("description")

            setMissingFields(missing)

            setForm({
                isbn: cleanIsbn,
                title: foundTitle,
                author: foundAuthor,
                publisher: foundPublisher,
                year: foundYear,
                page_count: foundPageCount,
                description: foundDescription,
                language: foundLanguage,
                genre: foundGenre,
                link_amazon: `https://www.amazon.com.mx/s?k=${cleanIsbn}`,
                link_gandhi: `https://www.gandhi.com.mx/?query=${cleanIsbn}`,
                link_buscalibre: `https://www.buscalibre.com.mx/libros/search?q=${cleanIsbn}`,
                link_sotano: `https://www.elsotano.com/buscar?SotK=${cleanIsbn}`,
                link_pendulo: `https://pendulo.com/busqueda/listaLibros.php?tipoBus=full&palabrasBusqueda=${cleanIsbn}`
            })

        } catch (e) {
            console.error(e);
            alert("Hubo un error contactando la API.");
        } finally {
            setIsSubmitting(false)
        }
    }

    const getBorder = (field: string) => missingFields.includes(field) ? '2px solid #e74c3c' : '1px solid #ccc'

    const removeCurrentBook = () => {
        const updatedBooks = [...books]
        updatedBooks.splice(currentIndex, 1)
        setBooks(updatedBooks)
        if (currentIndex >= updatedBooks.length && updatedBooks.length > 0) {
            setCurrentIndex(updatedBooks.length - 1)
        }
        setShowRejectReasons(false)
    }

    const handleApprove = async () => {
        if (!form.isbn || !form.title || !form.author || !form.year || !form.publisher || !form.genre || !form.description || form.original_price === undefined || form.original_price === null || form.original_price === '') {
            alert("⚠️ Faltan campos obligatorios (*). Completa el ISBN, Título, Autor, Año, Editorial, Género, Descripción y Precio Original antes de aceptar el libro.")
            return
        }

        setIsSubmitting(true)
        try {
            const prices = calculatePrices(form.original_price);
            const payload = {
                ...form,
                status_code: 4,
                sale_price: prices.salePrice,
                review_at: new Date().toISOString()
                // accepted_at se registra en el paso 2 (opciones de almacenamiento)
            }
            const { error } = await supabase.from('books').update(payload).eq('id', currentBook.id)
            if (error) throw error;

            removeCurrentBook()
        } catch (e: any) { alert("Error: " + e.message) }
        finally { setIsSubmitting(false) }
    }

    const handleReject = async (reason: string) => {
        setIsSubmitting(true)
        try {
            const payload = {
                status_code: 2,
                rejection_comment: reason,
                review_at: new Date().toISOString(),
                rejected_at: new Date().toISOString(),
                title: form.title,
                author: form.author,
                isbn: form.isbn
            }
            const { error } = await supabase.from('books').update(payload).eq('id', currentBook.id)
            if (error) throw error;

            removeCurrentBook()
        } catch (e: any) { alert("Error: " + e.message) }
        finally { setIsSubmitting(false) }
    }

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#F5F2E7', fontFamily: "'Montserrat', sans-serif" }}>

            {/* ARRIBA: IMÁGENES */}
            <div style={{ backgroundColor: '#F5F2E7', padding: '2rem 2rem 0 2rem' }}>
                <div style={{ display: 'flex', gap: '2rem', maxWidth: '1000px', margin: '0 auto', justifyContent: 'center' }}>

                    {/* Portada */}
                    <div style={{ flex: 1, maxWidth: '400px' }}>
                        <p style={{ color: '#1B3022', fontSize: '0.8rem', fontWeight: 700, margin: '0 0 0.5rem 0', textAlign: 'center' }}>PORTADA ORIGINAL</p>
                        <div
                            style={{ height: '400px', backgroundColor: 'white', borderRadius: '12px', overflow: 'hidden', cursor: 'crosshair', position: 'relative', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}
                            onMouseMove={(e) => handleMouseMove(e, frontImgRef)}
                            onMouseLeave={() => handleMouseLeave(frontImgRef)}
                        >
                            {currentBook.original_front_image_url ? (
                                <img ref={frontImgRef} src={currentBook.original_front_image_url} alt="Portada" style={{ width: '100%', height: '100%', objectFit: 'contain', transition: 'transform 0.1s ease-out' }} />
                            ) : <p style={{ textAlign: 'center', marginTop: '40%', color: '#ccc' }}>Sin portada</p>}
                        </div>
                    </div>

                    {/* Contraportada */}
                    <div style={{ flex: 1, maxWidth: '400px' }}>
                        <p style={{ color: '#1B3022', fontSize: '0.8rem', fontWeight: 700, margin: '0 0 0.5rem 0', textAlign: 'center' }}>CONTRAPORTADA ORIGINAL</p>
                        <div
                            style={{ height: '400px', backgroundColor: 'white', borderRadius: '12px', overflow: 'hidden', cursor: 'crosshair', position: 'relative', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}
                            onMouseMove={(e) => handleMouseMove(e, backImgRef)}
                            onMouseLeave={() => handleMouseLeave(backImgRef)}
                        >
                            {currentBook.original_back_image_url ? (
                                <img 
                                  ref={backImgRef} 
                                  src={currentBook.original_back_image_url} 
                                  alt="Contraportada" 
                                  style={{ width: '100%', height: '100%', objectFit: 'contain', transition: 'transform 0.1s ease-out', crossOrigin: 'anonymous' }} 
                                  onLoad={handleBackImageLoad}
                                  crossOrigin="anonymous"
                                />
                            ) : <p style={{ textAlign: 'center', marginTop: '40%', color: '#ccc' }}>Sin posterior</p>}
                        </div>
                    </div>

                </div>
                <p style={{ textAlign: 'center', color: '#888', marginTop: '1.5rem', fontWeight: 700, fontSize: '0.9rem' }}>
                    Restan {books.length} libros en este lote
                </p>
            </div>

            {/* ABAJO: FORMULARIO */}
            <div style={{ maxWidth: '800px', margin: '2rem auto', backgroundColor: 'white', padding: '3rem', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', borderRadius: '16px' }}>

                {/* 1. ISBN */}
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '3rem', alignItems: 'stretch' }}>
                    <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: '#333', marginBottom: '0.5rem' }}>
                            ISBN *
                            {scanStatus === 'scanning' && <span style={{ color: '#f39c12', marginLeft: '10px', fontSize: '0.75rem', fontWeight: 600 }}>Escaneando código de barras...</span>}
                            {scanStatus === 'success' && <span style={{ color: '#2ecc71', marginLeft: '10px', fontSize: '0.75rem', fontWeight: 600 }}>✅ ¡ISBN detectado!</span>}
                            {scanStatus === 'failed' && <span style={{ color: '#e74c3c', marginLeft: '10px', fontSize: '0.75rem', fontWeight: 600 }}>⚠️ No se detectó código. Capturar manualmente previo a buscar.</span>}
                        </label>
                        <input
                            autoFocus
                            type="text"
                            value={form.isbn || ''}
                            onChange={e => setForm({ ...form, isbn: e.target.value.replace(/[^\dX]/gi, '').toUpperCase() })}
                            style={{ width: '100%', padding: '0.8rem 1rem', boxSizing: 'border-box', borderRadius: '6px', border: '2px solid #1B3022', fontSize: '1rem', fontFamily: 'monospace' }}
                        />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                        <button onClick={handleSearchISBN} disabled={isSubmitting} style={{ backgroundColor: '#1B3022', color: 'white', boxSizing: 'border-box', border: 'none', borderRadius: '6px', padding: '0.8rem 1.5rem', fontWeight: 700, cursor: 'pointer' }}>
                            {isSubmitting ? '...' : 'BUSCAR POR ISBN'}
                        </button>
                    </div>
                </div>

                {/* 2. Detalle de Libro */}
                <h3 style={{ fontSize: '1.1rem', color: '#1B3022', fontWeight: 800, marginBottom: '1.5rem', borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>Detalle de Libro</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '3rem' }}>
                    <div style={{ gridColumn: '1 / -1' }}>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: missingFields.includes('title') ? '#e74c3c' : '#666', marginBottom: '0.3rem' }}>Título *</label>
                        <input type="text" value={form.title || ''} onChange={e => setForm({ ...form, title: e.target.value })} style={{ width: '100%', padding: '0.7rem', borderRadius: '4px', border: getBorder('title'), fontSize: '0.9rem' }} />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: missingFields.includes('author') ? '#e74c3c' : '#666', marginBottom: '0.3rem' }}>Autor *</label>
                        <input type="text" value={form.author || ''} onChange={e => setForm({ ...form, author: e.target.value })} style={{ width: '100%', padding: '0.7rem', borderRadius: '4px', border: getBorder('author'), fontSize: '0.9rem' }} />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: missingFields.includes('year') ? '#e74c3c' : '#666', marginBottom: '0.3rem' }}>Año *</label>
                        <input type="number" value={form.year || ''} onChange={e => setForm({ ...form, year: parseInt(e.target.value) })} style={{ width: '100%', padding: '0.7rem', borderRadius: '4px', border: getBorder('year'), fontSize: '0.9rem' }} />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: missingFields.includes('publisher') ? '#e74c3c' : '#666', marginBottom: '0.3rem' }}>Editorial *</label>
                        <input type="text" value={form.publisher || ''} onChange={e => setForm({ ...form, publisher: e.target.value })} style={{ width: '100%', padding: '0.7rem', borderRadius: '4px', border: getBorder('publisher'), fontSize: '0.9rem' }} />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: missingFields.includes('genre') ? '#e74c3c' : '#666', marginBottom: '0.3rem' }}>Género *</label>
                        <input type="text" value={form.genre || ''} onChange={e => setForm({ ...form, genre: e.target.value })} style={{ width: '100%', padding: '0.7rem', borderRadius: '4px', border: getBorder('genre'), fontSize: '0.9rem' }} />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: missingFields.includes('page_count') ? '#e74c3c' : '#666', marginBottom: '0.3rem' }}>Páginas</label>
                        <input type="number" value={form.page_count || ''} onChange={e => setForm({ ...form, page_count: parseInt(e.target.value) })} style={{ width: '100%', padding: '0.7rem', borderRadius: '4px', border: getBorder('page_count'), fontSize: '0.9rem' }} />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: missingFields.includes('language') ? '#e74c3c' : '#666', marginBottom: '0.3rem' }}>Idioma</label>
                        <input type="text" value={form.language || ''} onChange={e => setForm({ ...form, language: e.target.value })} style={{ width: '100%', padding: '0.7rem', borderRadius: '4px', border: getBorder('language'), fontSize: '0.9rem' }} />
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: missingFields.includes('description') ? '#e74c3c' : '#666', marginBottom: '0.3rem' }}>Descripción / Sinopsis *</label>
                        <textarea value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} rows={4} style={{ width: '100%', padding: '0.7rem', borderRadius: '4px', border: getBorder('description'), fontSize: '0.9rem', resize: 'vertical' }} />
                    </div>
                </div>

                {/* 3. Precio de Libro */}
                <h3 style={{ fontSize: '1.1rem', color: '#1B3022', fontWeight: 800, marginBottom: '1.5rem', borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>Precio de Libro</h3>

                <div style={{ marginBottom: '2rem', backgroundColor: '#fcfcfc', border: '1px dashed #ccc', padding: '1.5rem', borderRadius: '8px' }}>
                    <p style={{ margin: '0 0 1rem 0', color: '#888', fontSize: '0.8rem', fontWeight: 700 }}>PRECIOS COMPETENCIA (Auto-generados por ISBN)</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <input type="text" placeholder="Link Amazon Mx" value={form.link_amazon || ''} onChange={e => setForm({ ...form, link_amazon: e.target.value })} style={{ flex: 1, padding: '0.6rem', border: '1px solid #ddd', borderRadius: '4px', fontSize: '0.85rem' }} />
                            {form.link_amazon && <button onClick={() => window.open(form.link_amazon, '_blank')} style={{ padding: '0 0.8rem', backgroundColor: '#eee', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>Ver</button>}
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <input type="text" placeholder="Link Gandhi" value={form.link_gandhi || ''} onChange={e => setForm({ ...form, link_gandhi: e.target.value })} style={{ flex: 1, padding: '0.6rem', border: '1px solid #ddd', borderRadius: '4px', fontSize: '0.85rem' }} />
                            {form.link_gandhi && <button onClick={() => window.open(form.link_gandhi, '_blank')} style={{ padding: '0 0.8rem', backgroundColor: '#eee', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>Ver</button>}
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <input type="text" placeholder="Link Buscalibre" value={form.link_buscalibre || ''} onChange={e => setForm({ ...form, link_buscalibre: e.target.value })} style={{ flex: 1, padding: '0.6rem', border: '1px solid #ddd', borderRadius: '4px', fontSize: '0.85rem' }} />
                            {form.link_buscalibre && <button onClick={() => window.open(form.link_buscalibre, '_blank')} style={{ padding: '0 0.8rem', backgroundColor: '#eee', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>Ver</button>}
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <input type="text" placeholder="Link El Sótano" value={form.link_sotano || ''} onChange={e => setForm({ ...form, link_sotano: e.target.value })} style={{ flex: 1, padding: '0.6rem', border: '1px solid #ddd', borderRadius: '4px', fontSize: '0.85rem' }} />
                            {form.link_sotano && <button onClick={() => window.open(form.link_sotano, '_blank')} style={{ padding: '0 0.8rem', backgroundColor: '#eee', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>Ver</button>}
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <input type="text" placeholder="Link Péndulo" value={form.link_pendulo || ''} onChange={e => setForm({ ...form, link_pendulo: e.target.value })} style={{ flex: 1, padding: '0.6rem', border: '1px solid #ddd', borderRadius: '4px', fontSize: '0.85rem' }} />
                            {form.link_pendulo && <button onClick={() => window.open(form.link_pendulo, '_blank')} style={{ padding: '0 0.8rem', backgroundColor: '#eee', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>Ver</button>}
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '2rem', marginBottom: '4rem' }}>
                    <div style={{ flex: 1, maxWidth: '50%' }}>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#c0392b', marginBottom: '0.3rem' }}>Precio Original *</label>
                        <div style={{ display: 'flex', border: '1px solid #ccc', borderRadius: '4px', overflow: 'hidden' }}>
                            <span style={{ padding: '0.8rem', backgroundColor: '#f0f0f0', fontWeight: 700, color: '#333' }}>$</span>
                            <input type="number" value={form.original_price || ''} onChange={e => setForm({ ...form, original_price: parseFloat(e.target.value) })} style={{ width: '100%', padding: '0.8rem', border: 'none', outline: 'none', fontSize: '1rem' }} />
                        </div>
                    </div>
                </div>

                {/* 4. Botones de Acción (Más chicos a lo largo) */}
                <div style={{ display: 'flex', gap: '1rem', borderTop: '2px dashed #eee', paddingTop: '2rem' }}>
                    <div style={{ flex: 1, position: 'relative' }}>
                        <button
                            disabled={isSubmitting}
                            onClick={() => setShowRejectReasons(!showRejectReasons)}
                            style={{ width: '100%', padding: '1.2rem', backgroundColor: 'transparent', color: '#c0392b', border: '2px solid #c0392b', borderRadius: '8px', fontWeight: 800, cursor: 'pointer', letterSpacing: '0.05em' }}
                        >
                            DECLINAR TÍTULO
                        </button>

                        {showRejectReasons && (
                            <div style={{ position: 'absolute', bottom: '110%', left: 0, right: 0, backgroundColor: 'white', border: '1px solid #ccc', borderRadius: '8px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
                                <button onClick={() => handleReject('Malas condiciones físicas')} style={{ width: '100%', padding: '1rem', textAlign: 'center', border: 'none', borderBottom: '1px solid #eee', background: 'transparent', cursor: 'pointer', fontFamily: "'Montserrat'", fontSize: '0.85rem', color: '#333', fontWeight: 700 }}>
                                    Malas condiciones
                                </button>
                                <button onClick={() => handleReject('Libro más antiguo a 2001')} style={{ width: '100%', padding: '1rem', textAlign: 'center', border: 'none', borderBottom: '1px solid #eee', background: 'transparent', cursor: 'pointer', fontFamily: "'Montserrat'", fontSize: '0.85rem', color: '#333', fontWeight: 700 }}>
                                    Libro más antiguo a 2001
                                </button>
                                <button onClick={() => handleReject('Mala calidad de fotos')} style={{ width: '100%', padding: '1rem', textAlign: 'center', border: 'none', borderBottom: '1px solid #eee', background: 'transparent', cursor: 'pointer', fontFamily: "'Montserrat'", fontSize: '0.85rem', color: '#333', fontWeight: 700 }}>
                                    Mala calidad de fotos
                                </button>
                                <button onClick={() => handleReject('Libro no original')} style={{ width: '100%', padding: '1rem', textAlign: 'center', border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: "'Montserrat'", fontSize: '0.85rem', color: '#333', fontWeight: 700 }}>
                                    Libro no original
                                </button>
                            </div>
                        )}
                    </div>

                    <button
                        disabled={isSubmitting}
                        onClick={handleApprove}
                        style={{ flex: 1, padding: '1.2rem', backgroundColor: '#1B3022', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 800, cursor: 'pointer', letterSpacing: '0.05em' }}
                    >
                        {isSubmitting ? '...' : 'APROBAR'}
                    </button>
                </div>

            </div>

        </div>
    )
}
