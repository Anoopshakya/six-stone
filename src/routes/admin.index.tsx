import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, useEffect, useCallback } from "react";
import { Search, Download, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { listRegistrations, getAdminStats, claimAdminIfNone } from "@/lib/event.functions";

export const Route = createFileRoute("/admin/")({ component: Dashboard });

function Dashboard() {
  // replaced server functions with REST endpoints
  async function list() {
    const token = await (await import('@/integrations/supabase/client')).supabase.auth.getSession().then(r => r.data.session?.access_token);
    const res = await fetch('/api/admin/list', { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    if (!res.ok) throw new Error('Failed to load list');
    return (await res.json()).rows;
  }
  async function stats() {
    const token = await (await import('@/integrations/supabase/client')).supabase.auth.getSession().then(r => r.data.session?.access_token);
    const res = await fetch('/api/admin/stats', { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    if (!res.ok) throw new Error('Failed to load stats');
    return await res.json();
  }
  const [q, setQ] = useState("");
  const [statsData, setStatsData] = useState<any | null>(null);
  const [listData, setListData] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // attempt claim (no-op if already claimed)
      try {
        const session = await (await import('@/integrations/supabase/client')).supabase.auth.getSession();
        const token = session.data.session?.access_token;
        await fetch('/api/admin/claim', { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {} });
      } catch {}

      const s = await stats();
      setStatsData(s);
      const rows = await list();
      setListData(rows);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load admin data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filtered = useMemo(() => {
    const rows = listData ?? [];
    if (!q.trim()) return rows;
    const s = q.toLowerCase();
    return rows.filter((r) =>
      [r.full_name, r.email, r.company, r.designation]
        .join(" ").toLowerCase().includes(s),
    );
  }, [listData, q]);

  function exportCsv() {
    const rows = filtered;
    const headers = ["Name","Email","Phone","Company","Designation","Attendees","Status","Registered","Attended"];
    const csv = [headers.join(",")]
      .concat(rows.map(r => [
        r.full_name, r.email, r.phone, r.company, r.designation, r.attendees_count,
        r.status, r.registered_at, r.attended_at ?? "",
      ].map(v => `"${String(v ?? "").replace(/"/g,'""')}"`).join(",")))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "registrants.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-12 text-center">
        <h2 className="font-display text-2xl mb-2">Access denied</h2>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button onClick={() => loadData()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <Stat label="Registered" value={statsData?.total ?? "—"} />
        <Stat label="Attended" value={statsData?.attended ?? "—"} accent />
        <Stat label="Seats left" value={statsData?.seatsLeft ?? "—"} />
        <Stat label="Capacity" value={statsData?.cap ?? "—"} />
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email, firm…" className="pl-9" />
        </div>
        <Link to="/admin/scan" className="text-sm text-gold hover:underline">Open scanner →</Link>
        <Button variant="outline" size="sm" onClick={exportCsv}>
          <Download className="h-4 w-4 mr-1" /> CSV
        </Button>
      </div>

      <div className="border border-border rounded-md overflow-hidden bg-card">
        <table className="w-full text-sm">
          <thead className="bg-secondary text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-3">Name</th>
              <th className="text-left px-4 py-3">Firm · Role</th>
              <th className="text-left px-4 py-3 hidden md:table-cell">Attendees</th>
              <th className="text-left px-4 py-3 hidden lg:table-cell">Email</th>
              <th className="text-left px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-t border-border hover:bg-secondary/40">
                <td className="px-4 py-3">
                  <div className="font-medium">{r.full_name}</div>
                  <div className="text-xs text-muted-foreground md:hidden">{r.company}</div>
                </td>
                <td className="px-4 py-3">
                  <div>{r.company}</div>
                  <div className="text-xs text-muted-foreground">{r.designation}</div>
                </td>
                <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{r.attendees_count}</td>
                <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">{r.email}</td>
                <td className="px-4 py-3">
                  {r.status === "attended" ? (
                    <span className="inline-flex items-center gap-1 text-gold text-xs">
                      <Check className="h-3 w-3" /> Attended
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">Registered</span>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && !loading ? (
              <tr><td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">No registrants yet.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number | string; accent?: boolean }) {
  return (
    <div className="border border-border rounded-md p-5 bg-card">
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className={`mt-2 font-display text-3xl ${accent ? "text-gold" : ""}`}>{value}</p>
    </div>
  );
}
