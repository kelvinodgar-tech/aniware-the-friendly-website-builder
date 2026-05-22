// Scout: poll Nyaa RSS for SubsPlease 720p releases, match to Jikan top airing,
// enqueue missing episodes via the animerewa worker API.
import Parser from "rss-parser";
import { api } from "./api.js";

const NYAA_RSS = "https://nyaa.si/?page=rss&q=%5BSubsPlease%5D+720p&c=1_2&f=0";
const RX = /\[SubsPlease\]\s+(.+?)\s+-\s+(\d{1,4})(?:v\d)?\s+\(720p\)/i;

type Item = { title?: string; link?: string; enclosure?: { url?: string } };

async function jikanTopAiring(): Promise<{ mal_id: number; title: string }[]> {
  const r = await fetch("https://api.jikan.moe/v4/top/anime?filter=airing&limit=25");
  const j = (await r.json()) as { data: { mal_id: number; title: string }[] };
  return j.data ?? [];
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

async function main() {
  const parser = new Parser();
  const feed = await parser.parseURL(NYAA_RSS);
  const airing = await jikanTopAiring();

  const jobs: Array<Record<string, unknown>> = [];
  for (const raw of feed.items as Item[]) {
    const m = raw.title?.match(RX);
    if (!m) continue;
    const releaseTitle = m[1].trim();
    const episode = parseInt(m[2], 10);
    const magnet = (raw as any).link ?? raw.enclosure?.url;
    if (!magnet?.startsWith("magnet:")) continue;
    const match = airing.find(
      (a) => norm(a.title).includes(norm(releaseTitle)) || norm(releaseTitle).includes(norm(a.title))
    );
    if (!match) continue;
    jobs.push({
      mal_id: match.mal_id,
      episode_number: episode,
      release_title: releaseTitle,
      release_group: "SubsPlease",
      magnet,
      quality: "720p",
    });
  }
  const enqueued = jobs.length ? await api.enqueue(jobs) : 0;
  console.log(`[scout] enqueued ${enqueued} new jobs (of ${jobs.length} candidates)`);
}

main().catch((e) => {
  console.error("[scout] failed", e);
  process.exit(1);
});
