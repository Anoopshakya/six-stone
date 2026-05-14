import { createFileRoute, Outlet, useNavigate, Link, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LogOut, ScanLine, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
  beforeLoad: async ({ location }) => {
    if (location.pathname === "/admin/login") return;
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/admin/login" });
  },
});

function AdminLayout() {
  const navigate = useNavigate();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);

  if (typeof window !== "undefined" && window.location.pathname === "/admin/login") {
    return <Outlet />;
  }

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/admin/login" });
  }

  return (
    <div className="min-h-screen bg-navy-deep">
      <header className="border-b border-border bg-navy">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/admin" className="font-display text-xl">Apex · Admin</Link>
            <nav className="flex items-center gap-1 text-sm">
              <Link
                to="/admin"
                activeOptions={{ exact: true }}
                className="px-3 py-1.5 rounded hover:bg-secondary"
                activeProps={{ className: "px-3 py-1.5 rounded bg-secondary text-gold" }}
              >
                <Users className="h-4 w-4 inline mr-1.5" /> Registrants
              </Link>
              <Link
                to="/admin/scan"
                className="px-3 py-1.5 rounded hover:bg-secondary"
                activeProps={{ className: "px-3 py-1.5 rounded bg-secondary text-gold" }}
              >
                <ScanLine className="h-4 w-4 inline mr-1.5" /> Scanner
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            {email ? <span className="text-xs text-muted-foreground hidden sm:inline">{email}</span> : null}
            <Button size="sm" variant="ghost" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-1" /> Sign out
            </Button>
          </div>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
