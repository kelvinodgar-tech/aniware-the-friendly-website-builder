import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { User as UserIcon, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { getMyProfile, updateMyProfile } from "@/lib/user.functions";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Profile — Aniware" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const fetchProfile = useServerFn(getMyProfile);
  const update = useServerFn(updateMyProfile);

  const { data, isLoading } = useQuery({ queryKey: ["my-profile"], queryFn: () => fetchProfile() });

  const [username, setUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) {
      setUsername(data.username ?? "");
      setAvatarUrl(data.avatar_url ?? "");
    }
  }, [data]);

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await update({
        data: {
          username: username.trim() || undefined,
          avatar_url: avatarUrl.trim() || null,
        },
      });
      toast.success("Profile updated");
      qc.invalidateQueries({ queryKey: ["my-profile"] });
    } catch (err: any) {
      toast.error(err.message ?? "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-10 max-w-2xl">
      <h1 className="font-display text-3xl font-bold mb-2 flex items-center gap-2">
        <UserIcon className="w-7 h-7 text-primary" /> Profile
      </h1>
      <p className="text-muted-foreground mb-8">Your public Aniware identity.</p>

      <div className="rounded-2xl bg-surface border border-border/50 p-6 md:p-8">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-20 h-20 rounded-full bg-gradient-primary overflow-hidden flex items-center justify-center text-2xl font-bold text-primary-foreground">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              (username || user?.email || "?")[0]?.toUpperCase()
            )}
          </div>
          <div className="min-w-0">
            <div className="font-semibold truncate">{username || "—"}</div>
            <div className="text-sm text-muted-foreground truncate">{user?.email}</div>
          </div>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : (
          <form onSubmit={onSave} className="space-y-5">
            <div>
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="otaku_42"
                pattern="[a-zA-Z0-9_-]+"
                minLength={2}
                maxLength={40}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">Letters, numbers, _ and - only.</p>
            </div>
            <div>
              <Label htmlFor="avatar">Avatar URL</Label>
              <Input
                id="avatar"
                type="url"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://…"
                className="mt-1"
              />
            </div>
            <Button type="submit" disabled={saving} className="bg-gradient-primary shadow-glow">
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
