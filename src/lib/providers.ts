// Provider abstraction. Sources can be direct video/HLS URLs or opaque iframe URLs.
// Direct URLs are preferred because they are not blocked by X-Frame-Options.

export type ProviderName = "direct" | "streamtape" | "mp4upload" | "generic";

export const PROVIDER_LABEL: Record<ProviderName, string> = {
  direct: "Direct player",
  streamtape: "Streamtape",
  mp4upload: "Mp4Upload",
  generic: "Mirror",
};

export const PROVIDER_PRIORITY: Record<ProviderName, number> = {
  direct: 5,
  streamtape: 10,
  mp4upload: 20,
  generic: 100,
};

export function detectProvider(url: string): ProviderName {
  const u = url.toLowerCase();
  if (/\.(m3u8|mp4|webm|ogg)(\?|$)/.test(u)) return "direct";
  if (u.includes("streamtape")) return "streamtape";
  if (u.includes("mp4upload")) return "mp4upload";
  return "generic";
}

// Returns null if the page looks healthy, otherwise a reason string.
export function detectFailureFromHtml(provider: ProviderName, html: string): string | null {
  const text = html.toLowerCase();
  const universalMarkers = [
    "video not found",
    "file not found",
    "file was deleted",
    "removed for violation",
    "file has been removed",
    "this video is unavailable",
    "no longer available",
  ];
  if (universalMarkers.some((m) => text.includes(m))) return "removed";

  if (provider === "streamtape") {
    if (text.includes("video deleted") || text.includes("not found!")) return "removed";
    // Streamtape healthy pages contain the player container
    if (!text.includes("streamtape") && !text.includes("<video") && !text.includes("plyr"))
      return "missing-player";
  }
  if (provider === "mp4upload") {
    if (text.includes("file was deleted") || text.includes("404 not found")) return "removed";
  }
  return null;
}
