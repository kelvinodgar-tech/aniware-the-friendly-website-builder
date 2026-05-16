import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Download as DownloadIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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

  const downloadable = (q.data?.sources ?? []).filter((s) => s.direct_download_url);
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

  const anime = q.data?.anime;

  return (
    <div className="container mx-auto px-4 py-16 max-w-2xl">
      <div className="rounded-2xl bg-surface border border-border/50 shadow-card p-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
            <DownloadIcon className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold">Download episode {episode}</h1>
            <p className="text-sm text-muted-foreground">{anime?.title_english || anime?.title}</p>
          </div>
        </div>

        {picked ? (
          <div className="text-center py-10">
            <Loader2 className="w-10 h-10 animate-spin mx-auto text-primary mb-4" />
            <p className="font-semibold">Preparing your download…</p>
            <p className="text-sm text-muted-foreground mt-1">Starting in {counting}s</p>
          </div>
        ) : downloadable.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <p>No direct downloads available for this episode.</p>
            <Button asChild variant="outline" className="mt-4">
              <Link to="/watch/$malId/$episode" params={{ malId, episode }}>Watch instead</Link>
            </Button>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-4">Choose a quality and mirror:</p>
            <div className="space-y-2">
              {downloadable.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setPicked(s.id)}
                  className="w-full text-left p-4 rounded-lg bg-background hover:bg-accent border border-border/50 hover:border-primary transition-all flex items-center justify-between"
                >
                  <div>
                    <div className="font-semibold">{s.quality} · {PROVIDER_LABEL[s.server_name as keyof typeof PROVIDER_LABEL] ?? s.server_name}</div>
                    <div className="text-xs text-muted-foreground capitalize">{s.language} · status: {s.status}</div>
                  </div>
                  <DownloadIcon className="w-5 h-5 text-primary" />
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
