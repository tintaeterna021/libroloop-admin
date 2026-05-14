import { supabase } from '@/lib/supabase';
import UsuariosClient from './UsuariosClient';

export const dynamic = 'force-dynamic';

export default async function UsuariosPage() {
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, name, email, phone, status_code, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    return (
      <div style={{ padding: '2rem', color: '#c0392b', fontFamily: "'Montserrat', sans-serif" }}>
        Error al cargar usuarios: {error.message}
      </div>
    );
  }

  return <UsuariosClient initialProfiles={profiles ?? []} />;
}
