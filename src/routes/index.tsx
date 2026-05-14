import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Calendar, MapPin, Users, ShieldCheck, Sparkles, ArrowRight, Check } from "lucide-react";

import { getEventInfo, registerAttendee } from "@/lib/event.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/")({
  component: LandingPage,
  loader: () => getEventInfo(),
});

const schema = z.object({
  full_name: z.string().trim().min(2, "Name is required").max(120),
  email: z.string().trim().email("Valid email required").max(255),
  phone: z.string().trim().min(6, "Phone is required").max(30),
  company: z.string().trim().min(1, "Required").max(200),
  designation: z.string().trim().min(1, "Required").max(150),
  investor_type: z.enum(["Angel", "VC", "PE", "Family Office", "Other"]),
  linkedin_url: z.string().trim().url().max(300).optional().or(z.literal("")),
});
type FormValues = z.infer<typeof schema>;

function LandingPage() {
  const initial = Route.useLoaderData();
  const register = useServerFn(registerAttendee);

  const { data } = useQuery({
    queryKey: ["event-info"],
    queryFn: () => getEventInfo(),
    initialData: initial,
    staleTime: 30_000,
  });

  const { settings, registered, seatsLeft, isFull } = data;

  const [success, setSuccess] = useState<{ ticket_code: string; full_name: string } | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { investor_type: "VC" } as Partial<FormValues> as FormValues,
  });

  async function onSubmit(values: FormValues) {
    try {
      const res = await register({
        data: { ...values, linkedin_url: values.linkedin_url || undefined },
      });
      if (!res.ok) {
        toast.error(res.error);
        if ("ticket_code" in res && res.ticket_code) {
          setSuccess({ ticket_code: res.ticket_code, full_name: values.full_name });
        }
        return;
      }
      toast.success("Registration confirmed");
      setSuccess({ ticket_code: res.ticket_code, full_name: res.full_name });
    } catch (e) {
      console.error(e);
      toast.error("Something went wrong. Please try again.");
    }
  }

  return (
    <div className="min-h-screen">
      {/* Nav */}
      <nav className="absolute inset-x-0 top-0 z-20 px-6 md:px-12 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-sm bg-gold flex items-center justify-center">
            <span className="font-display text-navy-deep font-bold text-lg leading-none">A</span>
          </div>
          <span className="font-display text-xl tracking-wide">{settings.organizer}</span>
        </div>
        <a href="#register" className="text-sm text-muted-foreground hover:text-gold transition">
          Reserve seat →
        </a>
      </nav>

      {/* Hero */}
      <header className="relative overflow-hidden bg-navy-deep">
        <div className="absolute inset-0 gradient-radial-gold opacity-70" />
        <div className="absolute inset-0 [background-image:radial-gradient(ellipse_at_bottom_right,color-mix(in_oklab,var(--gold)_8%,transparent),transparent_55%)]" />
        <div className="relative max-w-6xl mx-auto px-6 md:px-12 pt-36 pb-28 md:pt-44 md:pb-36">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-gold/40 bg-gold/5 text-gold text-xs uppercase tracking-[0.18em] mb-8">
            <Sparkles className="h-3 w-3" /> Invitation only · {seatsLeft} of {settings.seat_cap} seats remaining
          </div>
          <h1 className="font-display text-5xl md:text-7xl leading-[1.05] max-w-4xl">
            {settings.event_name}
          </h1>
          <p className="mt-6 max-w-2xl text-lg md:text-xl text-muted-foreground leading-relaxed">
            {settings.event_tagline}
          </p>
          <div className="mt-10 flex flex-wrap gap-x-10 gap-y-4 text-sm">
            <span className="flex items-center gap-2"><Calendar className="h-4 w-4 text-gold" /> {settings.event_date} · {settings.event_time}</span>
            <span className="flex items-center gap-2"><MapPin className="h-4 w-4 text-gold" /> {settings.venue}</span>
            <span className="flex items-center gap-2"><Users className="h-4 w-4 text-gold" /> Limited to {settings.seat_cap} attendees</span>
          </div>
          <div className="mt-12">
            <Button asChild size="lg" className="bg-gold text-navy-deep hover:bg-gold-soft font-medium">
              <a href="#register">
                Register your interest <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
          </div>
        </div>
      </header>

      {/* Why attend */}
      <section className="bg-navy py-24 px-6 md:px-12">
        <div className="max-w-6xl mx-auto">
          <p className="text-gold text-xs uppercase tracking-[0.22em] mb-3">The Evening</p>
          <h2 className="font-display text-4xl md:text-5xl mb-16 max-w-3xl">
            A curated room of decision-makers — not a conference.
          </h2>
          <div className="grid md:grid-cols-3 gap-12">
            {[
              { icon: ShieldCheck, title: "Vetted attendees", body: "Every invitee is reviewed personally. No exhibitors, no badges, no lanyards." },
              { icon: Users, title: "Capital in the room", body: "Family offices, late-stage VCs, growth PE, and selective angels — together for one evening." },
              { icon: Sparkles, title: "Off the record", body: "Chatham House rules. Conversations stay in the ballroom; relationships continue elsewhere." },
            ].map(({ icon: Icon, title, body }) => (
              <div key={title}>
                <Icon className="h-6 w-6 text-gold mb-5" />
                <h3 className="font-display text-2xl mb-2">{title}</h3>
                <p className="text-muted-foreground leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Agenda */}
      <section className="bg-navy-deep py-24 px-6 md:px-12">
        <div className="max-w-4xl mx-auto">
          <p className="text-gold text-xs uppercase tracking-[0.22em] mb-3">Programme</p>
          <h2 className="font-display text-4xl md:text-5xl mb-12">The arc of the evening</h2>
          <div className="space-y-0">
            {[
              ["18:00", "Arrival & private reception", "Champagne, oysters, first conversations."],
              ["19:30", "Opening keynote", "A guest principal on the year ahead in private capital."],
              ["20:15", "Curated dinner", "Pre-assigned tables — every seat chosen to spark a deal."],
              ["22:00", "Cigars & cognac", "On the terrace. The unofficial part — and where the real work happens."],
            ].map(([time, title, desc], i) => (
              <div key={i} className="grid grid-cols-[80px_1fr] md:grid-cols-[120px_1fr] gap-6 py-6 border-t border-border first:border-t-0">
                <div className="font-display text-2xl text-gold">{time}</div>
                <div>
                  <h3 className="text-lg font-medium">{title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Register */}
      <section id="register" className="bg-navy py-24 px-6 md:px-12">
        <div className="max-w-2xl mx-auto">
          <p className="text-gold text-xs uppercase tracking-[0.22em] mb-3 text-center">Reserve a seat</p>
          <h2 className="font-display text-4xl md:text-5xl mb-3 text-center">
            {success ? "You're confirmed." : "Request your invitation"}
          </h2>
          <p className="text-center text-muted-foreground mb-12">
            {success
              ? "Your QR pass is below — and a copy is on its way to your email."
              : `${seatsLeft} seat${seatsLeft === 1 ? "" : "s"} remaining of ${settings.seat_cap}.`}
          </p>

          {success ? (
            <SuccessCard
              ticketCode={success.ticket_code}
              fullName={success.full_name}
              eventName={settings.event_name}
            />
          ) : isFull ? (
            <div className="text-center p-12 border border-border rounded-md bg-card">
              <h3 className="font-display text-2xl mb-2">Registration is closed.</h3>
              <p className="text-muted-foreground">
                We've reached the {settings.seat_cap}-seat limit. Reach out to{" "}
                <a className="text-gold underline" href={`mailto:${settings.contact_email}`}>
                  {settings.contact_email}
                </a>{" "}
                to join the waitlist.
              </p>
            </div>
          ) : (
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-5 p-8 md:p-10 border border-border rounded-md bg-card"
            >
              <Field label="Full name" error={form.formState.errors.full_name?.message}>
                <Input {...form.register("full_name")} placeholder="Aanya Mehra" />
              </Field>
              <div className="grid md:grid-cols-2 gap-5">
                <Field label="Email" error={form.formState.errors.email?.message}>
                  <Input type="email" {...form.register("email")} placeholder="aanya@firm.com" />
                </Field>
                <Field label="Phone" error={form.formState.errors.phone?.message}>
                  <Input {...form.register("phone")} placeholder="+91 98xxxxxxxx" />
                </Field>
              </div>
              <div className="grid md:grid-cols-2 gap-5">
                <Field label="Firm / Company" error={form.formState.errors.company?.message}>
                  <Input {...form.register("company")} placeholder="Sequoia Capital" />
                </Field>
                <Field label="Designation" error={form.formState.errors.designation?.message}>
                  <Input {...form.register("designation")} placeholder="Managing Partner" />
                </Field>
              </div>
              <div className="grid md:grid-cols-2 gap-5">
                <Field label="Investor type">
                  <Select
                    defaultValue="VC"
                    onValueChange={(v) => form.setValue("investor_type", v as FormValues["investor_type"])}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["Angel", "VC", "PE", "Family Office", "Other"].map(o => (
                        <SelectItem key={o} value={o}>{o}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="LinkedIn (optional)" error={form.formState.errors.linkedin_url?.message}>
                  <Input {...form.register("linkedin_url")} placeholder="https://linkedin.com/in/…" />
                </Field>
              </div>
              <Button
                type="submit"
                size="lg"
                className="w-full bg-gold text-navy-deep hover:bg-gold-soft font-medium"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting ? "Reserving…" : "Reserve my seat"}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Submissions are reviewed. You'll receive a unique QR pass on confirmation.
              </p>
            </form>
          )}
        </div>
      </section>

      <footer className="bg-navy-deep py-10 px-6 md:px-12 border-t border-border">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-4 items-center justify-between text-sm text-muted-foreground">
          <span>© {new Date().getFullYear()} {settings.organizer}. By invitation only.</span>
          <span>{settings.contact_email} · {registered} confirmed</span>
        </div>
      </footer>
    </div>
  );
}

function Field({ label, children, error }: { label: string; children: React.ReactNode; error?: string }) {
  return (
    <div className="space-y-2">
      <Label className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{label}</Label>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

function SuccessCard({ ticketCode, fullName, eventName }: { ticketCode: string; fullName: string; eventName: string }) {
  const ticketUrl = `/ticket/${ticketCode}`;
  return (
    <div className="p-8 md:p-10 border border-gold/40 rounded-md bg-card text-center">
      <div className="mx-auto h-12 w-12 rounded-full bg-gold/15 flex items-center justify-center mb-5">
        <Check className="h-6 w-6 text-gold" />
      </div>
      <h3 className="font-display text-2xl mb-1">Welcome, {fullName}.</h3>
      <p className="text-muted-foreground mb-6">Your seat at {eventName} is reserved.</p>
      <a
        href={ticketUrl}
        className="inline-flex items-center gap-2 bg-gold text-navy-deep px-6 py-3 rounded-md font-medium hover:bg-gold-soft transition"
      >
        View my QR pass <ArrowRight className="h-4 w-4" />
      </a>
      <p className="text-xs text-muted-foreground mt-6">
        Ticket code: <span className="font-mono text-gold">{ticketCode.slice(0, 8)}…</span>
      </p>
    </div>
  );
}
