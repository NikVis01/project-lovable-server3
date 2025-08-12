"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { EvaluationDisplay } from "./evaluation-display";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { AlertCircle, Loader2 } from "lucide-react";

const SERVER_URL =
  process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:3000";

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
      const ended = recent.find(
        (s) => (s.status || "").toUpperCase() === "ENDED"
      );
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
    setBusy(true);
    setError(null);
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
      console.debug("[CallEval] eval ok", {
        id,
        keys: Object.keys(data || {}),
      });
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
    <div className='space-y-6'>
      <Card className='p-6'>
        <div className='flex items-center justify-between mb-4'>
          <h3 className='text-lg font-semibold'>Call Evaluation</h3>
          <Button
            onClick={run}
            disabled={disabled}
            className='flex items-center gap-2'
          >
            {busy ? (
              <>
                <Loader2 className='h-4 w-4 animate-spin' />
                Evaluating…
              </>
            ) : (
              "Evaluate Latest Session"
            )}
          </Button>
        </div>

        {error && (
          <div className='flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md mb-4'>
            <AlertCircle className='h-4 w-4 text-red-500' />
            <span className='text-red-700 text-sm'>{error}</span>
          </div>
        )}

        {!result && !error && !busy && (
          <div className='text-center py-8 text-muted-foreground'>
            <div className='text-sm'>
              Click "Evaluate Latest Session" to analyze your most recent ended
              call.
            </div>
          </div>
        )}
      </Card>

      {result && (
        <EvaluationDisplay
          evaluation={result}
          sessionId={lastSessionId || undefined}
        />
      )}
    </div>
  );
}
