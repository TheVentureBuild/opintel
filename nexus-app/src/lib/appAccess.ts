import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { appByKey } from "@/config/apps";

export type AppLevel = "use" | "admin";
export interface AppAccessState {
  loading: boolean;
  session: Session | null;
  /** null = no access */
  level: AppLevel | null;
}

const registered = new Set<string>();

/**
 * Can the signed-in person open this app? Reads `my_app_access()` (owners get every app).
 * Also announces the app, so a new one appears in Nexus Admin flagged "New".
 * Falls back to the app's old role rule while the access tables don't exist yet.
 */
export async function loadAppAccess(appKey: string, session: Session | null): Promise<AppLevel | null> {
  if (!session) return null;
  const app = appByKey(appKey);
  if (app && !registered.has(appKey)) {
    registered.add(appKey);
    void supabase.rpc("register_app" as never, { _key: app.key, _name: app.name, _path: app.path, _kind: app.kind } as never);
  }
  const { data, error } = await supabase.rpc("my_app_access" as never);
  if (!error) {
    const row = ((data ?? []) as { app_key: string; level: AppLevel }[]).find((r) => r.app_key === appKey);
    return row ? row.level : null;
  }
  const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", session.user.id);
  const fallback = app?.fallbackRoles ?? ["owner"];
  if (app?.fallbackEmails?.includes((session.user.email ?? "").toLowerCase())) return "use";
  return (roles ?? []).some((r: { role: string }) => fallback.includes(r.role)) ? "use" : null;
}

export function useAppAccess(appKey: string): AppAccessState {
  const [state, setState] = useState<AppAccessState>({ loading: true, session: null, level: null });
  useEffect(() => {
    let alive = true;
    const run = async (s: Session | null) => {
      const level = await loadAppAccess(appKey, s).catch(() => null);
      if (alive) setState({ loading: false, session: s, level });
    };
    supabase.auth.getSession().then(({ data }) => run(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => { setTimeout(() => run(s), 0); });
    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, [appKey]);
  return state;
}
