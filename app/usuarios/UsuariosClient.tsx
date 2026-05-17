'use client';

import React, { useMemo, useState } from 'react';

export type ProfileRow = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  status_code?: number | null;
  created_at?: string | null;
};

type ColumnKey = 'name' | 'email' | 'phone';

export default function UsuariosClient({ initialProfiles }: { initialProfiles: ProfileRow[] }) {
  const [search, setSearch] = useState<Record<ColumnKey, string>>({
    name: '',
    email: '',
    phone: ''
  });

  const filtered = useMemo(() => {
    let rows = [...initialProfiles];
    (['name', 'email', 'phone'] as const).forEach((key) => {
      const q = search[key].trim().toLowerCase();
      if (!q) return;
      rows = rows.filter((p) => (p[key] ?? '').toLowerCase().includes(q));
    });
    return rows;
  }, [initialProfiles, search]);

  const setCol = (key: ColumnKey, value: string) => {
    setSearch((prev) => ({ ...prev, [key]: value }));
  };

  const cell = (v: string | null) => (v && v.trim() ? v : '—');

  return (
    <div style={{ padding: '2rem', fontFamily: "'Montserrat', sans-serif", minHeight: '100%', backgroundColor: '#F5F2E7' }}>
      <header style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2.2rem', color: '#1B3022', fontWeight: 900, margin: '0 0 0.5rem 0' }}>
          Directorio de usuarios
        </h1>
      </header>

      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 4px 15px rgba(0,0,0,0.06)',
          overflow: 'hidden'
        }}
      >
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #eee', color: '#555', fontSize: '0.9rem' }}>
          Mostrando <strong>{filtered.length}</strong> de {initialProfiles.length}
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#1B3022', color: 'white' }}>
                <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontWeight: 700 }}>Nombre</th>
                <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontWeight: 700 }}>Email</th>
                <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontWeight: 700 }}>Teléfono</th>
              </tr>
              <tr style={{ backgroundColor: '#f8f9f8' }}>
                {(['name', 'email', 'phone'] as const).map((key) => (
                  <th key={key} style={{ padding: '0.5rem 1rem', fontWeight: 400, borderBottom: '1px solid #e8ebe8' }}>
                    <input
                      type="search"
                      value={search[key]}
                      onChange={(e) => setCol(key, e.target.value)}
                      placeholder={`Buscar ${key === 'name' ? 'nombre' : key === 'email' ? 'email' : 'teléfono'}…`}
                      aria-label={`Filtrar por ${key}`}
                      style={{
                        width: '100%',
                        boxSizing: 'border-box',
                        padding: '0.45rem 0.6rem',
                        borderRadius: '6px',
                        border: '1px solid #ccd4cc',
                        fontFamily: "'Montserrat', sans-serif",
                        fontSize: '0.85rem'
                      }}
                    />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={3} style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>
                    No hay resultados con los filtros actuales.
                  </td>
                </tr>
              ) : (
                filtered.map((p) => {
                  const phoneDigits = p.phone ? p.phone.replace(/\D/g, '') : '';
                  return (
                    <tr key={p.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                      <td style={{ padding: '0.85rem 1rem', color: '#222' }}>{cell(p.name)}</td>
                      <td style={{ padding: '0.85rem 1rem', color: '#222' }}>
                        {p.email && p.email.trim() ? (
                          <a href={`mailto:${p.email.trim()}`} style={{ color: '#1B3022', textDecoration: 'underline' }}>
                            {p.email}
                          </a>
                        ) : '—'}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', color: '#222' }}>
                        {p.phone && p.phone.trim() ? (
                          <a href={`https://wa.me/${phoneDigits}`} target="_blank" rel="noopener noreferrer" style={{ color: '#25D366', textDecoration: 'none', fontWeight: 600 }}>
                            {p.phone}
                          </a>
                        ) : '—'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
