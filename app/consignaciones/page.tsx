import { supabase } from '@/lib/supabase'
import ConsignacionesClient from './ConsignacionesClient'

export const dynamic = 'force-dynamic';

export default async function ConsignacionesPage() {
  const { data: users, error: usersError } = await supabase
    .from('profiles')
    .select(`
      id,
      name,
      email,
      books (
        id,
        storage_option,
        status_code,
        recolected_at,
        title,
        seller_payout_amount
      ),
      contratos_consignacion (
        id,
        created_at,
        pdf_url,
        folio
      )
    `);

  if (usersError) {
    return <div style={{ padding: '2rem', color: 'red' }}>Error loading data: {usersError.message}</div>;
  }

  const pendingContracts: any[] = [];
  const upToDateContracts: any[] = [];

  for (const user of users || []) {
    // Todos los libros en bodega (storage_option '0') con status entre 6 y 9
    const allStorageBooks = user.books.filter((b: any) => 
      b.storage_option === '0' && 
      [6, 7, 8, 9].includes(b.status_code)
    );

    if (allStorageBooks.length === 0) continue; 

    // Obtener el contrato más reciente
    const sortedContracts = user.contratos_consignacion?.sort((a: any, b: any) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    ) || [];

    const latestContractDate = sortedContracts.length > 0 
      ? new Date(sortedContracts[0].created_at).getTime() 
      : 0;

    // Un usuario está pendiente si TIENE AL MENOS UN LIBRO cuya recolected_at sea posterior al último contrato
    const hasNewerBooks = allStorageBooks.some((b: any) => {
      if (!b.recolected_at) return false;
      return new Date(b.recolected_at).getTime() > latestContractDate;
    });

    // Si no tiene contrato previo, también está pendiente
    const isPending = sortedContracts.length === 0 || hasNewerBooks;

    const userData = {
      ...user,
      relevantBooksCount: allStorageBooks.length,
      relevantBooks: allStorageBooks, // Siempre pasamos todos los libros en bodega para el PDF
      latestContract: sortedContracts[0] || null,
      isPending
    };

    if (isPending) {
      pendingContracts.push(userData);
    } else {
      upToDateContracts.push(userData);
    }
  }

  return <ConsignacionesClient pending={pendingContracts} upToDate={upToDateContracts} />;
}
