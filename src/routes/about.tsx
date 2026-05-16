import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal-page";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — Aniware" },
      { name: "description", content: "About Aniware: a modern anime catalog and watch hub." },
      { property: "og:title", content: "About — Aniware" },
      { property: "og:description", content: "About Aniware: a modern anime catalog and watch hub." },
    ],
  }),
  component: () => (
    <LegalPage title="About Aniware">
      <p>
        Aniware is a modern anime catalog and watch hub built around three ideas:
        beautiful design, lightning-fast browsing, and resilience through multiple
        third-party mirrors.
      </p>
      <h2>What we do</h2>
      <p>
        We index titles from public sources (MyAnimeList via Jikan), let you build
        a watchlist, track your progress across episodes, and stream from a rotating
        set of unaffiliated mirror providers.
      </p>
      <h2>What we don't do</h2>
      <p>
        Aniware does not host, store, or upload any video files. Every playable
        link points to an external service that is independent from Aniware.
      </p>
      <h2>Get in touch</h2>
      <p>
        For takedown notices see our <a href="/dmca">DMCA</a> page. For everything
        else, hit us at <a href="mailto:hello@aniware.app">hello@aniware.app</a>.
      </p>
    </LegalPage>
  ),
});
