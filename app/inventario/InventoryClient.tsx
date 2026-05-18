'use client';

import React, { useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';

type Book = {
  id: string;
  user_id: string;
  title: string;
  sale_price: number;
  status_code: number;
  internal_comment: string | null;
  created_at: string;
  storage_option: number | null;
  original_front_image_url: string | null;
  original_back_image_url: string | null;
  publish_front_image_url: string | null;
  publish_back_image_url: string | null;
  purged_at: string | null;
  rejection_comment: string | null;
  deactivated_at: string | null;
  profiles: { phone: string } | { phone: string }[] | null;
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

const STORAGE_MAP: Record<number, string> = {
  0: 'Bodega LibroLoop',
  1: 'Bodega LibroLoop (por recolectar)',
  2: 'Con el Vendedor',
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

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isUpdating, setIsUpdating] = useState(false);

  // Modal Dar de baja
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [deactivateReason, setDeactivateReason] = useState('Se dañó en bodega');
  const [customDeactivateReason, setCustomDeactivateReason] = useState('');

  const handleRecolectar = async () => {
    // Filtrar solo los libros seleccionados que tengan storage_option === 1 (Bodega LL por recolectar)
    const eligibleBooks = books.filter(b => selectedIds.has(b.id) && b.storage_option === 1);
    if (eligibleBooks.length === 0) {
      alert('No hay libros seleccionados válidos para recolectar (deben estar en "Bodega LibroLoop (por recolectar)").');
      return;
    }

    if (!confirm(`¿Estás seguro de marcar ${eligibleBooks.length} libro(s) como recolectado(s)?`)) return;

    setIsUpdating(true);
    
    const idsToUpdate = eligibleBooks.map(b => b.id);
    
    // Actualizar en Supabase
    const { error } = await supabase
      .from('books')
      .update({ 
        storage_option: 0, 
        recolected_at: new Date().toISOString() 
      })
      .in('id', idsToUpdate);

    if (error) {
      console.error('Error recolectando libros:', error);
      alert('Hubo un error al actualizar los libros.');
    } else {
      // Actualizar estado local
      setBooks(prev => prev.map(book => {
        if (idsToUpdate.includes(book.id)) {
          return { ...book, storage_option: 0 };
        }
        return book;
      }));
      // Deseleccionar los actualizados
      setSelectedIds(prev => {
        const next = new Set(prev);
        idsToUpdate.forEach(id => next.delete(id));
        return next;
      });
      alert(`Se recolectaron ${eligibleBooks.length} libro(s) exitosamente.`);
    }
    
    setIsUpdating(false);
  };

  const handlePurgarFotos = async () => {
    const validStatuses = [2, 9, 10, 11];
    const eligibleBooks = books.filter(b => selectedIds.has(b.id) && validStatuses.includes(b.status_code) && !b.purged_at);
    
    if (eligibleBooks.length === 0) {
      alert('No hay libros seleccionados válidos para purgar que no hayan sido purgados previamente. (Deben tener estatus 2, 9, 10 o 11).');
      return;
    }

    if (!confirm(`¿Estás seguro de purgar las fotos de ${eligibleBooks.length} libro(s)? Las imágenes se eliminarán permanentemente de la base de datos y de la bodega (bucket).`)) return;

    setIsUpdating(true);

    let storageErrors = 0;
    let dbErrors = 0;

    const getFilePath = (url: string | null) => {
      if (!url) return null;
      const parts = url.split('/public/books/');
      if (parts.length > 1) {
        let path = parts[1];
        // Quitar parámetros tipo ?t=123
        path = path.split('?')[0];
        // Quitar fragmentos #
        path = path.split('#')[0];
        try {
          return decodeURIComponent(path);
        } catch (e) {
          return path;
        }
      }
      return null;
    };

    for (const book of eligibleBooks) {
      const filesToDelete: string[] = [];
      const updatePayload: any = { purged_at: new Date().toISOString() };

      // Mantener siempre: original_front_image_url
      // Eliminar: original_back_image_url, publish_front_image_url, publish_back_image_url
      const p1 = getFilePath(book.original_back_image_url);
      const p2 = getFilePath(book.publish_front_image_url);
      const p3 = getFilePath(book.publish_back_image_url);
      if (p1) filesToDelete.push(p1);
      if (p2) filesToDelete.push(p2);
      if (p3) filesToDelete.push(p3);
      
      updatePayload.original_back_image_url = null;
      updatePayload.publish_front_image_url = null;
      updatePayload.publish_back_image_url = null;

      // Delete from storage
      let hadStorageError = false;
      if (filesToDelete.length > 0) {
        const { data, error: storageError } = await supabase.storage.from('books').remove(filesToDelete);
        if (storageError) {
          console.error(`Error deleting files for book ${book.id}:`, storageError);
          storageErrors++;
          hadStorageError = true;
        } else if (!data || data.length === 0) {
          // Silently failed, probably RLS blocking DELETE
          console.error(`Error de permisos RLS o archivo inexistente en bucket para el libro ${book.id}`);
          storageErrors++;
          hadStorageError = true;
        }
      }

      // Update DB only if storage deletion was somewhat successful or we want to force it?
      // For safety, let's update DB anyway, but warn the user about storage errors.
      const { error: dbError } = await supabase.from('books').update(updatePayload).eq('id', book.id);
      if (dbError) {
        console.error(`Error updating book ${book.id}:`, dbError);
        dbErrors++;
      } else {
        // Update local state
        setBooks(prev => prev.map(b => b.id === book.id ? { ...b, ...updatePayload } : b));
      }
    }

    if (storageErrors > 0 || dbErrors > 0) {
      alert(`Terminado con errores.\nErrores de Bucket (Storage): ${storageErrors}\nErrores de Base de Datos: ${dbErrors}\n\n⚠️ Si los errores son de Storage, lo más probable es que falte agregar permisos de DELETE en las políticas (RLS) del bucket "books" en tu panel de Supabase.`);
    } else {
      alert(`Se purgaron fotos de ${eligibleBooks.length} libro(s) exitosamente.`);
      // Deseleccionar los actualizados
      setSelectedIds(prev => {
        const next = new Set(prev);
        eligibleBooks.forEach(b => next.delete(b.id));
        return next;
      });
    }

    setIsUpdating(false);
  };

  const handleDarDeBajaClick = () => {
    const validStatuses = [1, 4, 5, 6, 13];
    const eligibleBooks = books.filter(b => selectedIds.has(b.id) && validStatuses.includes(b.status_code));
    if (eligibleBooks.length === 0) {
      alert('No hay libros seleccionados válidos para dar de baja (deben tener estatus 1, 4, 5, 6 o 13).');
      return;
    }
    setShowDeactivateModal(true);
  };

  const confirmDarDeBaja = async () => {
    const validStatuses = [1, 4, 5, 6, 13];
    const eligibleBooks = books.filter(b => selectedIds.has(b.id) && validStatuses.includes(b.status_code));
    
    setIsUpdating(true);
    
    const finalReason = deactivateReason === 'Añadir comentario' ? customDeactivateReason : deactivateReason;
    const idsToUpdate = eligibleBooks.map(b => b.id);
    const now = new Date().toISOString();
    
    const { error } = await supabase
      .from('books')
      .update({ 
        status_code: 11, 
        rejection_comment: finalReason,
        deactivated_at: now
      })
      .in('id', idsToUpdate);

    if (error) {
      console.error('Error dando de baja:', error);
      alert('Hubo un error al dar de baja los libros.');
    } else {
      setBooks(prev => prev.map(book => {
        if (idsToUpdate.includes(book.id)) {
          return { ...book, status_code: 11, rejection_comment: finalReason, deactivated_at: now };
        }
        return book;
      }));
      setSelectedIds(prev => {
        const next = new Set(prev);
        idsToUpdate.forEach(id => next.delete(id));
        return next;
      });
      alert(`Se dieron de baja ${eligibleBooks.length} libro(s) exitosamente.`);
      setShowDeactivateModal(false);
      setDeactivateReason('Se dañó en bodega');
      setCustomDeactivateReason('');
    }
    
    setIsUpdating(false);
  };

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredAndSortedBooks.map((b) => b.id)));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Helper: calculate days in store
  const getDaysInStore = (dateString: string) => {
    const start = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getPhone = (profiles: Book['profiles']) => {
    if (!profiles) return '';
    if (Array.isArray(profiles)) return profiles[0]?.phone || '';
    return profiles.phone || '';
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
        if (key === 'owner') value = getPhone(book.profiles) || book.user_id || '';
        if (key === 'price') value = String(book.sale_price || '');
        if (key === 'status') value = STATUS_MAP[book.status_code] || String(book.status_code);
        if (key === 'storage') value = (book.storage_option !== null ? STORAGE_MAP[book.storage_option] : '') || String(book.storage_option ?? '');
        return value.toLowerCase().includes(query);
      });
    });

    // Dropdown Filters
    if (storageFilter !== 'todos') {
      result = result.filter(book => book.storage_option === parseInt(storageFilter, 10));
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
          aVal = getPhone(a.profiles) || a.user_id;
          bVal = getPhone(b.profiles) || b.user_id;
        } else if (sortConfig.key === 'days') {
          aVal = getDaysInStore(a.created_at);
          bVal = getDaysInStore(b.created_at);
        } else if (sortConfig.key === 'status_name') {
          aVal = STATUS_MAP[a.status_code] || '';
          bVal = STATUS_MAP[b.status_code] || '';
        } else if (sortConfig.key === 'storage_name') {
          aVal = a.storage_option !== null ? (STORAGE_MAP[a.storage_option] || '') : '';
          bVal = b.storage_option !== null ? (STORAGE_MAP[b.storage_option] || '') : '';
        }

        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [books, columnSearch, storageFilter, ageFilter, statusFilter, sortConfig]);

  // Derived selection state (depends on filteredAndSortedBooks)
  const isAllSelected =
    filteredAndSortedBooks.length > 0 &&
    filteredAndSortedBooks.every((b) => selectedIds.has(b.id));

  const isIndeterminate =
    !isAllSelected && filteredAndSortedBooks.some((b) => selectedIds.has(b.id));

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F5F2E7', padding: '2rem', fontFamily: "'Montserrat', sans-serif" }}>
      <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2.2rem', color: '#1B3022', fontWeight: 900, marginBottom: '0.5rem' }}>
            Inventario General
          </h1>
          <p style={{ color: '#666', fontSize: '0.95rem' }}>Gestión avanzada de libros, filtros y estados operativos.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button
            onClick={handleRecolectar}
            disabled={isUpdating || selectedIds.size === 0}
            style={{
              backgroundColor: isUpdating || selectedIds.size === 0 ? '#ccc' : '#4CAF82',
              color: 'white',
              border: 'none',
              padding: '0.8rem 1.5rem',
              borderRadius: '8px',
              fontWeight: 600,
              cursor: isUpdating || selectedIds.size === 0 ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              boxShadow: isUpdating || selectedIds.size === 0 ? 'none' : '0 4px 10px rgba(76, 175, 130, 0.3)'
            }}
            title="Cambiar estado a 'Bodega LibroLoop' y establecer fecha de recolección"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
            {isUpdating ? 'Procesando...' : 'Recolectar'}
          </button>
          <button
            onClick={handleDarDeBajaClick}
            disabled={isUpdating || selectedIds.size === 0}
            style={{
              backgroundColor: isUpdating || selectedIds.size === 0 ? '#ccc' : '#e67e22',
              color: 'white',
              border: 'none',
              padding: '0.8rem 1.5rem',
              borderRadius: '8px',
              fontWeight: 600,
              cursor: isUpdating || selectedIds.size === 0 ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              boxShadow: isUpdating || selectedIds.size === 0 ? 'none' : '0 4px 10px rgba(230, 126, 34, 0.3)'
            }}
            title="Dar de baja libros seleccionados (Estatus 1, 4, 5, 6, 13)"
          >
            ⚠️ Dar de baja
          </button>
          <button
            onClick={handlePurgarFotos}
            disabled={isUpdating || selectedIds.size === 0}
            style={{
              backgroundColor: isUpdating || selectedIds.size === 0 ? '#ccc' : '#e74c3c',
              color: 'white',
              border: 'none',
              padding: '0.8rem 1.5rem',
              borderRadius: '8px',
              fontWeight: 600,
              cursor: isUpdating || selectedIds.size === 0 ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              boxShadow: isUpdating || selectedIds.size === 0 ? 'none' : '0 4px 10px rgba(231, 76, 60, 0.3)'
            }}
            title="Eliminar fotos innecesarias para liberar espacio"
          >
            🗑️ Purgar Fotos
          </button>
        </div>
      </header>



      <div style={{ backgroundColor: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
        {/* Table Wrapper for horizontal scroll if needed */}
        <div style={{ overflowX: 'auto', width: '100%' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ backgroundColor: '#1B3022', color: 'white' }}>
              <tr>
                {/* Checkbox select-all */}
                <th style={{ padding: '1rem', borderBottom: '2px solid #ddd', width: '48px', textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    ref={(el) => { if (el) el.indeterminate = isIndeterminate; }}
                    onChange={toggleSelectAll}
                    style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#4CAF82' }}
                    title={isAllSelected ? 'Deseleccionar todos' : 'Seleccionar todos'}
                  />
                </th>
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
                <th style={{ padding: '1rem', borderBottom: '2px solid #ddd', textAlign: 'center', width: '80px' }}>
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedBooks.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>No se encontraron libros.</td>
                </tr>
              ) : (
                filteredAndSortedBooks.map((book) => {
                  const days = getDaysInStore(book.created_at);
                  const statusName = STATUS_MAP[book.status_code] || 'Desconocido';
                  const storageName = book.storage_option !== null ? (STORAGE_MAP[book.storage_option] || String(book.storage_option)) : 'N/A';

                  const isSelected = selectedIds.has(book.id);

                  return (
                    <tr
                      key={book.id}
                      style={{
                        borderBottom: '1px solid #eee',
                        transition: 'background-color 0.15s',
                        backgroundColor: isSelected ? '#eef7f2' : 'transparent',
                      }}
                    >
                      {/* Checkbox individual */}
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectOne(book.id)}
                          style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#4CAF82' }}
                        />
                      </td>
                      <td style={{ padding: '1rem', fontWeight: 600 }}>{book.title}</td>
                      <td style={{ padding: '1rem', fontSize: '0.9rem' }}>{getPhone(book.profiles) || 'Desconocido'}</td>
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
                        <button
                          title="Ver detalles"
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '0.3rem',
                            borderRadius: '6px',
                            color: '#1B3022',
                            transition: 'background-color 0.15s',
                            lineHeight: 1,
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#e8f5ee')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                            <circle cx="12" cy="12" r="3"/>
                          </svg>
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ marginTop: '1rem', fontSize: '0.9rem', color: '#666', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          {selectedIds.size > 0 && (
            <span style={{ fontWeight: 600, color: '#1B3022', backgroundColor: '#eef7f2', padding: '0.4rem 0.8rem', borderRadius: '999px', display: 'inline-block' }}>
              {selectedIds.size} {selectedIds.size === 1 ? 'libro seleccionado' : 'libros seleccionados'}
            </span>
          )}
        </div>
        <div>
          Total de registros: {filteredAndSortedBooks.length}
        </div>
      </div>

      {/* Modal Dar de baja */}
      {showDeactivateModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white', padding: '2rem', borderRadius: '12px',
            width: '90%', maxWidth: '400px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
          }}>
            <h2 style={{ fontFamily: "'Playfair Display', serif", marginBottom: '1rem', color: '#1B3022' }}>Dar de baja libros</h2>
            <p style={{ marginBottom: '1rem', color: '#666' }}>
              Selecciona el motivo por el cual quieres dar de baja los libros seleccionados.
            </p>
            
            <select 
              value={deactivateReason} 
              onChange={(e) => setDeactivateReason(e.target.value)}
              style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #ccc', marginBottom: '1rem', fontFamily: 'inherit' }}
            >
              <option value="Se dañó en bodega">Se dañó en bodega</option>
              <option value="Devolución">Devolución</option>
              <option value="Más antiguo de 25 años">Más antiguo de 25 años</option>
              <option value="Error de procesamiento">Error de procesamiento</option>
              <option value="Añadir comentario">Añadir comentario (Otro)</option>
            </select>

            {deactivateReason === 'Añadir comentario' && (
              <textarea 
                value={customDeactivateReason} 
                onChange={(e) => setCustomDeactivateReason(e.target.value)}
                placeholder="Escribe el motivo aquí..."
                style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #ccc', marginBottom: '1rem', fontFamily: 'inherit', minHeight: '80px', resize: 'vertical' }}
              />
            )}

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button 
                onClick={() => setShowDeactivateModal(false)}
                style={{ padding: '0.8rem 1.5rem', borderRadius: '8px', border: '1px solid #ccc', backgroundColor: 'transparent', cursor: 'pointer', fontWeight: 600 }}
              >
                Cancelar
              </button>
              <button 
                onClick={confirmDarDeBaja}
                disabled={isUpdating || (deactivateReason === 'Añadir comentario' && !customDeactivateReason.trim())}
                style={{ 
                  padding: '0.8rem 1.5rem', borderRadius: '8px', border: 'none', 
                  backgroundColor: isUpdating || (deactivateReason === 'Añadir comentario' && !customDeactivateReason.trim()) ? '#ccc' : '#e74c3c', 
                  color: 'white', cursor: isUpdating || (deactivateReason === 'Añadir comentario' && !customDeactivateReason.trim()) ? 'not-allowed' : 'pointer', fontWeight: 600 
                }}
              >
                {isUpdating ? 'Procesando...' : 'Confirmar Baja'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
