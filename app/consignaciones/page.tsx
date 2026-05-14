import { supabase } from '@/lib/supabase'
import { partitionConsignacionUsers, PROFILES_CONSIGNACION_SELECT } from '@/lib/consignacionesPending'
import ConsignacionesClient from './ConsignacionesClient'

export const dynamic = 'force-dynamic';

export default async function ConsignacionesPage() {
  const { data: users, error: usersError } = await supabase
    .from('profiles')
    .select(PROFILES_CONSIGNACION_SELECT);

  if (usersError) {
    return <div style={{ padding: '2rem', color: 'red' }}>Error loading data: {usersError.message}</div>;
  }

  const { pending: pendingContracts, upToDate: upToDateContracts } = partitionConsignacionUsers(users || []);

  return <ConsignacionesClient pending={pendingContracts} upToDate={upToDateContracts} />;
}
