import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal-page";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — Aniware" },
      { name: "description", content: "Terms governing the use of Aniware." },
    ],
  }),
  component: () => (
    <LegalPage title="Terms of Service" updated="May 2026">
      <p>By accessing Aniware you agree to these terms. If you don't agree, please don't use the service.</p>
      <h2>1. Service</h2>
      <p>Aniware provides a catalog UI and embeds player frames from third-party hosts. We do not host, upload, or transmit video data ourselves.</p>
      <h2>2. Accounts</h2>
      <p>You're responsible for activity under your account. Don't share credentials. Don't attempt to abuse, scrape, or overload the service.</p>
      <h2>3. Third-party content</h2>
      <p>Mirror providers (Streamtape, DoodStream, etc.) operate independently and are governed by their own terms. We make no warranty about availability, legality in your jurisdiction, or quality of any embed.</p>
      <h2>4. No warranty</h2>
      <p>The service is provided "as is" without warranties of any kind. We disclaim liability to the maximum extent permitted by law.</p>
      <h2>5. Termination</h2>
      <p>We may suspend or remove accounts that violate these terms or applicable law.</p>
      <h2>6. Changes</h2>
      <p>We may update these terms; continued use means acceptance of the new version.</p>
    </LegalPage>
  ),
});
