import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Download, RefreshCw, AlertTriangle, Play } from "lucide-react";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { getEpisodeSources } from "@/lib/anime.functions";
import { getEpisodeProgress, saveProgress } from "@/lib/user.functions";
import { useAuth } from "@/hooks/use-auth";
import { PROVIDER_LABEL } from "@/lib/providers";

type EpisodeSource = {
  id: string;
  embed_url: string;
  server_name: string;
  quality: string;
  language: string | null;
  subtitle_url: string | null;
};

function isDirectPlayable(source: EpisodeSource) {
  return source.server_name === "direct" || /\.(m3u8|mp4|webm|ogg)(\?|$)/i.test(source.embed_url);
}

function formatTime(s: number) {
  if (!s || !isFinite(s)) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export const Route = createFileRoute("/watch/$malId/$episode")({
  head: ({ params }) => ({
    meta: [
      { title: `Watch episode ${params.episode} — Aniware` },
      { name: "description", content: "Watch this episode on Aniware with automatic mirror fallback." },
    ],
  }),
  component: WatchPage,
});

function WatchPage() {
  const { malId, episode } = Route.useParams();
  const ep = Number(episode);
  const id = Number(malId);
  const fn = useServerFn(getEpisodeSources);
  const getProgress = useServerFn(getEpisodeProgress);
  const save = useServerFn(saveProgress);
  const navigate = useNavigate();
  const { user } = useAuth();

  const q = useQuery({
    queryKey: ["sources", id, ep],
    queryFn: () => fn({ data: { malId: id, episode: ep } }),
  });

  // resume info (auth-only)
  const progressQ = useQuery({
    queryKey: ["progress", id, ep, user?.id ?? null],
    queryFn: () => getProgress({ data: { malId: id, episode: ep } }),
    enabled: !!user,
  });
  const resumeAt = progressQ.data?.position_seconds ?? 0;

  const sources = q.data?.sources ?? [];
  const anime = q.data?.anime;

  const qualities = Array.from(new Set(sources.map((s) => s.quality)));
  const [quality, setQuality] = useState<string>("");
  const [provider, setProvider] = useState<string>("");
  const [playerKey, setPlayerKey] = useState(0);

  useEffect(() => {
    if (qualities.length && !quality) setQuality(qualities.includes("720p") ? "720p" : qualities[0]);
  }, [qualities, quality]);

  const matching = sources.filter((s) => !quality || s.quality === quality);
  useEffect(() => {
    if (matching.length && !matching.find((s) => s.id === provider)) {
      setProvider(matching[0].id);
    }
  }, [matching, provider]);

  const current = sources.find((s) => s.id === provider) ?? matching[0];

  const goEp = (delta: number) => {
    const next = ep + delta;
    if (next > 0) navigate({ to: "/watch/$malId/$episode", params: { malId, episode: String(next) } });
  };

  // Mark this episode as "watching" once the player has a source.
  // For iframe mirrors we cannot read playback time cross-origin, so this is
  // the only persistence we get — but it's enough for episode-level resume.
  const markedRef = useRef(false);
  useEffect(() => {
    if (!user || !current || markedRef.current) return;
    markedRef.current = true;
    save({ data: { malId: id, episode: ep, position: 0 } }).catch(() => {});
  }, [user, current, id, ep, save]);

  // Stable callback for the direct player to push heartbeats.
  const onProgress = useCallback(
    (position: number, duration: number) => {
      if (!user) return;
      const completed = duration > 0 && position / duration > 0.9;
      save({
        data: {
          malId: id,
          episode: ep,
          position: Math.floor(position),
          duration: Math.floor(duration) || undefined,
          completed,
        },
      }).catch(() => {});
    },
    [user, id, ep, save]
  );

  const [seekTo, setSeekTo] = useState<number>(0);
  const [showResume, setShowResume] = useState(false);
  useEffect(() => {
    // Show resume banner once when meaningful progress exists.
    if (resumeAt > 10) setShowResume(true);
  }, [resumeAt]);

  const directResume = current && isDirectPlayable(current) ? seekTo : 0;

  return (
    <div className="container mx-auto px-4 py-8">
      <Link to="/anime/$malId" params={{ malId }} className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center mb-4">
        <ChevronLeft className="w-4 h-4" /> Back to series
      </Link>

      <div className="rounded-2xl overflow-hidden bg-black shadow-card border border-border/40">
        <AspectRatio ratio={16 / 9}>
          {q.isLoading ? (
            <Skeleton className="w-full h-full" />
          ) : current ? (
            isDirectPlayable(current) ? (
              <DirectVideoPlayer
                key={`${playerKey}-${current.id}`}
                source={current}
                startAt={directResume}
                onProgress={onProgress}
              />
            ) : (
              <iframe
                key={`${playerKey}-${current.id}`}
                src={current.embed_url}
                allowFullScreen
                allow="autoplay; fullscreen; picture-in-picture"
                className="w-full h-full"
              />
            )
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-center px-6">
              <AlertTriangle className="w-10 h-10 text-warning mb-3" />
              <p className="font-semibold">No mirrors available for episode {ep}</p>
              <p className="text-sm text-muted-foreground mt-1">Try a different episode or check back later.</p>
            </div>
          )}
        </AspectRatio>
      </div>

      {/* Resume banner */}
      {showResume && current && (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/10 px-4 py-2.5">
          <div className="flex items-center gap-2 text-sm">
            <Play className="w-4 h-4 text-primary" />
            <span>
              {isDirectPlayable(current)
                ? `Continue from ${formatTime(resumeAt)}`
                : `You were watching this episode — pick up where you left off`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {isDirectPlayable(current) && (
              <Button
                size="sm"
                variant="default"
                className="bg-gradient-primary"
                onClick={() => {
                  setSeekTo(resumeAt);
                  setPlayerKey((k) => k + 1);
                  setShowResume(false);
                }}
              >
                Resume
              </Button>
            )}
            <button
              className="text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setShowResume(false)}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button variant="outline" size="sm" onClick={() => goEp(-1)} disabled={ep <= 1}>
          <ChevronLeft className="w-4 h-4 mr-1" /> Prev
        </Button>
        <Button variant="outline" size="sm" onClick={() => goEp(1)}>
          Next <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
        {qualities.length > 0 && (
          <Select value={quality} onValueChange={setQuality}>
            <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
            <SelectContent>
              {qualities.map((q) => <SelectItem key={q} value={q}>{q}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        {matching.length > 0 && (
          <Select value={provider} onValueChange={setProvider}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Server" /></SelectTrigger>
            <SelectContent>
              {matching.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {PROVIDER_LABEL[s.server_name as keyof typeof PROVIDER_LABEL] ?? s.server_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Button variant="ghost" size="sm" onClick={() => setPlayerKey((k) => k + 1)}>
          <RefreshCw className="w-4 h-4 mr-1" /> Reload
        </Button>
        <div className="ml-auto">
          <Button asChild variant="default" className="bg-gradient-primary">
            <Link to="/download/$malId/$episode" params={{ malId, episode }}>
              <Download className="w-4 h-4 mr-2" /> Download
            </Link>
          </Button>
        </div>
      </div>

      <div className="mt-8">
        <h1 className="font-display text-2xl md:text-3xl font-bold">
          {anime?.title_english || anime?.title} <span className="text-muted-foreground font-normal">— Episode {ep}</span>
        </h1>
        <div className="mt-2 flex flex-wrap gap-2">
          {current && <Badge variant="secondary">{current.quality}</Badge>}
          {current && <Badge variant="outline">{current.language?.toUpperCase()}</Badge>}
          <Badge variant="outline">{matching.length} mirror{matching.length === 1 ? "" : "s"}</Badge>
        </div>
        {anime?.synopsis && <p className="mt-4 text-muted-foreground max-w-3xl line-clamp-4">{anime.synopsis}</p>}
      </div>
    </div>
  );
}

function DirectVideoPlayer({
  source,
  startAt,
  onProgress,
}: {
  source: EpisodeSource;
  startAt: number;
  onProgress: (position: number, duration: number) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let hls: import("hls.js").default | null = null;
    let cancelled = false;
    setError(false);

    const onLoaded = () => {
      if (startAt > 0 && startAt < (video.duration || Infinity)) {
        try { video.currentTime = startAt; } catch {}
      }
    };
    video.addEventListener("loadedmetadata", onLoaded);

    if (/\.m3u8(\?|$)/i.test(source.embed_url) && !video.canPlayType("application/vnd.apple.mpegurl")) {
      import("hls.js")
        .then(({ default: Hls }) => {
          if (cancelled) return;
          if (!Hls.isSupported()) {
            setError(true);
            return;
          }
          hls = new Hls({ enableWorker: true });
          hls.loadSource(source.embed_url);
          hls.attachMedia(video);
          hls.on(Hls.Events.ERROR, (_event: string, data: { fatal: boolean }) => {
            if (data.fatal) setError(true);
          });
        })
        .catch(() => setError(true));
    } else {
      video.src = source.embed_url;
    }

    return () => {
      cancelled = true;
      video.removeEventListener("loadedmetadata", onLoaded);
      hls?.destroy();
      video.removeAttribute("src");
      video.load();
    };
  }, [source.id, source.embed_url, startAt]);

  // Heartbeat: persist position every ~10s while playing + on pause/unmount.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let last = 0;
    const tick = () => {
      const now = Date.now();
      if (now - last < 10000) return;
      last = now;
      onProgress(video.currentTime || 0, video.duration || 0);
    };
    const flush = () => onProgress(video.currentTime || 0, video.duration || 0);
    video.addEventListener("timeupdate", tick);
    video.addEventListener("pause", flush);
    window.addEventListener("beforeunload", flush);
    return () => {
      video.removeEventListener("timeupdate", tick);
      video.removeEventListener("pause", flush);
      window.removeEventListener("beforeunload", flush);
      flush();
    };
  }, [onProgress]);

  return (
    <div className="relative w-full h-full bg-black">
      <video
        ref={videoRef}
        controls
        playsInline
        preload="metadata"
        className="w-full h-full"
        onError={() => setError(true)}
      >
        {source.subtitle_url && <track kind="subtitles" src={source.subtitle_url} label="Subtitles" default />}
      </video>
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 bg-background/95">
          <AlertTriangle className="w-10 h-10 text-warning mb-3" />
          <p className="font-semibold">This stream could not be played.</p>
          <p className="text-sm text-muted-foreground mt-1">Try another server or reload the player.</p>
        </div>
      )}
    </div>
  );
}
