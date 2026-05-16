import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border/40 mt-24">
      <div className="container mx-auto px-4 py-10 grid gap-6 md:grid-cols-3">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-md bg-gradient-primary flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-display font-bold">Aniware</span>
          </div>
          <p className="text-sm text-muted-foreground max-w-xs">
            A modern anime catalog and watch hub powered by community mirrors.
          </p>
        </div>
        <div className="text-sm">
          <h4 className="font-semibold mb-3">Explore</h4>
          <ul className="space-y-2 text-muted-foreground">
            <li><Link to="/" className="hover:text-foreground">Home</Link></li>
            <li><Link to="/browse" className="hover:text-foreground">Browse</Link></li>
          </ul>
        </div>
        <div className="text-sm text-muted-foreground">
          <h4 className="font-semibold mb-3 text-foreground">Disclaimer</h4>
          <p>
            Aniware does not host any media files. All embedded content is provided by
            unaffiliated third-party services.
          </p>
        </div>
      </div>
      <div className="border-t border-border/40 py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Aniware
      </div>
    </footer>
  );
}
