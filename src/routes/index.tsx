import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  Calendar, MapPin, Users, ShieldCheck, Sparkles, ArrowRight, Check,
  Cpu, Server, MonitorSmartphone, Container, Coffee, Mic, Presentation, Utensils, Wine, Minus, Plus,
} from "lucide-react";

import { getEventInfo, registerAttendee } from "@/lib/event.functions";
import sixstoneLogo from "@/assets/sixstone-logo.png";
import heroBg from "@/assets/hero-bg.jpg";
import sectorsBg from "@/assets/sectors-bg.jpg";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
  attendees_count: z.coerce.number().int().min(1, "Min 1").max(10, "Max 10"),
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
    defaultValues: { attendees_count: 1 } as Partial<FormValues> as FormValues,
  });

  const attendees = form.watch("attendees_count") ?? 1;
  const setAttendees = (n: number) =>
    form.setValue("attendees_count", Math.min(10, Math.max(1, n)), { shouldValidate: true });

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
      <nav className="absolute inset-x-0 top-0 z-30 px-6 md:px-12 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={sixstoneLogo} alt={settings.organizer} className="h-9 md:h-10 w-auto bg-white/95 rounded-sm px-2 py-1" />
        </div>
        <a href="#register" className="text-sm text-muted-foreground hover:text-gold transition">
          Reserve seat →
        </a>
      </nav>

      {/* Hero */}
      <header className="relative overflow-hidden bg-navy-deep min-h-[92vh] flex items-center">
        <img
          src={heroBg}
          alt=""
          aria-hidden
          width={1920}
          height={1080}
          className="absolute inset-0 h-full w-full object-cover opacity-55"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-navy-deep/85 via-navy-deep/60 to-navy-deep" />
        <div className="absolute inset-0 gradient-radial-gold opacity-60" />
        <div className="absolute inset-0 [background-image:radial-gradient(ellipse_at_bottom_right,color-mix(in_oklab,var(--gold)_10%,transparent),transparent_55%)]" />

        <div className="relative max-w-6xl mx-auto px-6 md:px-12 pt-36 pb-28 md:pt-44 md:pb-36 w-full">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-gold/40 bg-gold/5 backdrop-blur text-gold text-xs uppercase tracking-[0.18em] mb-8">
            <Sparkles className="h-3 w-3" /> Invitation only · {seatsLeft} of {settings.seat_cap} seats remaining
          </div>
          <h1 className="font-display text-5xl md:text-7xl lg:text-8xl leading-[1.02] max-w-4xl">
            {settings.event_name}
          </h1>
          <div className="mt-4 h-[2px] w-24 bg-gradient-to-r from-gold to-transparent" />
          <p className="mt-6 max-w-2xl text-lg md:text-xl text-muted-foreground leading-relaxed">
            {settings.event_tagline}
          </p>
          <div className="mt-10 flex flex-wrap gap-x-10 gap-y-4 text-sm">
            <span className="flex items-center gap-2"><Calendar className="h-4 w-4 text-gold" /> {settings.event_date} · {settings.event_time}</span>
            <span className="flex items-center gap-2"><MapPin className="h-4 w-4 text-gold" /> {settings.venue}</span>
            <span className="flex items-center gap-2"><Users className="h-4 w-4 text-gold" /> Limited to {settings.seat_cap} attendees</span>
          </div>
          <div className="mt-12 flex flex-wrap gap-4">
            <Button asChild size="lg" className="bg-gold text-navy-deep hover:bg-gold-soft font-medium shadow-[0_10px_40px_-12px_color-mix(in_oklab,var(--gold)_55%,transparent)]">
              <a href="#register">
                Register your interest <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-gold/30 text-foreground hover:bg-gold/10 hover:text-gold">
              <a href="#programme">View programme</a>
            </Button>
          </div>
        </div>
      </header>

      {/* Showcasing Sectors */}
      <section className="relative bg-navy py-24 px-6 md:px-12 overflow-hidden">
        <img src={sectorsBg} alt="" aria-hidden width={1920} height={1080} loading="lazy" className="absolute inset-0 h-full w-full object-cover opacity-[0.06]" />
        <div className="relative max-w-6xl mx-auto">
          <p className="text-gold text-xs uppercase tracking-[0.22em] mb-3">Showcasing Sectors</p>
          <h2 className="font-display text-4xl md:text-5xl mb-16 max-w-3xl">
            The industries shaping India's next decade of capital.
          </h2>
          <div className="grid sm:grid-cols-2 gap-6">
            {[
              { icon: Cpu, title: "Semiconductor & Chip Designing", body: "Sovereign silicon — fabless design, packaging, and the talent stack." },
              { icon: Server, title: "Data Center Infrastructure", body: "Hyperscale build-out, power, and the AI compute boom." },
              { icon: MonitorSmartphone, title: "Electronics Manufacturing", body: "PLI-fueled EMS contract manufacturing for the world." },
              { icon: Container, title: "Container Manufacturing", body: "Reshoring the supply chain for India's export decade." },
            ].map(({ icon: Icon, title, body }) => (
              <div key={title} className="group relative p-7 border border-border rounded-md bg-card/80 backdrop-blur hover:border-gold/50 transition-all hover:translate-y-[-2px] hover:shadow-[0_20px_60px_-30px_color-mix(in_oklab,var(--gold)_60%,transparent)]">
                <div className="flex items-start gap-5">
                  <div className="h-12 w-12 rounded-sm bg-gold/10 flex items-center justify-center shrink-0 group-hover:bg-gold/20 transition">
                    <Icon className="h-6 w-6 text-gold" />
                  </div>
                  <div>
                    <h3 className="font-display text-2xl mb-1">{title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* The Day */}
      <section className="bg-navy-deep py-24 px-6 md:px-12">
        <div className="max-w-6xl mx-auto">
          <p className="text-gold text-xs uppercase tracking-[0.22em] mb-3">The Day</p>
          <h2 className="font-display text-4xl md:text-5xl mb-16 max-w-3xl">
            A curated room of decision-makers — not a conference.
          </h2>
          <div className="grid md:grid-cols-3 gap-12">
            {[
              { icon: ShieldCheck, title: "Vetted attendees", body: "Every invitee is reviewed personally. No exhibitors, no badges, no lanyards." },
              { icon: Users, title: "Capital in the room", body: "Family offices, late-stage VCs, growth PE, and selective angels — together in one room." },
              { icon: Sparkles, title: "Off the record", body: "Chatham House rules. Conversations stay in the room; relationships continue elsewhere." },
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

      {/* Programme */}
      <section id="programme" className="relative bg-navy py-24 px-6 md:px-12">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-end justify-between flex-wrap gap-6 mb-16">
            <div>
              <p className="text-gold text-xs uppercase tracking-[0.22em] mb-3">Programme</p>
              <h2 className="font-display text-4xl md:text-5xl">The arc of the day</h2>
            </div>
            <p className="text-sm text-muted-foreground max-w-xs">
              {settings.event_date} · Five chapters, one room, end-to-end curation.
            </p>
          </div>

          <ol className="relative">
            <span aria-hidden className="hidden md:block absolute left-[148px] top-2 bottom-2 w-px bg-gradient-to-b from-gold/0 via-gold/30 to-gold/0" />
            {[
              { time: "10:00", icon: Coffee, title: "Registration & welcome coffee", desc: "Arrival at Hotel Trident, BKC. First introductions over coffee.", tag: "Arrival" },
              { time: "11:00", icon: Mic, title: "Opening keynote", desc: "Sixstone Capital on the macro tailwinds shaping India's industrial decade.", tag: "Keynote" },
              { time: "12:30", icon: Presentation, title: "Sector showcases", desc: "Founders presenting across semiconductors, data centers, EMS, and container manufacturing.", tag: "Showcases" },
              { time: "14:00", icon: Utensils, title: "Curated lunch & 1:1s", desc: "Pre-assigned tables — every seat chosen to spark a deal.", tag: "Networking" },
              { time: "16:00", icon: Wine, title: "Closing roundtable & high tea", desc: "Off-the-record discussion with anchor investors and sector leads.", tag: "Closing" },
            ].map(({ time, icon: Icon, title, desc, tag }, i) => (
              <li key={i} className="relative grid md:grid-cols-[120px_56px_1fr] gap-5 md:gap-6 pb-10 last:pb-0">
                <div className="md:text-right">
                  <div className="font-display text-3xl md:text-4xl text-gold leading-none">{time}</div>
                  <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mt-2">{tag}</div>
                </div>
                <div className="hidden md:flex justify-center">
                  <div className="relative h-14 w-14 rounded-full border border-gold/40 bg-navy-deep flex items-center justify-center shadow-[0_0_0_6px_color-mix(in_oklab,var(--navy)_100%,transparent)]">
                    <Icon className="h-5 w-5 text-gold" />
                  </div>
                </div>
                <div className="bg-card/70 border border-border hover:border-gold/40 rounded-md p-6 backdrop-blur-sm transition-all hover:translate-x-1">
                  <div className="md:hidden flex items-center gap-3 mb-3">
                    <div className="h-9 w-9 rounded-full bg-gold/10 flex items-center justify-center">
                      <Icon className="h-4 w-4 text-gold" />
                    </div>
                  </div>
                  <h3 className="text-lg md:text-xl font-medium">{title}</h3>
                  <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Register */}
      <section id="register" className="relative bg-navy-deep py-24 px-6 md:px-12 overflow-hidden">
        <div className="absolute inset-0 gradient-radial-gold opacity-30" />
        <div className="relative max-w-2xl mx-auto">
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
              className="space-y-5 p-8 md:p-10 border border-border rounded-md bg-card/90 backdrop-blur shadow-[0_30px_80px_-40px_rgba(0,0,0,0.7)]"
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
                <Field label="No. of attendees" error={form.formState.errors.attendees_count?.message}>
                  <div className="flex items-center border border-input bg-input/30 rounded-md overflow-hidden">
                    <button type="button" onClick={() => setAttendees(attendees - 1)} aria-label="Decrease" className="px-3 h-10 text-muted-foreground hover:text-gold transition disabled:opacity-30" disabled={attendees <= 1}>
                      <Minus className="h-4 w-4" />
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      {...form.register("attendees_count", { valueAsNumber: true })}
                      className="w-full text-center bg-transparent h-10 outline-none font-medium tabular-nums"
                    />
                    <button type="button" onClick={() => setAttendees(attendees + 1)} aria-label="Increase" className="px-3 h-10 text-muted-foreground hover:text-gold transition disabled:opacity-30" disabled={attendees >= 10}>
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
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
