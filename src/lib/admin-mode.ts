import { useEffect, useState } from "react";

export type Plan = "free" | "growth" | "scale";

const ADMIN_MODE_KEY = "ts-admin-mode";
const PLAN_KEY = "ts-simulated-plan";
const EVT = "ts-admin-mode-change";

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const v = window.localStorage.getItem(key);
    return v === null ? fallback : (JSON.parse(v) as T);
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent(EVT));
}

/**
 * Client-side admin mode + simulated plan state.
 * - `adminMode` defaults to ON for admins → unlimited AI fixes.
 * - When `adminMode` is OFF, `plan` (free|growth|scale) simulates a normal client.
 */
export function useAdminMode(isAdmin: boolean) {
  const [adminMode, setAdminModeState] = useState<boolean>(() => read(ADMIN_MODE_KEY, true));
  const [plan, setPlanState] = useState<Plan>(() => read<Plan>(PLAN_KEY, "free"));

  useEffect(() => {
    const sync = () => {
      setAdminModeState(read(ADMIN_MODE_KEY, true));
      setPlanState(read<Plan>(PLAN_KEY, "free"));
    };
    window.addEventListener(EVT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const setAdminMode = (v: boolean) => write(ADMIN_MODE_KEY, v);
  const setPlan = (p: Plan) => write(PLAN_KEY, p);

  // Non-admins never get admin mode privileges regardless of stored flag.
  const effectiveAdminMode = isAdmin && adminMode;
  const effectivePlan: Plan = effectiveAdminMode ? "scale" : plan;
  const canFix = effectiveAdminMode || plan === "growth" || plan === "scale";

  return { adminMode, effectiveAdminMode, plan, effectivePlan, canFix, setAdminMode, setPlan };
}
