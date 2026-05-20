import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  Download as DownloadIcon,
  Loader2,
  Play,
  ExternalLink,
  ShieldCheck,
  Film,
  AlertTriangle,
  ChevronLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getEpisodeSources } from "@/lib/anime.functions";
import { PROVIDER_LABEL } from "@/lib/providers";

export const Route = createFileRoute("/download/$malId/$episode")({
  head: ({ params }) => ({
    meta: [
      { title: `Download episode ${params.episode} — Aniware` },
      { name: "description", content: "Prepare your download from available mirrors." },
    ],
  }),
  component: DownloadPage,
});

function DownloadPage() {
  const { malId, episode } = Route.useParams();
  const fn = useServerFn(getEpisodeSources);
  const q = useQuery({
    queryKey: ["sources", Number(malId), Number(episode)],
    queryFn: () => fn({ data: { malId: Number(malId), episode: Number(episode) } }),
  });

  const all = q.data?.sources ?? [];
  const downloadable = all.filter((s) => s.direct_download_url);
  const embedMirrors = all.filter((s) => !s.direct_download_url);
  const anime = q.data?.anime;

  const [picked, setPicked] = useState<string | null>(null);
  const [counting, setCounting] = useState(0);

  useEffect(() => {
    if (!picked) return;
    setCounting(3);
    const link = downloadable.find((d) => d.id === picked);
    if (!link?.direct_download_url) return;
    const t = setInterval(() => {
      setCounting((c) => {
        if (c <= 1) {
          clearInterval(t);
          window.location.href = link.direct_download_url!;
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [picked, downloadable]);

  return (
    <div className="container mx-auto px-4 py-10 max-w-3xl">
      <Link
        to="/anime/$malId"
        params={{ malId }}
        className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center mb-6"
      >
        <ChevronLeft className="w-4 h-4" /> Back to series
      </Link>

      {/* Header card */}
      <div className="relative overflow-hidden rounded-3xl border border-border/50 bg-gradient-to-br from-surface to-background shadow-card">
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
        <div className="relative p-6 sm:p-8 flex gap-5">
          {anime?.poster_url ? (
            <img
              src={anime.poster_url}
              alt={anime.title}
              loading="lazy"
              className="w-24 sm:w-32 aspect-[2/3] object-cover rounded-xl border border-border/40 shadow-lg shrink-0"
            />
          ) : (
            <Skeleton className="w-24 sm:w-32 aspect-[2/3] rounded-xl shrink-0" />
          )}
          <div className="flex flex-col justify-between min-w-0">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-primary font-semibold">
                  <DownloadIcon className="w-3.5 h-3.5" /> Download center
                </span>
              </div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold leading-tight">
                {anime?.title_english || anime?.title || "Loading…"}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">Episode {episode}</p>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge variant="secondary" className="gap-1">
                <ShieldCheck className="w-3 h-3" /> Safe redirect
              </Badge>
              <Badge variant="outline" className="gap-1">
                <Film className="w-3 h-3" /> {all.length} source{all.length === 1 ? "" : "s"}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="mt-6 rounded-3xl border border-border/50 bg-surface p-6 sm:p-8 shadow-card">
        {q.isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
          </div>
        ) : picked ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-2xl bg-gradient-primary mx-auto flex items-center justify-center shadow-glow mb-4">
              <Loader2 className="w-8 h-8 animate-spin text-primary-foreground" />
            </div>
            <p className="font-display text-xl font-bold">Preparing your download…</p>
            <p className="text-sm text-muted-foreground mt-2">Starting in {counting}s</p>
            <button
              className="text-xs text-muted-foreground hover:text-foreground mt-4 underline"
              onClick={() => setPicked(null)}
            >
              Cancel
            </button>
          </div>
        ) : downloadable.length > 0 ? (
          <>
            <h2 className="font-display text-lg font-bold mb-1">Direct downloads</h2>
            <p className="text-sm text-muted-foreground mb-4">Pick a quality to begin.</p>
            <div className="space-y-2">
              {downloadable.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setPicked(s.id)}
                  className="group w-full text-left p-4 rounded-xl bg-background border border-border/50 hover:border-primary hover:bg-accent transition-all flex items-center justify-between"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center transition-colors">
                      <DownloadIcon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold truncate">
                        {s.quality} ·{" "}
                        {PROVIDER_LABEL[s.server_name as keyof typeof PROVIDER_LABEL] ?? s.server_name}
                      </div>
                      <div className="text-xs text-muted-foreground capitalize">
                        {s.language ?? "sub"} · {s.status}
                      </div>
                    </div>
                  </div>
                  <ChevronLeft className="w-5 h-5 rotate-180 text-muted-foreground group-hover:text-primary transition" />
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="py-6">
            <div className="flex items-start gap-3 mb-5">
              <div className="w-10 h-10 rounded-lg bg-warning/15 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-warning" />
              </div>
              <div>
                <h2 className="font-display text-lg font-bold">No direct downloads yet</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  This episode is currently only available via streaming mirrors. You can still
                  watch it in the player, or open a mirror in a new tab.
                </p>
              </div>
            </div>

            <Button asChild className="bg-gradient-primary w-full sm:w-auto">
              <Link to="/watch/$malId/$episode" params={{ malId, episode }}>
                <Play className="w-4 h-4 mr-2" /> Watch episode {episode}
              </Link>
            </Button>

            {embedMirrors.length > 0 && (
              <div className="mt-6">
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                  Streaming mirrors
                </p>
                <div className="space-y-2">
                  {embedMirrors.map((s) => (
                    <a
                      key={s.id}
                      href={s.embed_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group w-full text-left p-3 rounded-xl bg-background border border-border/50 hover:border-primary transition-all flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Film className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium text-sm">
                            {PROVIDER_LABEL[s.server_name as keyof typeof PROVIDER_LABEL] ?? s.server_name}
                          </div>
                          <div className="text-xs text-muted-foreground capitalize">
                            {s.language ?? "sub"} · {s.quality}
                          </div>
                        </div>
                      </div>
                      <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground text-center mt-6">
        Aniware does not host any files. All sources are provided by third-party mirrors.
      </p>
    </div>
  );
}
