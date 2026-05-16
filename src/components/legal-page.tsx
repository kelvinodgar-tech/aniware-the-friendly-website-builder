import type { ReactNode } from "react";

export function LegalPage({ title, updated, children }: { title: string; updated?: string; children: ReactNode }) {
  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <h1 className="font-display text-4xl font-bold mb-2">{title}</h1>
      {updated && <p className="text-sm text-muted-foreground mb-8">Last updated: {updated}</p>}
      <article className="prose prose-invert max-w-none text-foreground/90 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:mt-10 [&_h2]:mb-3 [&_p]:leading-relaxed [&_p]:mb-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1 [&_a]:text-primary [&_a]:underline">
        {children}
      </article>
    </div>
  );
}
