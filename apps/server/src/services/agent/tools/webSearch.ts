import { z } from "zod";

const InputSchema = z.object({ query: z.string().min(3) });

export async function webSearch(input: unknown) {
  const { query } = InputSchema.parse(input);
  const key = process.env.TAVILY_API_KEY;
  if (!key) return { citations: [], summary: "" };
  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: key, query, max_results: 5 }),
    });
    if (!res.ok) return { citations: [], summary: "" };
    const data: { results?: Array<{ title?: string; url: string }>; answer?: string } = await res.json();
    const citations = (data.results || []).map((r) => ({ title: r.title || r.url, url: r.url }));
    return { citations, summary: data.answer || "" };
  } catch {
    return { citations: [], summary: "" };
  }
} 