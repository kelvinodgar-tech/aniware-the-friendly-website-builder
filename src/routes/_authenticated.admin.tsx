import { createFileRoute, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, RefreshCw, Trash2, Activity, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import {
  listAllMediaLinks,
  upsertMediaLink,
  deleteMediaLink,
  checkOneLink,
  batchHealthCheck,
} from "@/lib/anime.functions";
import { isMyAdmin } from "@/lib/user.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/login" });
  },
  head: () => ({ meta: [{ title: "Admin — Aniware" }] }),
  component: AdminPage,
});

function AdminPage() {
  const adminFn = useServerFn(isMyAdmin);
  const listFn = useServerFn(listAllMediaLinks);
  const saveFn = useServerFn(upsertMediaLink);
  const delFn = useServerFn(deleteMediaLink);
  const checkFn = useServerFn(checkOneLink);
  const batchFn = useServerFn(batchHealthCheck);

  const admin = useQuery({ queryKey: ["isAdmin"], queryFn: () => adminFn() });
  const qc = useQueryClient();
  const links = useQuery({
    queryKey: ["adminLinks"],
    queryFn: () => listFn(),
    enabled: admin.data?.isAdmin === true,
  });

  const [form, setForm] = useState({
    mal_id: "", episode_number: "1", server_name: "streamtape",
    quality: "720p" as "480p" | "720p" | "1080p",
    embed_url: "", direct_download_url: "", subtitle_url: "",
    language: "sub" as "sub" | "dub", priority: "100",
  });

  const save = useMutation({
    mutationFn: () => saveFn({
      data: {
        mal_id: Number(form.mal_id),
        episode_number: Number(form.episode_number),
        server_name: form.server_name,
        quality: form.quality,
        embed_url: form.embed_url,
        direct_download_url: form.direct_download_url || null,
        subtitle_url: form.subtitle_url || null,
        language: form.language,
        priority: Number(form.priority),
      },
    }),
    onSuccess: () => {
      toast.success("Link saved");
      setForm({ ...form, embed_url: "", direct_download_url: "", subtitle_url: "" });
      qc.invalidateQueries({ queryKey: ["adminLinks"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["adminLinks"] }); },
  });

  const check = useMutation({
    mutationFn: (id: string) => checkFn({ data: { id } }),
    onSuccess: (r) => {
      toast[r.healthy ? "success" : "error"](r.healthy ? "Healthy" : `Broken: ${r.reason}`);
      qc.invalidateQueries({ queryKey: ["adminLinks"] });
    },
  });

  const batch = useMutation({
    mutationFn: () => batchFn(),
    onSuccess: (r) => { toast.success(`Checked ${r.checked} links`); qc.invalidateQueries({ queryKey: ["adminLinks"] }); },
  });

  if (admin.isLoading) return <div className="p-10 text-center">Checking permissions…</div>;
  if (!admin.data?.isAdmin) {
    return (
      <div className="container mx-auto px-4 py-20 max-w-md text-center">
        <Shield className="w-12 h-12 text-primary mx-auto mb-4" />
        <h1 className="font-display text-2xl font-bold mb-2">Admin only</h1>
        <p className="text-muted-foreground text-sm">
          You're signed in but don't have admin access. Promote your account from the backend:
          <code className="block mt-3 p-3 bg-surface rounded text-xs">
            INSERT INTO user_roles (user_id, role) VALUES ('{admin.data?.userId}', 'admin');
          </code>
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-10 space-y-10">
      <div>
        <h1 className="font-display text-3xl font-bold flex items-center gap-2">
          <Shield className="w-7 h-7 text-primary" /> Admin
        </h1>
        <p className="text-muted-foreground">Manage media mirrors and provider health.</p>
      </div>

      <section className="bg-surface border border-border/50 rounded-2xl p-6 shadow-card">
        <h2 className="font-display text-xl font-bold mb-4 flex items-center gap-2"><Plus className="w-5 h-5" /> Add / update mirror</h2>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
          <div><Label>MAL ID</Label><Input value={form.mal_id} onChange={(e) => setForm({ ...form, mal_id: e.target.value })} placeholder="52991" /></div>
          <div><Label>Episode</Label><Input type="number" value={form.episode_number} onChange={(e) => setForm({ ...form, episode_number: e.target.value })} /></div>
          <div>
            <Label>Quality</Label>
            <Select value={form.quality} onValueChange={(v) => setForm({ ...form, quality: v as any })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{["480p","720p","1080p"].map(q => <SelectItem key={q} value={q}>{q}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Server</Label>
            <Select value={form.server_name} onValueChange={(v) => setForm({ ...form, server_name: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="streamtape">Streamtape</SelectItem>
                <SelectItem value="mp4upload">Mp4Upload</SelectItem>
                <SelectItem value="generic">Generic</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Language</Label>
            <Select value={form.language} onValueChange={(v) => setForm({ ...form, language: v as any })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="sub">Sub</SelectItem><SelectItem value="dub">Dub</SelectItem></SelectContent>
            </Select>
          </div>
          <div><Label>Priority (lower=higher)</Label><Input type="number" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} /></div>
          <div className="md:col-span-3"><Label>Embed URL</Label><Input value={form.embed_url} onChange={(e) => setForm({ ...form, embed_url: e.target.value })} placeholder="https://streamtape.com/e/..." /></div>
          <div className="md:col-span-3"><Label>Direct download URL (optional)</Label><Input value={form.direct_download_url} onChange={(e) => setForm({ ...form, direct_download_url: e.target.value })} /></div>
          <div className="md:col-span-3"><Label>Subtitle .vtt URL (optional)</Label><Input value={form.subtitle_url} onChange={(e) => setForm({ ...form, subtitle_url: e.target.value })} /></div>
        </div>
        <Button onClick={() => save.mutate()} disabled={save.isPending || !form.mal_id || !form.embed_url} className="mt-5 bg-gradient-primary shadow-glow">
          {save.isPending ? "Saving…" : "Save mirror"}
        </Button>
      </section>

      <section className="bg-surface border border-border/50 rounded-2xl p-6 shadow-card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl font-bold flex items-center gap-2"><Activity className="w-5 h-5" /> Mirrors ({links.data?.length ?? 0})</h2>
          <Button onClick={() => batch.mutate()} disabled={batch.isPending} variant="outline" size="sm">
            <RefreshCw className={`w-4 h-4 mr-1 ${batch.isPending ? "animate-spin" : ""}`} /> Run health batch
          </Button>
        </div>
        <div className="space-y-2 max-h-[600px] overflow-y-auto scrollbar-thin">
          {(links.data ?? []).map((l: any) => (
            <div key={l.id} className="flex items-center gap-3 p-3 rounded-lg bg-background border border-border/30 text-sm">
              <div className="font-mono text-xs text-muted-foreground w-16">#{l.mal_id}</div>
              <div className="w-12 text-center font-semibold">ep {l.episode_number}</div>
              <Badge variant="outline">{l.quality}</Badge>
              <Badge>{l.server_name}</Badge>
              <Badge variant={l.status === "healthy" ? "default" : l.status === "broken" ? "destructive" : "secondary"}>
                {l.status}
              </Badge>
              <div className="flex-1 truncate text-muted-foreground text-xs">{l.embed_url}</div>
              <Button size="sm" variant="ghost" onClick={() => check.mutate(l.id)} disabled={check.isPending}>
                <RefreshCw className="w-3 h-3" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => del.mutate(l.id)} disabled={del.isPending}>
                <Trash2 className="w-3 h-3 text-destructive" />
              </Button>
            </div>
          ))}
          {(links.data?.length ?? 0) === 0 && <p className="text-center text-muted-foreground py-10">No mirrors yet.</p>}
        </div>
      </section>
    </div>
  );
}
