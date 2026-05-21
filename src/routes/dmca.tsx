import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal-page";

export const Route = createFileRoute("/dmca")({
  head: () => ({
    meta: [
      { title: "DMCA — animerewa" },
      { name: "description", content: "DMCA takedown notice procedure for animerewa." },
    ],
  }),
  component: () => (
    <LegalPage title="DMCA Notice" updated="May 2026">
      <p>
        animerewa does <strong>not</strong> host any video content. All playable embeds load from
        independent third-party providers. If your copyrighted material appears via one of those
        providers, the fastest path is to issue a takedown to <em>that provider</em>.
      </p>
      <h2>To remove an embed from animerewa</h2>
      <p>If you'd like us to also remove the embed listing from our catalog, send the following to <a href="mailto:dmca@animerewa.app">dmca@animerewa.app</a>:</p>
      <ul>
        <li>Identification of the copyrighted work (title, episode).</li>
        <li>The exact URL on animerewa where it appears.</li>
        <li>Your contact information.</li>
        <li>A statement that you have a good-faith belief the use is unauthorized.</li>
        <li>A statement, under penalty of perjury, that the information is accurate and that you are authorized to act on behalf of the rights holder.</li>
        <li>Your physical or electronic signature.</li>
      </ul>
      <p>We typically remove valid claims within 48 hours.</p>
    </LegalPage>
  ),
});
