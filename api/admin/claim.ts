import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin as adminClient } from '../../src/integrations/supabase/client.server';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
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

    const { count } = await adminClient.from('user_roles').select('*', { count: 'exact', head: true }).eq('role', 'admin');
    if ((count ?? 0) > 0) return res.json({ claimed: false });

    const { error } = await adminClient.from('user_roles').insert({ user_id: user.user.id, role: 'admin' });
    if (error) {
      console.error('claimAdmin failed', error);
      return res.status(500).json({ claimed: false });
    }
    return res.json({ claimed: true });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: err?.message ?? 'Server error' });
  }
}
