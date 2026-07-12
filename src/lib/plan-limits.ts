import { useEffect, useState } from "react";

const KEY = "ts-free-scan-count";
const EVT = "ts-free-scan-change";
export const FREE_SCAN_LIMIT = 3;

function read(): number {
  if (typeof window === "undefined") return 0;
  const v = window.localStorage.getItem(KEY);
  return v ? Number(v) || 0 : 0;
}

export function useFreeScanCount() {
  const [count, setCount] = useState<number>(() => read());

  useEffect(() => {
    const sync = () => setCount(read());
    window.addEventListener(EVT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const increment = () => {
    const next = read() + 1;
    window.localStorage.setItem(KEY, String(next));
    window.dispatchEvent(new CustomEvent(EVT));
    setCount(next);
    return next;
  };

  const reset = () => {
    window.localStorage.setItem(KEY, "0");
    window.dispatchEvent(new CustomEvent(EVT));
    setCount(0);
  };

  return { count, limit: FREE_SCAN_LIMIT, increment, reset, reached: count >= FREE_SCAN_LIMIT };
}
