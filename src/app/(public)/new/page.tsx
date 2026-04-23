import { createClient } from '@/lib/supabase/server';
import { fetchPresets } from '@/lib/requests';
import NewRequestForm from './NewRequestForm';
import type { Store } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function NewRequestPage() {
  const supabase = await createClient();
  const [{ data: stores }, presets] = await Promise.all([
    supabase.from('stores').select('*').order('ord').order('id'),
    fetchPresets(supabase).catch(() => []),
  ]);

  return (
    <NewRequestForm
      stores={(stores ?? []) as Store[]}
      presets={presets}
    />
  );
}
