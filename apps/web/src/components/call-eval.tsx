"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:3000";

type EvalResult = Record<string, unknown>;

async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  console.debug("[CallEval] fetch", url, init?.method || "GET");
  const res = await fetch(url, init);
  console.debug("[CallEval] fetch:status", url, res.status);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

export function CallEval() {
  const [lastSessionId, setLastSessionId] = useState<string | null>(null);
  const [result, setResult] = useState<EvalResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.debug("[CallEval] mounted", { SERVER_URL });
  }, []);

  const disabled = useMemo(() => busy, [busy]);

  const pickLatestEnded = useCallback(async (): Promise<string | null> => {
    try {
      const url = `${SERVER_URL}/api/transcripts`;
      console.debug("[CallEval] loading transcripts", url);
      const recent = await fetchJSON<any[]>(url);
      console.debug("[CallEval] transcripts loaded", recent?.length || 0);
      if (!recent?.length) return null;
      const ended = recent.find((s) => (s.status || "").toUpperCase() === "ENDED");
      const chosen = (ended?.id as string) || (recent[0].id as string);
      console.debug("[CallEval] chosen session", { chosen, ended: !!ended });
      return chosen;
    } catch (e) {
      console.debug("[CallEval] transcripts error", e);
      return null;
    }
  }, []);

  const run = useCallback(async () => {
    console.debug("[CallEval] evaluate click");
    setBusy(true); setError(null);
    try {
      const id = await pickLatestEnded();
      if (!id) throw new Error("No ended session available to evaluate");
      const url = `${SERVER_URL}/api/eval/${id}`;
      console.debug("[CallEval] posting eval", url);
      const data = await fetchJSON<EvalResult>(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId: id }),
      });
      console.debug("[CallEval] eval ok", { id, keys: Object.keys(data || {}) });
      setLastSessionId(id);
      setResult(data);
    } catch (e: any) {
      console.debug("[CallEval] eval error", e);
      setError(e?.message || "Failed to evaluate");
      setResult(null);
    } finally {
      setBusy(false);
    }
  }, [pickLatestEnded]);

  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium">Post‑call Evaluation</h3>
        <button
          className="text-xs border px-3 py-2 rounded disabled:opacity-50"
          onClick={run}
          disabled={disabled}
        >
          {busy ? "Evaluating…" : "Evaluate Latest Ended Session"}
        </button>
      </div>
      {lastSessionId ? (
        <div className="text-xs text-muted-foreground mb-2">session_id: {lastSessionId}</div>
      ) : null}
      {error ? (
        <div className="text-xs text-red-600 mb-2">{error}</div>
      ) : null}
      {result ? (
        <pre className="text-xs bg-muted/30 p-3 rounded overflow-auto max-h-80">
          {JSON.stringify(result, null, 2)}
        </pre>
      ) : (
        <div className="text-xs text-muted-foreground">No evaluation yet.</div>
      )}
    </div>
  );
} 