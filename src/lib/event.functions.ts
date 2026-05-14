import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import QRCode from "qrcode";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const registerSchema = z.object({
  full_name: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email().max(255),
  phone: z.string().trim().min(6).max(30),
  company: z.string().trim().min(1).max(200),
  designation: z.string().trim().min(1).max(150),
  investor_type: z.enum(["Angel", "VC", "PE", "Family Office", "Other"]),
  linkedin_url: z
    .string()
    .trim()
    .max(300)
    .url()
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

export const getEventInfo = createServerFn({ method: "GET" }).handler(
  async () => {
    const [{ data: settings }, { count }] = await Promise.all([
      supabaseAdmin.from("event_settings").select("*").eq("id", 1).single(),
      supabaseAdmin
        .from("registrations")
        .select("*", { count: "exact", head: true }),
    ]);
    const registered = count ?? 0;
    const cap = settings?.seat_cap ?? 150;
    return {
      settings: settings!,
      registered,
      seatsLeft: Math.max(0, cap - registered),
      isFull: registered >= cap,
    };
  },
);

export const registerAttendee = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => registerSchema.parse(input))
  .handler(async ({ data }) => {
    // Check seat cap
    const [{ data: settings }, { count }] = await Promise.all([
      supabaseAdmin.from("event_settings").select("seat_cap").eq("id", 1).single(),
      supabaseAdmin
        .from("registrations")
        .select("*", { count: "exact", head: true }),
    ]);
    const cap = settings?.seat_cap ?? 150;
    if ((count ?? 0) >= cap) {
      return { ok: false as const, error: "Registrations are closed — all seats are taken." };
    }

    // Check duplicate email
    const { data: existing } = await supabaseAdmin
      .from("registrations")
      .select("ticket_code")
      .eq("email", data.email)
      .maybeSingle();
    if (existing) {
      return {
        ok: false as const,
        error: "This email is already registered. Check your inbox or visit your ticket page.",
        ticket_code: existing.ticket_code,
      };
    }

    const { data: inserted, error } = await supabaseAdmin
      .from("registrations")
      .insert({
        full_name: data.full_name,
        email: data.email,
        phone: data.phone,
        company: data.company,
        designation: data.designation,
        investor_type: data.investor_type,
        linkedin_url: data.linkedin_url ?? null,
      })
      .select("ticket_code, full_name, email")
      .single();

    if (error || !inserted) {
      console.error("Registration insert failed", error);
      return { ok: false as const, error: "Could not complete registration. Please try again." };
    }

    return {
      ok: true as const,
      ticket_code: inserted.ticket_code,
      full_name: inserted.full_name,
      email: inserted.email,
    };
  });

export const getTicket = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ code: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { data: row } = await supabaseAdmin
      .from("registrations")
      .select("ticket_code, full_name, company, status, attended_at")
      .eq("ticket_code", data.code)
      .maybeSingle();
    if (!row) return { ok: false as const };
    const { data: settings } = await supabaseAdmin
      .from("event_settings")
      .select("event_name, event_date, event_time, venue")
      .eq("id", 1)
      .single();
    const qrDataUrl = await QRCode.toDataURL(row.ticket_code, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 480,
      color: { dark: "#0a1628", light: "#ffffff" },
    });
    return { ok: true as const, ticket: row, settings: settings!, qrDataUrl };
  });

export const listRegistrations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase
      .from("user_roles")
      .select("id")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!isAdmin) throw new Error("Forbidden: admin only");

    const { data, error } = await supabaseAdmin
      .from("registrations")
      .select("*")
      .order("registered_at", { ascending: false });
    if (error) throw error;
    return { rows: data ?? [] };
  });

export const getAdminStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase
      .from("user_roles")
      .select("id")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!isAdmin) throw new Error("Forbidden");

    const [{ count: total }, { count: attended }, { data: settings }] =
      await Promise.all([
        supabaseAdmin
          .from("registrations")
          .select("*", { count: "exact", head: true }),
        supabaseAdmin
          .from("registrations")
          .select("*", { count: "exact", head: true })
          .eq("status", "attended"),
        supabaseAdmin.from("event_settings").select("seat_cap").eq("id", 1).single(),
      ]);
    const cap = settings?.seat_cap ?? 150;
    return {
      total: total ?? 0,
      attended: attended ?? 0,
      seatsLeft: Math.max(0, cap - (total ?? 0)),
      cap,
    };
  });

export const markAttended = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ code: z.string().min(1) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase
      .from("user_roles")
      .select("id")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!isAdmin) throw new Error("Forbidden");

    // Accept either UUID or a stringified UUID; validate
    const code = data.code.trim();
    const uuidOk = /^[0-9a-f-]{36}$/i.test(code);
    if (!uuidOk) return { ok: false as const, error: "Invalid ticket code." };

    const { data: row } = await supabaseAdmin
      .from("registrations")
      .select("*")
      .eq("ticket_code", code)
      .maybeSingle();

    if (!row) return { ok: false as const, error: "Ticket not found." };

    if (row.status === "attended") {
      return {
        ok: true as const,
        alreadyAttended: true,
        guest: row,
      };
    }

    const { data: updated, error } = await supabaseAdmin
      .from("registrations")
      .update({ status: "attended", attended_at: new Date().toISOString() })
      .eq("ticket_code", code)
      .select("*")
      .single();
    if (error || !updated) {
      return { ok: false as const, error: "Could not update status." };
    }
    return { ok: true as const, alreadyAttended: false, guest: updated };
  });

export const checkIsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("user_roles")
      .select("id")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    return { isAdmin: !!data };
  });

// First-time bootstrap: if no admin exists, the calling authenticated user
// becomes the admin. Safe — no-op once one admin exists.
export const claimAdminIfNone = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { count } = await supabaseAdmin
      .from("user_roles")
      .select("*", { count: "exact", head: true })
      .eq("role", "admin");
    if ((count ?? 0) > 0) return { claimed: false };
    const { error } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: userId, role: "admin" });
    if (error) {
      console.error("claimAdmin failed", error);
      return { claimed: false };
    }
    return { claimed: true };
  });
