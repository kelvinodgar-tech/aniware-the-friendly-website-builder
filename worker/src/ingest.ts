// Ingest one pending job: claim via API → aria2c → ffmpeg → upload to Streamtape (+DoodStream)
// → register media_links via API → cleanup.
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { api } from "./api.js";
import { env } from "./env.js";

function sh(cmd: string, args: string[], cwd?: string) {
  const r = spawnSync(cmd, args, { cwd, stdio: "inherit" });
  if (r.status !== 0) throw new Error(`${cmd} failed (${r.status})`);
}

function aria2c(magnet: string, dir: string) {
  sh("aria2c", [
    "--seed-time=0",
    "--bt-stop-timeout=600",
    "--summary-interval=30",
    "--max-connection-per-server=8",
    "--split=8",
    "--dir", dir,
    magnet,
  ]);
}

function findVideo(dir: string): string {
  const walk = (d: string): string[] =>
    readdirSync(d).flatMap((f) => {
      const p = join(d, f);
      return statSync(p).isDirectory() ? walk(p) : [p];
    });
  const files = walk(dir).filter((f) => /\.(mkv|mp4)$/i.test(f));
  files.sort((a, b) => statSync(b).size - statSync(a).size);
  if (!files[0]) throw new Error("no video file found after download");
  return files[0];
}

function transcode(input: string, output: string) {
  sh("ffmpeg", [
    "-y", "-i", input,
    "-vf", "scale=-2:720",
    "-c:v", "libx264", "-preset", "veryfast", "-crf", "23",
    "-c:a", "aac", "-b:a", "128k",
    "-movflags", "+faststart",
    output,
  ]);
}

async function uploadStreamtape(file: string): Promise<{ url: string; download: string } | null> {
  if (!env.STREAMTAPE_LOGIN || !env.STREAMTAPE_KEY) return null;
  const init = await fetch(
    `https://api.streamtape.com/file/ul?login=${env.STREAMTAPE_LOGIN}&key=${env.STREAMTAPE_KEY}`
  ).then((r) => r.json() as Promise<{ result: { url: string } }>);
  const upUrl = init?.result?.url;
  if (!upUrl) throw new Error("streamtape: no upload url");
  const out = execFileSync("curl", ["-sS", "-F", `file1=@${file}`, upUrl]).toString();
  const j = JSON.parse(out) as { result?: { url: string; id: string } };
  if (!j.result?.url) throw new Error(`streamtape upload failed: ${out}`);
  return { url: j.result.url, download: j.result.url };
}

async function uploadDoodStream(file: string): Promise<{ url: string } | null> {
  if (!env.DOODSTREAM_API_KEY) return null;
  try {
    const srvRes = await fetch(`https://doodapi.com/api/upload/server?key=${env.DOODSTREAM_API_KEY}`)
      .then((r) => r.json() as Promise<{ result?: string }>);
    const upUrl = srvRes?.result;
    if (!upUrl) throw new Error("doodstream: no upload server");
    const out = execFileSync("curl", ["-sS", "-F", `api_key=${env.DOODSTREAM_API_KEY}`, "-F", `file=@${file}`, upUrl]).toString();
    const j = JSON.parse(out) as { result?: Array<{ download_url?: string; protected_embed?: string; filecode?: string }> };
    const r = j.result?.[0];
    const embed = r?.protected_embed ?? (r?.filecode ? `https://dood.to/e/${r.filecode}` : undefined);
    return embed ? { url: embed } : null;
  } catch (e) {
    console.warn("doodstream failed", e);
    return null;
  }
}

async function main() {
  const job = await api.claim();
  if (!job) {
    console.log("[ingest] no pending jobs");
    return;
  }
  console.log(`[ingest] job ${job.id} mal=${job.mal_id} ep=${job.episode_number}`);
  const dir = mkdtempSync(join(tmpdir(), "ani-"));
  try {
    aria2c(job.magnet, dir);
    const src = findVideo(dir);
    const out = join(dir, `ep${job.episode_number}.mp4`);
    transcode(src, out);

    const st = await uploadStreamtape(out);
    const dd = await uploadDoodStream(out);
    if (!st && !dd) throw new Error("no upload provider succeeded");

    const links = [
      st && { mal_id: job.mal_id, episode_number: job.episode_number, server_name: "streamtape", quality: job.quality, embed_url: st.url, direct_download_url: st.download, priority: 10 },
      dd && { mal_id: job.mal_id, episode_number: job.episode_number, server_name: "doodstream", quality: job.quality, embed_url: dd.url, priority: 20 },
    ].filter(Boolean) as Array<Record<string, unknown>>;

    await api.complete(job.id, links);
    console.log(`[ingest] done ${links.length} mirror(s)`);
  } catch (e: any) {
    console.error("[ingest] failed", e);
    try { await api.fail(job.id, String(e?.message ?? e).slice(0, 500), job.attempts); } catch {}
    process.exitCode = 1;
  } finally {
    try { rmSync(dir, { recursive: true, force: true }); } catch {}
  }
}

main();
