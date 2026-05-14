import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, Calendar, MapPin, Check } from "lucide-react";
import { getTicket } from "@/lib/event.functions";

export const Route = createFileRoute("/ticket/$code")({
  component: TicketPage,
  loader: async ({ params }) => {
    const res = await getTicket({ data: { code: params.code } });
    if (!res.ok) throw notFound();
    return res;
  },
  notFoundComponent: () => (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="text-center">
        <h1 className="font-display text-3xl mb-2">Ticket not found</h1>
        <p className="text-muted-foreground mb-6">This QR pass doesn't match any registration.</p>
        <Link to="/" className="text-gold underline">Back to home</Link>
      </div>
    </div>
  ),
});

function TicketPage() {
  const { ticket, settings, qrDataUrl } = Route.useLoaderData();
  const attended = ticket.status === "attended";
  return (
    <div className="min-h-screen bg-navy-deep py-12 px-6 flex items-center justify-center">
      <div className="w-full max-w-md">
        <Link to="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-gold mb-6">
          <ArrowLeft className="h-4 w-4 mr-1" /> Home
        </Link>
        <div className="bg-card border border-border rounded-md overflow-hidden">
          <div className="bg-gold/10 hairline border-b border-gold/30 px-6 py-5 text-center">
            <p className="text-xs uppercase tracking-[0.22em] text-gold">Admit one</p>
            <h1 className="font-display text-2xl mt-1">{settings.event_name}</h1>
          </div>
          <div className="p-8 text-center">
            <div className="mx-auto inline-block bg-white p-4 rounded-md">
              <img src={qrDataUrl} alt="Your ticket QR" className="block w-60 h-60" />
            </div>
            <p className="mt-6 font-display text-2xl">{ticket.full_name}</p>
            <p className="text-sm text-muted-foreground">{ticket.company}</p>
            <div className="mt-6 space-y-1 text-sm text-muted-foreground">
              <p className="flex items-center justify-center gap-2"><Calendar className="h-4 w-4 text-gold" /> {settings.event_date} · {settings.event_time}</p>
              <p className="flex items-center justify-center gap-2"><MapPin className="h-4 w-4 text-gold" /> {settings.venue}</p>
            </div>
            {attended ? (
              <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gold/15 text-gold text-sm">
                <Check className="h-4 w-4" /> Checked in
              </div>
            ) : (
              <p className="mt-6 text-xs text-muted-foreground">
                Show this QR at the entrance. One scan = one entry.
              </p>
            )}
            <p className="mt-6 font-mono text-[10px] text-muted-foreground/70 break-all">
              {ticket.ticket_code}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
