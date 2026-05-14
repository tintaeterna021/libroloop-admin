/** Misma forma de consulta que en consignaciones (perfiles con libros y contratos). */
export const PROFILES_CONSIGNACION_SELECT = `
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
`;

type UserRow = {
  id: string;
  name?: string | null;
  email?: string | null;
  books?: any[];
  contratos_consignacion?: any[];
};

/**
 * Replica la lógica de app/consignaciones: usuarios con libros en bodega (0, status 6–9)
 * pendientes de contrato si no tienen contrato o hay libro recolectado después del último contrato.
 */
export function partitionConsignacionUsers(users: UserRow[]) {
  const pending: any[] = [];
  const upToDate: any[] = [];

  for (const user of users) {
    const allStorageBooks = (user.books ?? []).filter(
      (b: any) => b.storage_option === '0' && [6, 7, 8, 9].includes(b.status_code)
    );

    if (allStorageBooks.length === 0) continue;

    const sortedContracts = [...(user.contratos_consignacion ?? [])].sort(
      (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    const latestContractDate =
      sortedContracts.length > 0 ? new Date(sortedContracts[0].created_at).getTime() : 0;

    const hasNewerBooks = allStorageBooks.some((b: any) => {
      if (!b.recolected_at) return false;
      return new Date(b.recolected_at).getTime() > latestContractDate;
    });

    const isPending = sortedContracts.length === 0 || hasNewerBooks;

    const userData = {
      ...user,
      relevantBooksCount: allStorageBooks.length,
      relevantBooks: allStorageBooks,
      latestContract: sortedContracts[0] || null,
      isPending
    };

    if (isPending) pending.push(userData);
    else upToDate.push(userData);
  }

  return { pending, upToDate };
}
