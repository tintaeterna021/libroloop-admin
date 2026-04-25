'use client';

type Order = {
  id: string;
  order_number: number;
  contact_name: string;
  contact_phone: string;
  total: number;
  shipping_cost: number;
  total_with_shipping: number;
  status_code: number;
  created_at: string;
  payment_confirmed_at: string | null;
  preparation_at: string | null;
  in_transit_at: string | null;
  delivered_at: string | null;
  payment_method: string;
};

export default function OrderDetailClient({ order, books, address }: { order: Order; books: any[]; address: any }) {
  const getStatusName = (status: number) => {
    switch (status) {
      case 1: return '🟡 Nuevos (Por confirmar pago)';
      case 2: return '🔵 Preparando (Empaque)';
      case 3: return '🟣 En Ruta';
      case 4: return '🟢 Entregados';
      default: return 'Desconocido';
    }
  };

  const openWhatsApp = () => {
    let message = '';
    const orderRef = `#LL-${order.order_number}`;

    switch (order.status_code) {
      case 1:
        const anticipo = (order.total_with_shipping * 0.1).toFixed(2);
        message = `¡Hola ${order.contact_name}! Hemos recibido tu pedido ${orderRef} en LibroLoop.\n\nPara poder apartar tu pedido, requerimos un anticipo del 10% ($${anticipo}).\n\nEstos son nuestros datos bancarios:\n- Banco: [TU BANCO]\n- Cuenta / CLABE: [TUS DATOS BANCARIOS]\n- Beneficiario: LibroLoop\n\nUna vez realizado, por favor compártenos tu comprobante por este medio para proseguir con el envío.`;
        break;
      case 2:
        const nextSunday = new Date();
        const daysUntilSunday = 7 - nextSunday.getDay();
        nextSunday.setDate(nextSunday.getDate() + (daysUntilSunday === 0 ? 7 : daysUntilSunday));
        const formattedDate = nextSunday.toLocaleDateString('es-MX', { day: 'numeric', month: 'long' });
        const restante = (order.total_with_shipping * 0.9).toFixed(2);
        const cashNote = order.payment_method === 'efectivo' ? ' Como tu pago será en efectivo, te pedimos de favor intentar tener el cambio exacto.' : '';
        const addressText = address
          ? `${address.street} ${address.external_number} ${address.internal_number ? `Int. ${address.internal_number}` : ''}, Col. ${address.neighborhood}, C.P. ${address.postal_code}`
          : 'Dirección no registrada';

        message = `¡Hola ${order.contact_name}! Queremos confirmarte que el pago de tu pedido ${orderRef} en LibroLoop ha sido recibido y ya estamos preparando todo para ti.\n\nTe recordamos que todos nuestros pedidos se entregan los días domingo. Tu pedido está programado para entregarse el próximo domingo ${formattedDate}. La hora exacta de entrega la confirmaremos más adelante.\n\nTu pedido será entregado en:\n📍 ${addressText}\n\n¿Nos podrías confirmar que esta dirección sea la correcta?\n\nQueda pendiente el pago restante de $${restante}.${cashNote}`;
        break;
      case 3:
        message = `¡Buenas noticias ${order.contact_name}! Tu pedido ${orderRef} de LibroLoop ya se encuentra en ruta y en camino hacia ti.`;
        break;
      case 4:
        message = `¡Hola ${order.contact_name}! Tu pedido ${orderRef} de LibroLoop ha sido marcado como entregado. ¡Esperamos que disfrutes muchísimo tu nueva lectura!\n\nTe invitamos a compartirnos tu experiencia de compra o fotos de tus nuevos libros en nuestros canales oficiales de Instagram o por este mismo medio (WhatsApp). ¡Nos encantará leerte!`;
        break;
      default:
        message = `¡Hola ${order.contact_name}! Tienes novedades sobre tu pedido ${orderRef} en LibroLoop.`;
    }

    let phoneNum = order.contact_phone?.trim() || '';
    if (phoneNum.length === 10) {
      phoneNum = `52${phoneNum}`;
    } else if (!phoneNum.startsWith('+')) {
      phoneNum = phoneNum.replace(/\D/g, '');
    } else {
      phoneNum = phoneNum.replace(/\D/g, '');
    }

    const url = `https://wa.me/${phoneNum}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };


  const booksNotStored = books.filter(b => b.storage_option === 'opcion1' || b.storage_option === 'opcion2');
  const booksStored = books.filter(b => b.storage_option === 'opcion0').sort((a, b) => a.title.localeCompare(b.title));

  const groupedNotStored = booksNotStored.reduce((acc, book) => {
    const seller = book.seller_name || 'Vendedor Desconocido';
    if (!acc[seller]) acc[seller] = [];
    acc[seller].push(book);
    return acc;
  }, {} as Record<string, any[]>);

  const openSellerWhatsApp = (sellerName: string, sellerBooks: any[]) => {
    let phoneNum = sellerBooks[0]?.seller_phone?.trim() || '';
    if (!phoneNum) {
      alert('El vendedor no tiene número de teléfono registrado.');
      return;
    }

    if (phoneNum.length === 10) {
      phoneNum = `52${phoneNum}`;
    } else if (!phoneNum.startsWith('+')) {
      phoneNum = phoneNum.replace(/\D/g, '');
    } else {
      phoneNum = phoneNum.replace(/\D/g, '');
    }

    const booksList = sellerBooks.map(b => `${b.title}`).join('\n');
    const message = `Hola, ${sellerName}\nAlguien desea comprar los siguientes ejemplares:\n${booksList}\nNos puedes confirmar que aún los tienes para poder proseguir con la venta y gestionar su recolección.`;

    const url = `https://wa.me/${phoneNum}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Fila Arriba: Detalles del Pedido */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '2rem', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1B3022', marginBottom: '1.5rem', borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>
            Información del Cliente
          </h2>
          <p style={{ margin: '0 0 0.5rem', color: '#555' }}><strong style={{ color: '#333' }}>Nombre:</strong> {order.contact_name}</p>
          <p style={{ margin: '0 0 0.5rem', color: '#555' }}><strong style={{ color: '#333' }}>Teléfono:</strong> {order.contact_phone}</p>

          {address && (
            <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#f9f9f9', borderRadius: '8px', border: '1px solid #eee' }}>
              <p style={{ margin: '0 0 0.5rem', color: '#333', fontWeight: 700, fontSize: '0.95rem' }}>Dirección de Envío:</p>
              <p style={{ margin: '0 0 0.25rem', color: '#555', fontSize: '0.9rem' }}>
                {address.street} {address.external_number} {address.internal_number ? `Int. ${address.internal_number}` : ''}
              </p>
              <p style={{ margin: '0 0 0.25rem', color: '#555', fontSize: '0.9rem' }}>
                Col. {address.neighborhood}, C.P. {address.postal_code}
              </p>
              {address.references_comments && (
                <p style={{ margin: '0', color: '#777', fontSize: '0.85rem', fontStyle: 'italic', marginTop: '0.5rem' }}>
                  Ref: {address.references_comments}
                </p>
              )}
            </div>
          )}

          <button
            onClick={openWhatsApp}
            style={{
              marginTop: '1rem',
              backgroundColor: '#25D366',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '0.8rem 1.5rem',
              fontSize: '0.9rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              transition: 'opacity 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
          >
            💬 Notificar por WhatsApp
          </button>
        </div>

        <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '2rem', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1B3022', marginBottom: '1.5rem', borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>
            Estado y Cobro
          </h2>
          <p style={{ margin: '0 0 0.5rem', color: '#555' }}><strong style={{ color: '#333' }}>Estado actual:</strong> {getStatusName(order.status_code)}</p>
          <p style={{ margin: '0 0 0.5rem', color: '#555' }}><strong style={{ color: '#333' }}>Método de pago:</strong> <span style={{ textTransform: 'capitalize' }}>{order.payment_method}</span></p>
          <p style={{ margin: '0 0 0.5rem', color: '#555' }}><strong style={{ color: '#333' }}>Fecha de creación:</strong> {new Date(order.created_at).toLocaleString('es-MX')}</p>
          <div style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: '#f9f9f9', borderRadius: '8px', border: '1px solid #eee' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ color: '#555' }}>Subtotal Libros:</span>
              <span style={{ fontWeight: 600 }}>${order.total || 0}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', paddingBottom: '0.5rem', borderBottom: '1px solid #ddd' }}>
              <span style={{ color: '#555' }}>Costo de Envío:</span>
              <span style={{ fontWeight: 600 }}>${order.shipping_cost || 0}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#333', fontSize: '1.1rem', fontWeight: 800 }}>Total:</span>
              <span style={{ color: '#333', fontSize: '1.1rem', fontWeight: 800 }}>${order.total_with_shipping}</span>
            </div>
            {order.status_code === 1 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px dashed #ddd' }}>
                <span style={{ color: '#555', fontWeight: 600 }}>Adelanto 10%:</span>
                <span style={{ fontWeight: 800, color: '#e67e22' }}>${(order.total_with_shipping * 0.1).toFixed(2)}</span>
              </div>
            )}
            {(order.status_code === 2 || order.status_code === 3) && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px dashed #ddd' }}>
                  <span style={{ color: '#555' }}>Adelanto 10%:</span>
                  <span style={{ fontWeight: 600, color: '#e74c3c' }}>- ${(order.total_with_shipping * 0.1).toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
                  <span style={{ color: '#333', fontSize: '1.1rem', fontWeight: 800 }}>Restante:</span>
                  <span style={{ color: '#333', fontSize: '1.1rem', fontWeight: 800 }}>${(order.total_with_shipping * 0.9).toFixed(2)}</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Fila Abajo: Libros */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        {/* Libros No Almacenados */}
        <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '2rem', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#e67e22', marginBottom: '1.5rem', borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>
            🏠 Por recolectar ({booksNotStored.length})
          </h2>
          {booksNotStored.length === 0 ? (
            <p style={{ color: '#888', fontStyle: 'italic', fontSize: '0.9rem' }}>No hay libros pendientes de recolección.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {Object.entries(groupedNotStored).map(([seller, sellerBooks]) => (
                <div key={seller} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.25rem', borderBottom: '2px solid #f9ebd9' }}>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#e67e22', margin: 0 }}>
                      👤 {seller}
                    </h3>
                    <button
                      onClick={() => openSellerWhatsApp(seller, sellerBooks as any[])}
                      style={{
                        backgroundColor: '#25D366',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '0.4rem 0.8rem',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        transition: 'opacity 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                      onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                    >
                      💬 Solicitar
                    </button>
                  </div>
                  {(sellerBooks as any[]).map((book: any) => (
                    <div key={book.id} style={{ display: 'flex', gap: '1rem', padding: '1rem', border: '1px solid #eee', borderRadius: '8px', backgroundColor: '#fffdfa' }}>
                      <div style={{ width: '60px', height: '80px', backgroundColor: '#f5f5f5', borderRadius: '4px', overflow: 'hidden', flexShrink: 0 }}>
                        {(book.publish_front_image_url || book.original_front_image_url) ? (
                          <img src={book.publish_front_image_url || book.original_front_image_url} alt={book.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ccc', fontSize: '0.8rem' }}>Sin Img</div>
                        )}
                      </div>
                      <div>
                        <p style={{ margin: '0 0 0.25rem', fontWeight: 700, color: '#1B3022', fontSize: '0.95rem' }}>{book.title}</p>
                        <p style={{ margin: '0 0 0.25rem', fontSize: '0.85rem', color: '#666' }}>{book.author}</p>
                        <p style={{ margin: '0 0 0.5rem', fontSize: '0.8rem', color: '#888' }}>ISBN: {book.isbn}</p>
                        <p style={{ margin: 0, fontWeight: 800, color: '#27ae60', fontSize: '0.95rem' }}>${book.sale_price}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Libros Almacenados */}
        <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '2rem', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#27ae60', marginBottom: '1.5rem', borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>
            📦 En Bodega ({booksStored.length})
          </h2>
          {booksStored.length === 0 ? (
            <p style={{ color: '#888', fontStyle: 'italic', fontSize: '0.9rem' }}>No hay libros de bodega en este pedido.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {booksStored.map((book) => (
                <div key={book.id} style={{ display: 'flex', gap: '1rem', padding: '1rem', border: '1px solid #eee', borderRadius: '8px', backgroundColor: '#f9fbf9' }}>
                  <div style={{ width: '60px', height: '80px', backgroundColor: '#f5f5f5', borderRadius: '4px', overflow: 'hidden', flexShrink: 0 }}>
                    {(book.publish_front_image_url || book.original_front_image_url) ? (
                      <img src={book.publish_front_image_url || book.original_front_image_url} alt={book.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ccc', fontSize: '0.8rem' }}>Sin Img</div>
                    )}
                  </div>
                  <div>
                    <p style={{ margin: '0 0 0.25rem', fontWeight: 700, color: '#1B3022', fontSize: '0.95rem' }}>{book.title}</p>
                    <p style={{ margin: '0 0 0.25rem', fontSize: '0.85rem', color: '#666' }}>{book.author}</p>
                    <p style={{ margin: '0 0 0.5rem', fontSize: '0.8rem', color: '#888' }}>ISBN: {book.isbn}</p>
                    <p style={{ margin: 0, fontWeight: 800, color: '#27ae60', fontSize: '0.95rem' }}>${book.sale_price}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
