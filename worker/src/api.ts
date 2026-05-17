// Tiny HTTP client to call the Aniware worker RPC endpoint.
// Replaces direct Supabase service-role access.
import { env } from "./env.js";

async function rpc(action: string, body: Record<string, unknown> = {}) {
  const url = `${env.APP_URL.replace(/\/$/, "")}/api/public/worker/rpc`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-worker-secret": env.WORKER_SECRET,
    },
    body: JSON.stringify({ action, ...body }),
  });
  const text = await res.text();
  let json: any;
  try { json = JSON.parse(text); } catch { json = { ok: false, error: text }; }
  if (!res.ok || !json?.ok) {
    throw new Error(`rpc ${action} failed: ${res.status} ${json?.error ?? text}`);
  }
  return json;
}

export const api = {
  claim: () => rpc("claim").then((r) => r.job as null | {
    id: string; mal_id: number; episode_number: number; magnet: string; quality: string; attempts: number;
  }),
  complete: (jobId: string, links: Array<Record<string, unknown>>) =>
    rpc("complete", { jobId, links }),
  fail: (jobId: string, error: string, attempts: number) =>
    rpc("fail", { jobId, error, attempts }),
  enqueue: (jobs: Array<Record<string, unknown>>) =>
    rpc("enqueue", { jobs }).then((r) => r.enqueued as number),
};
