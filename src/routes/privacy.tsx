import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal-page";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — animerewa" },
      { name: "description", content: "How animerewa handles your data." },
    ],
  }),
  component: () => (
    <LegalPage title="Privacy Policy" updated="May 2026">
      <p>This page explains what we collect and why.</p>
      <h2>What we collect</h2>
      <ul>
        <li>Account email and any profile fields you provide (username, avatar URL).</li>
        <li>Your watchlist and watch progress, stored against your user id.</li>
        <li>Standard server logs for security and abuse prevention.</li>
      </ul>
      <h2>What we don't collect</h2>
      <ul>
        <li>Payment data — animerewa is free.</li>
        <li>Behavioral ad-tracking cookies.</li>
      </ul>
      <h2>Third parties</h2>
      <p>Embedded players load directly from third-party hosts. Those hosts may set their own cookies or run their own analytics inside the embed iframe. We have no control over them.</p>
      <h2>Your rights</h2>
      <p>You can delete your account at any time, which removes your profile, watchlist, and progress. Email us at our support channel.</p>
    </LegalPage>
  ),
});
