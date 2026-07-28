import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const CreateSchema = z.object({
  domain: z.string().min(3),
  name: z.string().min(1),
  description: z.string().optional(),
});
const UpdateWidgetSchema = z.object({
  siteId: z.string().uuid(),
  widget_config: z.record(z.string(), z.any()),
});
const IdSchema = z.object({ siteId: z.string().uuid() });

export const listSites = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("sites")
      .select("id, domain, name, description, widget_config, is_active, verification_status, verification_method, verified_at, plugin_last_seen_at, created_at, updated_at, compliance_scans(score, status, created_at)")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createSite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => CreateSchema.parse(i))
  .handler(async ({ data, context }) => {
    const domain = data.domain.replace(/^https?:\/\//, "").replace(/\/$/, "").trim();
    const { data: row, error } = await context.supabase
      .from("sites")
      .insert({ user_id: context.userId, domain, name: data.name, description: data.description })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const getSite = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => IdSchema.parse(i))
  .handler(async ({ data, context }) => {
    const { data: site, error } = await context.supabase
      .from("sites")
      .select("*")
      .eq("id", data.siteId)
      .single();
    if (error) throw new Error(error.message);
    const { data: scans } = await context.supabase
      .from("compliance_scans")
      .select("*")
      .eq("site_id", data.siteId)
      .order("created_at", { ascending: false })
      .limit(20);
    return { site, scans: scans ?? [] };
  });

export const updateWidgetConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => UpdateWidgetSchema.parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("sites")
      .update({ widget_config: data.widget_config })
      .eq("id", data.siteId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteSite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => IdSchema.parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("sites").delete().eq("id", data.siteId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const revokeVerification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => IdSchema.parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("sites")
      .update({
        verification_status: "pending",
        verification_method: null,
        verified_at: null,
        plugin_last_seen_at: null,
      })
      .eq("id", data.siteId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const verifyMetaTag = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => IdSchema.parse(i))
  .handler(async ({ data, context }) => {
    const { data: site, error } = await context.supabase
      .from("sites")
      .select("id, domain, verification_token, verification_status")
      .eq("id", data.siteId)
      .single();
    if (error || !site) throw new Error("Site not found");

    const host = site.domain
      .trim()
      .replace(/^https?:\/\//, "")
      .replace(/\/.*$/, "");
    const candidates = [`https://${host}`, `http://${host}`];

    let html = "";
    let fetchError = "";
    for (const url of candidates) {
      try {
        const res = await fetch(url, {
          headers: { "user-agent": "TrustSealBot/1.0 (+verification)" },
          redirect: "follow",
        });
        if (!res.ok) {
          fetchError = `Site responded with ${res.status}`;
          continue;
        }
        html = (await res.text()).slice(0, 400_000);
        fetchError = "";
        break;
      } catch (e) {
        fetchError = e instanceof Error ? e.message : "Could not reach site";
      }
    }

    if (!html) {
      return { ok: false, reason: fetchError || "Could not reach your site" };
    }

    const found = new RegExp(
      `<meta[^>]+name=["']trustseal-verification["'][^>]+content=["']${site.verification_token}["']`,
      "i",
    ).test(html) ||
      new RegExp(
        `<meta[^>]+content=["']${site.verification_token}["'][^>]+name=["']trustseal-verification["']`,
        "i",
      ).test(html);

    if (!found) {
      return { ok: false, reason: "Meta tag not found in the page <head>" };
    }

    const now = new Date().toISOString();
    const { error: upErr } = await context.supabase
      .from("sites")
      .update({
        verification_status: "verified",
        verification_method: "meta_tag",
        verified_at: site.verification_status === "verified" ? undefined : now,
      })
      .eq("id", site.id);
    if (upErr) throw new Error(upErr.message);
    return { ok: true };
  });

export const forceVerify = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => IdSchema.parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("sites")
      .update({
        verification_status: "verified",
        verification_method: "manual_override",
        verified_at: new Date().toISOString(),
      })
      .eq("id", data.siteId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
