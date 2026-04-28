'use client';

import React, { useState, useMemo } from 'react';

type Book = {
  id: string;
  user_id: string;
  title: string;
  sale_price: number;
  status_code: number;
  internal_comment: string | null;
  created_at: string;
  storage_option: string | null;
  profiles: { email: string } | { email: string }[] | null;
};

const STATUS_MAP: Record<number, string> = {
  1: 'En revisión',
  2: 'Negado',
  4: 'Aprobado',
  5: 'Aceptado',
  6: 'Publicado',
  7: 'Apartado',
  8: 'Pago adelanto',
  9: 'Liquidado a LibroLoop',
  10: 'Liquidado a Vendedor',
  11: 'Dado de baja',
  12: 'Devuelto',
  13: 'Descuento aplicado'
};

const STORAGE_MAP: Record<string, string> = {
  '0': 'Bodega LibroLoop',
  '1': 'Bodega LibroLoop (por recolectar)',
  '2': 'Con el Vendedor',
};

type SortConfig = {
  key: string;
  direction: 'asc' | 'desc';
} | null;

export default function InventoryClient({ initialBooks }: { initialBooks: Book[] }) {
  const [books, setBooks] = useState<Book[]>(initialBooks);

  // Filters
  const [columnSearch, setColumnSearch] = useState<Record<string, string>>({});
  const [storageFilter, setStorageFilter] = useState<string>('todos');
  const [ageFilter, setAgeFilter] = useState<string>('todos');
  const [statusFilter, setStatusFilter] = useState<string>('todos');

  // Sorting
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);

  // Helper: calculate days in store
  const getDaysInStore = (dateString: string) => {
    const start = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getEmail = (profiles: Book['profiles']) => {
    if (!profiles) return '';
    if (Array.isArray(profiles)) return profiles[0]?.email || '';
    return profiles.email || '';
  };

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleColumnSearchChange = (key: string, value: string) => {
    setColumnSearch(prev => ({ ...prev, [key]: value }));
  };

  const filteredAndSortedBooks = useMemo(() => {
    let result = [...books];

    // Column Search
    Object.keys(columnSearch).forEach(key => {
      const query = columnSearch[key].toLowerCase();
      if (!query) return;

      result = result.filter(book => {
        let value = '';
        if (key === 'title') value = book.title || '';
        if (key === 'owner') value = getEmail(book.profiles) || book.user_id || '';
        if (key === 'price') value = String(book.sale_price || '');
        if (key === 'status') value = STATUS_MAP[book.status_code] || String(book.status_code);
        if (key === 'storage') value = STORAGE_MAP[book.storage_option || ''] || book.storage_option || '';
        return value.toLowerCase().includes(query);
      });
    });

    // Dropdown Filters
    if (storageFilter !== 'todos') {
      result = result.filter(book => book.storage_option === storageFilter);
    }
    if (statusFilter !== 'todos') {
      result = result.filter(book => String(book.status_code) === statusFilter);
    }
    if (ageFilter === 'mas_6_meses') {
      // > 180 days
      result = result.filter(book => getDaysInStore(book.created_at) > 180);
    }

    // Sort
    if (sortConfig !== null) {
      result.sort((a, b) => {
        let aVal: any = a[sortConfig.key as keyof Book];
        let bVal: any = b[sortConfig.key as keyof Book];

        // Specific handling for derived columns
        if (sortConfig.key === 'owner') {
          aVal = getEmail(a.profiles) || a.user_id;
          bVal = getEmail(b.profiles) || b.user_id;
        } else if (sortConfig.key === 'days') {
          aVal = getDaysInStore(a.created_at);
          bVal = getDaysInStore(b.created_at);
        } else if (sortConfig.key === 'status_name') {
          aVal = STATUS_MAP[a.status_code] || '';
          bVal = STATUS_MAP[b.status_code] || '';
        } else if (sortConfig.key === 'storage_name') {
          aVal = STORAGE_MAP[a.storage_option || ''] || '';
          bVal = STORAGE_MAP[b.storage_option || ''] || '';
        }

        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [books, columnSearch, storageFilter, ageFilter, statusFilter, sortConfig]);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F5F2E7', padding: '2rem', fontFamily: "'Montserrat', sans-serif" }}>
      <header style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2.2rem', color: '#1B3022', fontWeight: 900, marginBottom: '0.5rem' }}>
          Inventario General
        </h1>
        <p style={{ color: '#666', fontSize: '0.95rem' }}>Gestión avanzada de libros, filtros y estados operativos.</p>
      </header>



      <div style={{ backgroundColor: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
        {/* Table Wrapper for horizontal scroll if needed */}
        <div style={{ overflowX: 'auto', width: '100%' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ backgroundColor: '#1B3022', color: 'white' }}>
              <tr>
                <th style={{ padding: '1rem', borderBottom: '2px solid #ddd', minWidth: '250px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => handleSort('title')}>
                    <span>Título</span>
                    {sortConfig?.key === 'title' && (<span>{sortConfig.direction === 'asc' ? ' ↑' : ' ↓'}</span>)}
                  </div>
                  <input type="text" placeholder="Filtrar..." onChange={(e) => handleColumnSearchChange('title', e.target.value)} style={{ width: '100%', marginTop: '0.5rem', padding: '0.4rem', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid rgba(0,0,0,0.2)', backgroundColor: 'rgba(255, 255, 255, 0.95)', color: '#333', outline: 'none' }} onClick={(e) => e.stopPropagation()} />
                </th>
                <th style={{ padding: '1rem', borderBottom: '2px solid #ddd', minWidth: '180px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => handleSort('owner')}>
                    <span>Dueño (Vendedor)</span>
                    {sortConfig?.key === 'owner' && (<span>{sortConfig.direction === 'asc' ? ' ↑' : ' ↓'}</span>)}
                  </div>
                  <input type="text" placeholder="Filtrar..." onChange={(e) => handleColumnSearchChange('owner', e.target.value)} style={{ width: '100%', marginTop: '0.5rem', padding: '0.4rem', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid rgba(0,0,0,0.2)', backgroundColor: 'rgba(255, 255, 255, 0.95)', color: '#333', outline: 'none' }} onClick={(e) => e.stopPropagation()} />
                </th>
                <th style={{ padding: '1rem', borderBottom: '2px solid #ddd', minWidth: '120px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => handleSort('sale_price')}>
                    <span>Precio Venta</span>
                    {sortConfig?.key === 'sale_price' && (<span>{sortConfig.direction === 'asc' ? ' ↑' : ' ↓'}</span>)}
                  </div>
                  <input type="text" placeholder="Filtrar..." onChange={(e) => handleColumnSearchChange('price', e.target.value)} style={{ width: '100%', marginTop: '0.5rem', padding: '0.4rem', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid rgba(0,0,0,0.2)', backgroundColor: 'rgba(255, 255, 255, 0.95)', color: '#333', outline: 'none' }} onClick={(e) => e.stopPropagation()} />
                </th>
                <th style={{ padding: '1rem', borderBottom: '2px solid #ddd', minWidth: '130px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => handleSort('days')}>
                    <span>Días en Tienda</span>
                    {sortConfig?.key === 'days' && (<span>{sortConfig.direction === 'asc' ? ' ↑' : ' ↓'}</span>)}
                  </div>
                  <select value={ageFilter} onChange={(e) => setAgeFilter(e.target.value)} style={{ width: '100%', marginTop: '0.5rem', padding: '0.4rem', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid rgba(0,0,0,0.2)', backgroundColor: 'rgba(255, 255, 255, 0.95)', color: '#333', outline: 'none', cursor: 'pointer' }} onClick={(e) => e.stopPropagation()}>
                    <option value="todos">Todos</option>
                    <option value="mas_6_meses">&gt; 6 meses</option>
                  </select>
                </th>
                <th style={{ padding: '1rem', borderBottom: '2px solid #ddd', minWidth: '220px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => handleSort('status_name')}>
                    <span>Estatus</span>
                    {sortConfig?.key === 'status_name' && (<span>{sortConfig.direction === 'asc' ? ' ↑' : ' ↓'}</span>)}
                  </div>
                  <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ width: '100%', marginTop: '0.5rem', padding: '0.4rem', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid rgba(0,0,0,0.2)', backgroundColor: 'rgba(255, 255, 255, 0.95)', color: '#333', outline: 'none', cursor: 'pointer' }} onClick={(e) => e.stopPropagation()}>
                    <option value="todos">Todos</option>
                    {Object.entries(STATUS_MAP).map(([code, label]) => (
                      <option key={code} value={code}>{code} - {label}</option>
                    ))}
                  </select>
                </th>
                <th style={{ padding: '1rem', borderBottom: '2px solid #ddd', minWidth: '220px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => handleSort('storage_name')}>
                    <span>Almacenamiento</span>
                    {sortConfig?.key === 'storage_name' && (<span>{sortConfig.direction === 'asc' ? ' ↑' : ' ↓'}</span>)}
                  </div>
                  <select value={storageFilter} onChange={(e) => setStorageFilter(e.target.value)} style={{ width: '100%', marginTop: '0.5rem', padding: '0.4rem', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid rgba(0,0,0,0.2)', backgroundColor: 'rgba(255, 255, 255, 0.95)', color: '#333', outline: 'none', cursor: 'pointer' }} onClick={(e) => e.stopPropagation()}>
                    <option value="todos">Todos</option>
                    <option value="0">Bodega LL</option>
                    <option value="1">Bodega LL (recolectar)</option>
                    <option value="2">Con el Vendedor</option>
                  </select>
                </th>
                <th style={{ padding: '1rem', borderBottom: '2px solid #ddd', textAlign: 'center' }}>
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedBooks.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>No se encontraron libros.</td>
                </tr>
              ) : (
                filteredAndSortedBooks.map((book) => {
                  const days = getDaysInStore(book.created_at);
                  const statusName = STATUS_MAP[book.status_code] || 'Desconocido';
                  const storageName = STORAGE_MAP[book.storage_option || ''] || book.storage_option || 'N/A';

                  return (
                    <tr key={book.id} style={{ borderBottom: '1px solid #eee', transition: 'background-color 0.2s', ...({ ':hover': { backgroundColor: '#f9f9f9' } } as any) }}>
                      <td style={{ padding: '1rem', fontWeight: 600 }}>{book.title}</td>
                      <td style={{ padding: '1rem', fontSize: '0.9rem' }}>{getEmail(book.profiles) || 'Desconocido'}</td>
                      <td style={{ padding: '1rem', fontWeight: 700, color: '#1B3022' }}>
                        {book.sale_price != null ? `$${book.sale_price}` : '-'}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{
                          color: days > 180 ? '#c0392b' : '#27ae60',
                          fontWeight: days > 180 ? 800 : 600,
                          backgroundColor: days > 180 ? '#fceeee' : 'transparent',
                          padding: days > 180 ? '0.2rem 0.5rem' : '0',
                          borderRadius: '4px'
                        }}>
                          {days} días
                        </span>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{
                          backgroundColor: '#f1f1f1',
                          padding: '0.3rem 0.6rem',
                          borderRadius: '999px',
                          fontSize: '0.8rem',
                          fontWeight: 600
                        }}>
                          {book.status_code} - {statusName}
                        </span>
                      </td>
                      <td style={{ padding: '1rem', fontSize: '0.9rem' }}>{storageName}</td>
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        <div style={{ position: 'relative', display: 'inline-block' }}>
                          <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', padding: '0.2rem 0.5rem' }}>
                            ⋮
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ marginTop: '1rem', fontSize: '0.9rem', color: '#666', textAlign: 'right' }}>
        Total de registros: {filteredAndSortedBooks.length}
      </div>
    </div>
  );
}
