"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Citation = { title: string; url: string };

type AgentOutput = {
  sessionId: string;
  web_search?: { citations: Citation[]; summary?: string | null } | null;
  coach?: {
    warnings?: string[];
    suggestions?: string[];
    doSay?: string[];
    dontSay?: string[];
  } | null;
  pain_points?: { painPoints: string[] } | null;
};

type FeedItem = {
  id: string;
  at: number;
  kind: "web_search" | "coach" | "pain_points" | "none";
  sessionId: string;
  payload: AgentOutput;
};

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:3000";

async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

export function AgentFeed() {
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [enabled, setEnabled] = useState(true);
  const [busy, setBusy] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const lastRunRef = useRef<number>(0);

  const pickLatestSessionId = useCallback(async (): Promise<string | null> => {
    // Prefer active sessions; fallback to recent transcripts
    try {
      const active = await fetchJSON<any[]>(`${SERVER_URL}/api/active-sessions`);
      if (active?.length) return active[0].id as string;
    } catch {}
    try {
      const recent = await fetchJSON<any[]>(`${SERVER_URL}/api/transcripts`);
      if (recent?.length) return recent[0].id as string;
    } catch {}
    return null;
  }, []);

  const detectKind = useCallback((o: AgentOutput): FeedItem["kind"] => {
    if (o.web_search) return "web_search";
    if (o.coach) return "coach";
    if (o.pain_points) return "pain_points";
    return "none";
  }, []);

  const analyzeOnce = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    try {
      const sessionId = await pickLatestSessionId();
      if (!sessionId) return;
      const out = await fetchJSON<AgentOutput>(`${SERVER_URL}/api/analyze/${sessionId}`, {
        method: "POST",
        signal: abortRef.current.signal,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      });
      const item: FeedItem = {
        id: `${sessionId}:${Date.now()}`,
        at: Date.now(),
        kind: detectKind(out),
        sessionId: out.sessionId || sessionId,
        payload: out,
      };
      setFeed((prev) => [item, ...prev].slice(0, 50));
    } catch (e) {
      // soft-fail; no toast to keep it quiet
    } finally {
      setBusy(false);
    }
  }, [busy, detectKind, pickLatestSessionId]);

  // 20s ticker with visibility + online guards
  useEffect(() => {
    if (!enabled) return;
    let timer: any;
    const tick = async () => {
      const now = Date.now();
      if (document.hidden || !navigator.onLine) return;
      if (now - lastRunRef.current < 20_000) return;
      lastRunRef.current = now;
      await analyzeOnce();
    };
    timer = setInterval(tick, 2_000); // check every 2s; fire if 20s elapsed
    // run once soon to prime
    tick();
    return () => clearInterval(timer);
  }, [enabled, analyzeOnce]);

  const clear = useCallback(() => setFeed([]), []);

  const header = useMemo(() => (
    <div className="flex items-center justify-between">
      <h3 className="text-sm font-medium">Agent Insights (auto every 20s)</h3>
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-1 text-xs">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
          />
          Auto
        </label>
        <button
          className="text-xs border px-2 py-1 rounded"
          onClick={clear}
          disabled={!feed.length}
        >
          Clear
        </button>
      </div>
    </div>
  ), [enabled, feed.length, clear]);

  return (
    <div className="rounded-lg border p-4 mt-4">
      {header}
      <div className="mt-3 space-y-3 max-h-80 overflow-auto">
        {feed.length === 0 ? (
          <div className="text-xs text-muted-foreground">Waiting for insights…</div>
        ) : (
          feed.map((f) => (
            <div key={f.id} className="border rounded p-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {new Date(f.at).toLocaleTimeString()} • {f.kind !== "none" ? f.kind : "no-op"}
                </span>
                <span className="truncate max-w-[50%]">{f.sessionId}</span>
              </div>
              <div className="mt-1 text-sm whitespace-pre-wrap">
                {f.kind === "web_search" && f.payload.web_search && (
                  <div>
                    {f.payload.web_search.summary ? (
                      <div className="mb-1">{f.payload.web_search.summary}</div>
                    ) : null}
                    <ul className="list-disc ml-4">
                      {f.payload.web_search.citations.map((c, i) => (
                        <li key={i}>
                          <a className="underline" href={c.url} target="_blank" rel="noreferrer">
                            {c.title}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {f.kind === "coach" && f.payload.coach && (
                  <div className="grid grid-cols-2 gap-2">
                    {f.payload.coach.warnings?.length ? (
                      <div>
                        <div className="font-medium text-xs">Warnings</div>
                        <ul className="list-disc ml-4 text-sm">
                          {f.payload.coach.warnings.map((w, i) => (
                            <li key={i}>{w}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    {f.payload.coach.suggestions?.length ? (
                      <div>
                        <div className="font-medium text-xs">Suggestions</div>
                        <ul className="list-disc ml-4 text-sm">
                          {f.payload.coach.suggestions.map((s, i) => (
                            <li key={i}>{s}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    {f.payload.coach.doSay?.length ? (
                      <div>
                        <div className="font-medium text-xs">Do say</div>
                        <ul className="list-disc ml-4 text-sm">
                          {f.payload.coach.doSay.map((s, i) => (
                            <li key={i}>{s}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    {f.payload.coach.dontSay?.length ? (
                      <div>
                        <div className="font-medium text-xs">Don’t say</div>
                        <ul className="list-disc ml-4 text-sm">
                          {f.payload.coach.dontSay.map((s, i) => (
                            <li key={i}>{s}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                )}
                {f.kind === "pain_points" && f.payload.pain_points && (
                  <ul className="list-disc ml-4">
                    {f.payload.pain_points.painPoints.map((p, i) => (
                      <li key={i}>{p}</li>
                    ))}
                  </ul>
                )}
                {f.kind === "none" && <span className="text-xs text-muted-foreground">No insight emitted</span>}
              </div>
            </div>
          ))
        )}
      </div>
      <div className="mt-3 text-xs text-muted-foreground">
        Auto runs every 20s (pauses when tab hidden/offline). Latest session is auto-detected.
      </div>
    </div>
  );
} 