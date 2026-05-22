// Provider abstraction. The catalog uses Anikoto iframe sources keyed by language (sub/dub).
// Direct video/HLS URLs are also supported when present.

export type ProviderName = "direct" | "anikoto" | "generic";

export const PROVIDER_LABEL: Record<ProviderName, string> = {
  direct: "Direct player",
  anikoto: "Anikoto",
  generic: "Stream",
};

export const PROVIDER_PRIORITY: Record<ProviderName, number> = {
  direct: 5,
  anikoto: 8,
  generic: 100,
};

export function detectProvider(url: string): ProviderName {
  const u = url.toLowerCase();
  if (/\.(m3u8|mp4|webm|ogg)(\?|$)/.test(u)) return "direct";
  if (u.includes("megaplay") || u.includes("anikoto")) return "anikoto";
  return "generic";
}

// Returns null if the page looks healthy, otherwise a reason string.
export function detectFailureFromHtml(_provider: ProviderName, html: string): string | null {
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
  return null;
}
