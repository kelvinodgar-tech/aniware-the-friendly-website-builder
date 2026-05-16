import { createFileRoute, redirect } from "@tanstack/react-router";

// Alias: /search?q=... → /browse?q=...
export const Route = createFileRoute("/search")({
  validateSearch: (s: Record<string, unknown>) => ({ q: typeof s.q === "string" ? s.q : undefined }),
  beforeLoad: ({ search }) => {
    throw redirect({ to: "/browse", search: search.q ? { q: search.q } : {} });
  },
});
