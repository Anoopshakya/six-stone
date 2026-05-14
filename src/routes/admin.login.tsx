import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/admin/login")({ component: LoginPage });

function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/admin" });
    });
  }, [navigate]);

  async function handle(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + "/admin" },
        });
        if (error) throw error;
        toast.success("Account created. Signing you in…");
      }
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      // Try claim admin (no-op if already exists)
      const { claimAdminIfNone } = await import("@/lib/event.functions");
      try { await claimAdminIfNone(); } catch {}
      navigate({ to: "/admin" });
    } catch (err: any) {
      toast.error(err?.message ?? "Auth failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-navy-deep flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <Link to="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-gold mb-6">
          <ArrowLeft className="h-4 w-4 mr-1" /> Home
        </Link>
        <div className="bg-card border border-border rounded-md p-8">
          <h1 className="font-display text-3xl mb-1">Staff access</h1>
          <p className="text-sm text-muted-foreground mb-6">
            {mode === "signin" ? "Sign in to manage registrants and scan tickets." : "Create the first admin account."}
          </p>
          <form onSubmit={handle} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Email</Label>
              <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Password</Label>
              <Input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gold text-navy-deep hover:bg-gold-soft font-medium"
            >
              {loading ? "…" : mode === "signin" ? "Sign in" : "Create account"}
            </Button>
          </form>
          <button
            type="button"
            className="mt-4 w-full text-xs text-muted-foreground hover:text-gold"
            onClick={() => setMode((m) => (m === "signin" ? "signup" : "signin"))}
          >
            {mode === "signin" ? "First time? Create the admin account →" : "Already have an account? Sign in →"}
          </button>
          <p className="mt-4 text-[11px] text-muted-foreground/70">
            The first account created becomes the admin. Additional sign-ups have no access until promoted.
          </p>
        </div>
      </div>
    </div>
  );
}
