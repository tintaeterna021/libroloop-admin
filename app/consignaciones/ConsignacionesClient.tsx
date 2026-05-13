'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type UserData = {
  id: string;
  name: string;
  email: string;
  relevantBooksCount: number;
  relevantBooks: any[];
  latestContract: {
    id: string;
    created_at: string;
    pdf_url: string;
  } | null;
  isPending: boolean;
};

export default function ConsignacionesClient({ pending, upToDate }: { pending: UserData[], upToDate: UserData[] }) {
  const [activeTab, setActiveTab] = useState<'pending' | 'uptodate'>('pending');
  const [generatingUserId, setGeneratingUserId] = useState<string | null>(null);

  const formatDateEsp = (date: Date) => {
    const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    return `${date.getDate()} de ${meses[date.getMonth()]} de ${date.getFullYear()}`;
  };

  const handleGenerateContract = async (user: UserData) => {
    try {
      setGeneratingUserId(user.id);

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;
      const margin = 20;

      // Generar datos
      const folio = Math.floor(1000 + Math.random() * 9000).toString();
      const fechaInicio = new Date();
      const fechaFin = new Date();
      fechaFin.setFullYear(fechaFin.getFullYear() + 2);

      const strFechaInicio = formatDateEsp(fechaInicio);
      const strFechaFin = formatDateEsp(fechaFin);

      // Título
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('ACUERDO DE CONSIGNACIÓN DE LIBROS', pageWidth / 2, margin, { align: 'center' });

      // Cabecera
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      let y = margin + 10;
      doc.text(`• Folio del Acuerdo: ${folio}`, margin, y); y += 6;
      doc.text(`• Vendedor (Consignante): ${user.name || 'Usuario'}`, margin, y); y += 6;
      doc.text(`• Consignatario: Libro Loop`, margin, y); y += 6;
      doc.text(`• Fecha de Inicio: ${strFechaInicio}`, margin, y); y += 6;
      doc.text(`• Fecha de Finalización: ${strFechaFin}`, margin, y); y += 10;

      // Sección 1
      doc.setFont('helvetica', 'bold');
      doc.text('1. Objeto del Acuerdo', margin, y); y += 6;
      doc.setFont('helvetica', 'normal');
      const text1 = `El presente documento formaliza la recepción de los libros detallados a continuación (en adelante, "El Inventario") para su gestión de venta en consignación por parte de Libro Loop (El Consignatario), en nombre de ${user.name || 'Usuario'} (El Vendedor), bajo los siguientes términos y condiciones.`;
      const lines1 = doc.splitTextToSize(text1, pageWidth - margin * 2);
      doc.text(lines1, margin, y);
      y += (lines1.length * 5) + 5;

      // Sección 2
      doc.setFont('helvetica', 'bold');
      doc.text('2. Inventario de Libros Recibidos', margin, y); y += 6;
      doc.setFont('helvetica', 'normal');
      const text2 = 'A continuación, se detallan los libros entregados por El Vendedor, junto con su precio de venta al público y la ganancia exacta para El Vendedor en el periodo actual.';
      const lines2 = doc.splitTextToSize(text2, pageWidth - margin * 2);
      doc.text(lines2, margin, y);
      y += (lines2.length * 5) + 5;

      // Tabla de libros
      const tableData = user.relevantBooks.map(b => [
        b.title || 'Sin título',
        `$ ${Number(b.seller_payout_amount || 0).toFixed(2)}`,
        b.recolected_at ? new Date(b.recolected_at).toLocaleDateString() : (b.created_at ? new Date(b.created_at).toLocaleDateString() : 'N/A')
      ]);

      autoTable(doc, {
        startY: y,
        head: [['Título del Libro', 'Ganancia (MXN)', 'Fecha Recibido']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [27, 48, 34] }, // Verde oscuro #1B3022
        margin: { left: margin, right: margin }
      });

      y = (doc as any).lastAutoTable.finalY + 10;

      // Validar si necesitamos nueva página
      if (y > 250) { doc.addPage(); y = margin; }

      // Sección 3
      doc.setFont('helvetica', 'bold');
      doc.text('3. Términos y Condiciones', margin, y); y += 6;
      doc.setFont('helvetica', 'normal');

      const terminos = [
        "Cláusula 1: Cuidado y Almacenamiento. El Consignatario se compromete a almacenar El Inventario en un lugar limpio, seco y seguro, tratándolo con el máximo cuidado para preservar su condición actual.",
        "Cláusula 2: Proceso de Venta y Notificación. Por cada libro vendido, El Vendedor recibirá una notificación inmediata vía WhatsApp y/o el medio de comunicación acordado. Dicha notificación incluirá el título del libro vendido y la ganancia exacta generada.",
        "Cláusula 3: Pagos. La ganancia correspondiente al Vendedor será transferida a la cuenta bancaria proporcionada dentro de un plazo de 2 días hábiles posteriores a la confirmación de la entrega del libro al comprador final.",
        "Cláusula 4: Duración, Renovación y Gestión de Inventario.\n• 4.1 Vigencia: Este acuerdo tiene una vigencia de 24 meses (2 años), comenzando en la Fecha de Inicio y terminando en la Fecha de Finalización estipuladas.\n• 4.2 Renovación: 30 días antes de la Fecha de Finalización, El Consignatario contactará al Vendedor para ofrecer la renovación del acuerdo por un nuevo periodo de 24 meses. Si El Vendedor acepta, se generará un nuevo acuerdo con los precios y ganancias actualizados según el valor de mercado de los libros en ese momento.\n• 4.3 Libros Expirados por Antigüedad: Nuestro catálogo mantiene una política de aceptar libros con una antigüedad máxima de 25 años desde su publicación. En cada renovación, los libros del inventario que superen esta antigüedad no serán elegibles para el nuevo acuerdo. El Consignatario notificará al Vendedor cuáles son estos libros para coordinar su devolución.\n• 4.4 Gestión de Libros no Renovados o Expirados: Si los libros no son renovados o han expirado por antigüedad, El Vendedor tendrá 30 días para coordinar su recolección. Si no se da respuesta o no se recogen en este plazo, los libros entrarán en liquidación y El Vendedor renuncia a cualquier ganancia futura sobre ellos.\n• 4.5 Devolución Anticipada: El Vendedor puede solicitar la devolución de sus libros no vendidos en cualquier momento, con un preaviso de 15 días hábiles para gestionar su retiro de nuestro catálogo y almacén.",
        "Cláusula 5: Libros No Aptos. Si durante el proceso se detecta que un libro no es apto para la venta (ej. daños no vistos previamente, indicios de piratería), se notificará de inmediato al Vendedor y el libro será retirado del inventario para su pronta devolución."
      ];

      for (const termino of terminos) {
        const lines = doc.splitTextToSize(termino, pageWidth - margin * 2);
        if (y + (lines.length * 5) > 280) {
          doc.addPage();
          y = margin;
        }
        doc.text(lines, margin, y);
        y += (lines.length * 5) + 3;
      }
      y += 5;

      if (y > 240) { doc.addPage(); y = margin; }

      // Sección 4
      doc.setFont('helvetica', 'bold');
      doc.text('4. Aceptación del Acuerdo', margin, y); y += 6;
      doc.setFont('helvetica', 'normal');
      const text4 = `Para activar este acuerdo y que podamos poner sus libros a la venta, le solicitamos amablemente que responda al mensaje donde recibió este PDF con la siguiente frase:\n\n"Estoy de acuerdo con los términos y condiciones del Acuerdo de Consignación con Folio ${folio}."\n\nSu respuesta servirá como aceptación formal de todo lo expuesto en este documento.\n\nLibro Loop`;
      const lines4 = doc.splitTextToSize(text4, pageWidth - margin * 2);
      doc.text(lines4, margin, y);

      // Obtener el blob del PDF
      const pdfBlob = doc.output('blob');
      const file = new File([pdfBlob], `contrato_${folio}_${user.id}.pdf`, { type: 'application/pdf' });

      // 1. Subir al bucket
      const fileName = `${user.id}_${Date.now()}.pdf`;
      const { error: uploadError } = await supabase.storage
        .from('contratos-consignacion')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('contratos-consignacion')
        .getPublicUrl(fileName);

      // 2. Insertar en la tabla contratos_consignacion
      const { error: insertError } = await supabase
        .from('contratos_consignacion')
        .insert({
          user_id: user.id,
          pdf_url: publicUrl
        });

      if (insertError) throw insertError;

      alert('Contrato generado y guardado exitosamente.');
      window.location.reload();

    } catch (error: any) {
      console.error('Error generating contract:', error);
      alert('Error al generar el contrato: ' + error.message);
    } finally {
      setGeneratingUserId(null);
    }
  };

  const renderUserCard = (user: UserData) => (
    <div key={user.id} style={{
      backgroundColor: 'white',
      padding: '1.5rem',
      borderRadius: '12px',
      boxShadow: '0 4px 15px rgba(0,0,0,0.03)',
      marginBottom: '1rem',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }}>
      <div>
        <h3 style={{ margin: '0 0 0.5rem 0', fontFamily: "'Montserrat', sans-serif", color: '#1B3022' }}>
          {user.name || 'Sin Nombre'} <span style={{ fontSize: '0.9rem', color: '#666', fontWeight: 400 }}></span>
        </h3>
        <p style={{ margin: '0', fontSize: '0.9rem', color: '#555' }}>
          Libros en bodega: <strong>{user.relevantBooksCount}</strong>
        </p>
        {user.latestContract && (
          <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem', color: '#777' }}>
            Último contrato: {new Date(user.latestContract.created_at).toLocaleDateString()}
          </p>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end' }}>
        {user.isPending ? (
          <>
            <span style={{ backgroundColor: '#fceeee', color: '#c0392b', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600 }}>
              Pendiente por generar
            </span>
            <button
              onClick={() => handleGenerateContract(user)}
              disabled={generatingUserId === user.id}
              style={{
                backgroundColor: '#1B3022',
                color: 'white',
                padding: '0.5rem 1rem',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.9rem',
                cursor: generatingUserId === user.id ? 'not-allowed' : 'pointer',
                opacity: generatingUserId === user.id ? 0.7 : 1,
                display: 'inline-block',
                fontWeight: 600
              }}
            >
              {generatingUserId === user.id ? 'Generando...' : 'Generar Contrato PDF'}
            </button>
          </>
        ) : (
          <>
            <span style={{ backgroundColor: '#eefcf1', color: '#27ae60', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600 }}>
              Al día
            </span>
            {user.latestContract?.pdf_url && (
              <a
                href={user.latestContract.pdf_url}
                target="_blank"
                rel="noreferrer"
                style={{
                  backgroundColor: '#f1f1f1',
                  color: '#333',
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  fontSize: '0.9rem',
                  textDecoration: 'none',
                  fontWeight: 600
                }}
              >
                Ver Contrato
              </a>
            )}
          </>
        )}
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F5F2E7', padding: '2rem', fontFamily: "'Montserrat', sans-serif" }}>
      <header style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2.2rem', color: '#1B3022', fontWeight: 900, marginBottom: '0.5rem' }}>
          Contratos de Consignación
        </h1>
        <p style={{ color: '#666', fontSize: '0.95rem' }}>
          Gestión de contratos para usuarios con libros en bodega LibroLoop.
        </p>
      </header>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        <button
          onClick={() => setActiveTab('pending')}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: activeTab === 'pending' ? '#1B3022' : 'white',
            color: activeTab === 'pending' ? 'white' : '#1B3022',
            border: 'none',
            borderRadius: '8px',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 2px 5px rgba(0,0,0,0.05)'
          }}
        >
          Pendientes ({pending.length})
        </button>
        <button
          onClick={() => setActiveTab('uptodate')}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: activeTab === 'uptodate' ? '#1B3022' : 'white',
            color: activeTab === 'uptodate' ? 'white' : '#1B3022',
            border: 'none',
            borderRadius: '8px',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 2px 5px rgba(0,0,0,0.05)'
          }}
        >
          Al día ({upToDate.length})
        </button>
      </div>

      <div>
        {activeTab === 'pending' && (
          pending.length === 0 ? (
            <p style={{ color: '#888' }}>No hay usuarios pendientes de contrato.</p>
          ) : (
            pending.map(renderUserCard)
          )
        )}

        {activeTab === 'uptodate' && (
          upToDate.length === 0 ? (
            <p style={{ color: '#888' }}>No hay usuarios con contratos al día.</p>
          ) : (
            upToDate.map(renderUserCard)
          )
        )}
      </div>
    </div>
  );
}
