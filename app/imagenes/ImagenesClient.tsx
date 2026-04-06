'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

// ─── Types ─────────────────────────────────────────────────────────────────────

type Book = {
  id: string
  title: string
  author: string | null
  original_front_image_url: string | null
  publish_front_image_url: string | null
  publish_back_image_url: string | null
  link_amazon: string | null
  link_gandhi: string | null
  link_buscalibre: string | null
  link_sotano: string | null
}

// ─── ImageUploadSlot ───────────────────────────────────────────────────────────

function ImageUploadSlot({
  label,
  preview,
  existingUrl,
  onFileChange,
}: {
  label: string
  preview: string | null
  existingUrl?: string | null
  onFileChange: (file: File) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const displaySrc = preview || existingUrl || null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.6rem' }}>
      <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </p>
      <div
        onClick={() => inputRef.current?.click()}
        style={{
          width: '140px', height: '200px',
          borderRadius: '10px',
          border: displaySrc ? '2px solid #27ae60' : '2px dashed #ccc',
          overflow: 'hidden', backgroundColor: '#f9f9f9',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', transition: 'border-color 0.2s, transform 0.1s',
          position: 'relative',
        }}
        onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.02)')}
        onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
      >
        {displaySrc ? (
          <>
            <img src={displaySrc} alt={label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              backgroundColor: 'rgba(27,48,34,0.8)', color: 'white',
              fontSize: '0.65rem', fontWeight: 700, textAlign: 'center', padding: '0.4rem'
            }}>
              ✎ Cambiar
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', color: '#bbb', padding: '1.5rem' }}>
            <div style={{ fontSize: '2.2rem', marginBottom: '0.5rem' }}>📷</div>
            <div style={{ fontSize: '0.72rem', fontWeight: 600 }}>Subir {label}</div>
            <div style={{ fontSize: '0.62rem', color: '#ccc', marginTop: '0.3rem' }}>Click para seleccionar</div>
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={e => {
          const file = e.target.files?.[0]
          if (file) onFileChange(file)
          e.target.value = ''
        }}
      />
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function ImagenesClient({ books: initialBooks }: { books: Book[] }) {
  const router = useRouter()
  const [books, setBooks] = useState(initialBooks)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [backCoverFile, setBackCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [backCoverPreview, setBackCoverPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  const currentBook = books[currentIndex]
  const total = books.length
  const remaining = total - currentIndex

  // Avanza al siguiente libro (o al final)
  const advance = () => {
    setCoverFile(null)
    setBackCoverFile(null)
    setCoverPreview(null)
    setBackCoverPreview(null)

    if (currentIndex + 1 >= books.length) {
      // Todos procesados → recargar para ver si hay más
      router.refresh()
    } else {
      setCurrentIndex(prev => prev + 1)
    }
  }

  const handleFileChange = (field: 'cover' | 'back', file: File) => {
    const preview = URL.createObjectURL(file)
    if (field === 'cover') {
      setCoverFile(file)
      setCoverPreview(preview)
    } else {
      setBackCoverFile(file)
      setBackCoverPreview(preview)
    }
  }

  const handleSave = async () => {
    setUploading(true)
    try {
      const uploadFile = async (file: File, path: string): Promise<string> => {
        const { error } = await supabase.storage
          .from('books')
          .upload(path, file, { upsert: true, contentType: file.type })
        if (error) throw error
        const { data } = supabase.storage.from('books').getPublicUrl(path)
        return data.publicUrl
      }

      const updates: Record<string, string | number> = {
        status_code: 6, // Status 6 = Publicado (con imágenes)
      }

      if (coverFile) {
        const ext = coverFile.name.split('.').pop()
        updates.publish_front_image_url = await uploadFile(coverFile, `${currentBook.id}/publish_front.${ext}`)
      }
      if (backCoverFile) {
        const ext = backCoverFile.name.split('.').pop()
        updates.publish_back_image_url = await uploadFile(backCoverFile, `${currentBook.id}/publish_back.${ext}`)
      }

      const { error } = await supabase.from('books').update(updates).eq('id', currentBook.id)
      if (error) throw error

      advance()
    } catch (e: any) {
      alert('Error: ' + e.message)
    } finally {
      setUploading(false)
    }
  }


  // Links disponibles del libro actual
  const links = [
    currentBook.link_amazon     && { label: 'Amazon',     url: currentBook.link_amazon },
    currentBook.link_gandhi     && { label: 'Gandhi',     url: currentBook.link_gandhi },
    currentBook.link_buscalibre && { label: 'Buscalibre', url: currentBook.link_buscalibre },
    currentBook.link_sotano     && { label: 'El Sótano',  url: currentBook.link_sotano },
  ].filter(Boolean) as { label: string; url: string }[]

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F5F2E7', padding: '3rem 2rem', fontFamily: "'Montserrat', sans-serif" }}>

      {/* Header */}
      <header style={{ maxWidth: '900px', margin: '0 auto 2.5rem' }}>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2.2rem', color: '#1B3022', fontWeight: 900, marginBottom: '0.4rem' }}>
          Imágenes de Publicación
        </h1>
        <p style={{ color: '#666', fontSize: '0.9rem', margin: 0 }}>
          Sube la portada y contraportada para finalizar la publicación.
        </p>
      </header>

      <main style={{ maxWidth: '900px', margin: '0 auto' }}>

        {/* Contador de progreso */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{ flex: 1, height: '6px', backgroundColor: '#e0e0e0', borderRadius: '999px', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${((currentIndex) / total) * 100}%`,
              backgroundColor: '#1B3022',
              borderRadius: '999px',
              transition: 'width 0.5s ease'
            }} />
          </div>
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1B3022', whiteSpace: 'nowrap' }}>
            {currentIndex + 1} / {total}
          </span>
        </div>

        {/* Card principal del libro */}
        <div style={{
          backgroundColor: 'white', borderRadius: '20px',
          boxShadow: '0 8px 30px rgba(0,0,0,0.07)',
          overflow: 'hidden'
        }}>

          {/* Encabezado del libro */}
          <div style={{ padding: '2rem 2.5rem', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h2 style={{ margin: '0 0 0.3rem', fontSize: '1.4rem', fontWeight: 900, color: '#1B3022', fontFamily: "'Playfair Display', serif" }}>
                {currentBook.title}
              </h2>
              {currentBook.author && (
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#888', fontWeight: 500 }}>{currentBook.author}</p>
              )}
              {/* Links a tiendas */}
              {links.length > 0 && (
                <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.8rem', flexWrap: 'wrap' }}>
                  {links.map(({ label, url }) => (
                    <a key={label} href={url} target="_blank" rel="noopener noreferrer"
                      style={{
                        fontSize: '0.72rem', fontWeight: 700, color: '#1B3022',
                        backgroundColor: '#f0f4f1', padding: '0.25rem 0.6rem',
                        borderRadius: '999px', textDecoration: 'none',
                        border: '1px solid #d0ddd1'
                      }}>
                      {label} ↗
                    </a>
                  ))}
                </div>
              )}
            </div>
            <span style={{
              backgroundColor: '#FFF3CD', color: '#856404',
              fontSize: '0.72rem', fontWeight: 800,
              padding: '0.3rem 0.8rem', borderRadius: '999px', whiteSpace: 'nowrap'
            }}>
              {remaining} pendiente{remaining !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Zona de imágenes */}
          <div style={{ padding: '2.5rem', display: 'grid', gridTemplateColumns: 'auto 1fr 1fr', gap: '2.5rem', alignItems: 'start' }}>

            {/* Foto original del vendedor */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.6rem' }}>
              <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Foto vendedor
              </p>
              <div style={{
                width: '100px', height: '145px', borderRadius: '10px',
                border: '2px dashed #ddd', overflow: 'hidden',
                backgroundColor: '#f7f7f7', display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                {currentBook.original_front_image_url ? (
                  <img
                    src={currentBook.original_front_image_url}
                    alt="Original vendedor"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <span style={{ fontSize: '0.65rem', color: '#ccc', textAlign: 'center', padding: '0.5rem' }}>
                    Sin foto
                  </span>
                )}
              </div>
            </div>

            {/* Portada de publicación */}
            <ImageUploadSlot
              label="Portada"
              preview={coverPreview}
              existingUrl={currentBook.publish_front_image_url}
              onFileChange={file => handleFileChange('cover', file)}
            />

            {/* Contraportada de publicación */}
            <ImageUploadSlot
              label="Contraportada"
              preview={backCoverPreview}
              existingUrl={currentBook.publish_back_image_url}
              onFileChange={file => handleFileChange('back', file)}
            />
          </div>

          {/* Botones */}
          <div style={{
            padding: '1.5rem 2.5rem 2.5rem',
            display: 'flex', gap: '1rem'
          }}>
            <button
              onClick={handleSave}
              disabled={uploading}
              style={{
                flex: 1, padding: '1.1rem',
                backgroundColor: uploading ? '#aaa' : '#1B3022',
                color: 'white', border: 'none', borderRadius: '10px',
                fontWeight: 800, cursor: uploading ? 'not-allowed' : 'pointer',
                fontSize: '0.95rem', letterSpacing: '0.04em',
                transition: 'background-color 0.2s'
              }}
            >
              {uploading ? 'GUARDANDO...' : '💾 GUARDAR Y SIGUIENTE'}
            </button>
          </div>
        </div>

        {/* Navegación rápida entre libros */}
        {total > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.4rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
            {books.map((_, i) => (
              <div
                key={i}
                style={{
                  width: i === currentIndex ? '1.8rem' : '0.5rem',
                  height: '0.5rem',
                  borderRadius: '999px',
                  backgroundColor: i < currentIndex ? '#27ae60' : i === currentIndex ? '#1B3022' : '#ccc',
                  transition: 'all 0.3s ease',
                  cursor: 'default'
                }}
              />
            ))}
          </div>
        )}

      </main>
    </div>
  )
}
