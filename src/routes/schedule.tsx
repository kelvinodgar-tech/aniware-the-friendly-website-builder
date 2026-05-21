import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { getSchedule } from "@/lib/anime.functions";
import { AnimeCard } from "@/components/anime-card";
import { CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";

const DAYS = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"] as const;
type Day = typeof DAYS[number];

function todayKey(): Day {
  const i = new Date().getDay(); // 0 = Sunday
  return (["sunday","monday","tuesday","wednesday","thursday","friday","saturday"] as const)[i];
}

export const Route = createFileRoute("/schedule")({
  head: () => ({
    meta: [
      { title: "Schedule — animerewa" },
      { name: "description", content: "Weekly anime broadcasting schedule. See what airs each day." },
    ],
  }),
  component: SchedulePage,
});

function SchedulePage() {
  const [day, setDay] = useState<Day>(todayKey());
  const fn = useServerFn(getSchedule);
  const { data, isLoading } = useQuery({
    queryKey: ["schedule", day],
    queryFn: () => fn({ data: { day } }),
  });

  return (
    <div className="container mx-auto px-4 py-10">
      <h1 className="font-display text-3xl font-bold mb-2 flex items-center gap-2">
        <CalendarDays className="w-7 h-7 text-primary" /> Schedule
      </h1>
      <p className="text-muted-foreground mb-6">What's airing each day this week.</p>

      <div className="flex gap-2 overflow-x-auto pb-3 mb-6 scrollbar-thin">
        {DAYS.map((d) => (
          <button
            key={d}
            onClick={() => setDay(d)}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium capitalize whitespace-nowrap border transition-all",
              d === day
                ? "bg-primary text-primary-foreground border-primary shadow-glow"
                : "bg-surface border-border/50 text-muted-foreground hover:text-foreground hover:border-border"
            )}
          >
            {d}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="aspect-[2/3] rounded-xl bg-surface animate-pulse" />
          ))}
        </div>
      ) : (data?.length ?? 0) === 0 ? (
        <p className="text-muted-foreground">Nothing scheduled.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {data!.map((a) => <AnimeCard key={a.mal_id} a={a} />)}
        </div>
      )}
    </div>
  );
}
