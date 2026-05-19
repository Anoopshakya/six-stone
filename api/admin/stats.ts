import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin as adminClient } from '../../src/integrations/supabase/client.server';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
    const token = auth.replace('Bearer ', '');

    const SUPABASE_URL = process.env.SUPABASE_URL!;
    const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
    const userClient = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY!, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { storage: undefined },
    });

    const { data: user } = await userClient.auth.getUser();
    if (!user?.user?.id) return res.status(401).json({ error: 'Unauthorized' });

    const { data: isAdmin } = await userClient.from('user_roles').select('id').eq('user_id', user.user.id).eq('role', 'admin').maybeSingle();
    if (!isAdmin) return res.status(403).json({ error: 'Forbidden' });

    const [{ count: total }, { count: attended }, { data: settings }] = await Promise.all([
      adminClient.from('registrations').select('*', { count: 'exact', head: true }),
      adminClient.from('registrations').select('*', { count: 'exact', head: true }).eq('status', 'attended'),
      adminClient.from('event_settings').select('seat_cap').eq('id', 1).single(),
    ]);
    const cap = (settings as any)?.seat_cap ?? 150;
    return res.json({ total: total ?? 0, attended: attended ?? 0, seatsLeft: Math.max(0, cap - (total ?? 0)), cap });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: err?.message ?? 'Server error' });
  }
}
