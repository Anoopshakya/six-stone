import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Check, AlertCircle, Camera, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { markAttended } from "@/lib/event.functions";

export const Route = createFileRoute("/admin/scan")({ component: ScannerPage });

type Result =
  | { kind: "ok"; name: string; company: string; alreadyAttended: boolean; at: string }
  | { kind: "err"; msg: string };

function ScannerPage() {
  const mark = useServerFn(markAttended);
  const [result, setResult] = useState<Result | null>(null);
  const [scanning, setScanning] = useState(false);
  const [manual, setManual] = useState("");
  const lastCodeRef = useRef<{ code: string; t: number } | null>(null);
  const scannerRef = useRef<any>(null);
  const containerId = "qr-reader";

  async function process(code: string) {
    const trimmed = code.trim();
    if (!trimmed) return;
    // debounce duplicate scans within 3s
    const now = Date.now();
    if (lastCodeRef.current && lastCodeRef.current.code === trimmed && now - lastCodeRef.current.t < 3000) return;
    lastCodeRef.current = { code: trimmed, t: now };

    try {
      const res = await mark({ data: { code: trimmed } });
      if (!res.ok) {
        setResult({ kind: "err", msg: res.error });
        toast.error(res.error);
        return;
      }
      const g = res.guest;
      setResult({
        kind: "ok",
        name: g.full_name,
        company: g.company,
        alreadyAttended: res.alreadyAttended,
        at: g.attended_at ?? new Date().toISOString(),
      });
      if (res.alreadyAttended) toast.warning(`${g.full_name} — already checked in`);
      else toast.success(`✓ ${g.full_name} checked in`);
    } catch (e: any) {
      setResult({ kind: "err", msg: e?.message ?? "Scan failed" });
    }
  }

  async function startScanner() {
    setScanning(true);
    const { Html5Qrcode } = await import("html5-qrcode");
    const scanner = new Html5Qrcode(containerId);
    scannerRef.current = scanner;
    try {
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 260, height: 260 } },
        (decoded) => process(decoded),
        () => {},
      );
    } catch (e: any) {
      toast.error("Camera access denied or unavailable");
      setScanning(false);
    }
  }

  async function stopScanner() {
    try { await scannerRef.current?.stop(); await scannerRef.current?.clear(); } catch {}
    scannerRef.current = null;
    setScanning(false);
  }

  useEffect(() => () => { stopScanner(); }, []);

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <h1 className="font-display text-3xl mb-2">Gate scanner</h1>
      <p className="text-muted-foreground mb-8">Point at the guest's QR pass to check them in.</p>

      <div className="bg-card border border-border rounded-md p-4 mb-6">
        <div id={containerId} className="w-full aspect-square max-w-md mx-auto rounded-md overflow-hidden bg-black/40" />
        <div className="mt-4 flex justify-center gap-2">
          {!scanning ? (
            <Button onClick={startScanner} className="bg-gold text-navy-deep hover:bg-gold-soft">
              <Camera className="h-4 w-4 mr-2" /> Start camera
            </Button>
          ) : (
            <Button variant="outline" onClick={stopScanner}>Stop camera</Button>
          )}
        </div>
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); process(manual); setManual(""); }}
        className="flex gap-2 mb-8"
      >
        <Input
          value={manual}
          onChange={(e) => setManual(e.target.value)}
          placeholder="Or paste ticket code manually"
          className="font-mono"
        />
        <Button type="submit" variant="outline"><KeyRound className="h-4 w-4 mr-1" /> Check</Button>
      </form>

      {result ? (
        <div
          className={`p-6 rounded-md border ${
            result.kind === "ok"
              ? result.alreadyAttended
                ? "border-yellow-500/40 bg-yellow-500/5"
                : "border-gold/50 bg-gold/10"
              : "border-destructive/50 bg-destructive/10"
          }`}
        >
          {result.kind === "ok" ? (
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-full bg-gold/20 flex items-center justify-center">
                <Check className="h-5 w-5 text-gold" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-gold">
                  {result.alreadyAttended ? "Already checked in" : "Checked in"}
                </p>
                <h3 className="font-display text-2xl mt-1">{result.name}</h3>
                <p className="text-sm text-muted-foreground">{result.company}</p>
                <p className="text-xs text-muted-foreground mt-2">{new Date(result.at).toLocaleString()}</p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-4">
              <AlertCircle className="h-6 w-6 text-destructive" />
              <div>
                <p className="font-medium">Could not check in</p>
                <p className="text-sm text-muted-foreground">{result.msg}</p>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
