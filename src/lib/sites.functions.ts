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
      .select("id, domain, name, description, widget_config, is_active, created_at, updated_at, compliance_scans(score, status, created_at)")
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
