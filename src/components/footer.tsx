import { Link } from "@tanstack/react-router";
import logoMark from "@/assets/animerewa-logo.png";

export function Footer() {
  return (
    <footer className="border-t border-border/40 mt-24">
      <div className="container mx-auto px-4 py-10 grid gap-8 md:grid-cols-4">
        <div className="md:col-span-1">
          <div className="flex items-center gap-2 mb-3">
            <img src={logoMark} alt="animerewa" width={28} height={28} className="w-7 h-7 rounded-md" />
            <span className="font-display font-bold">animerewa</span>
          </div>
          <p className="text-sm text-muted-foreground max-w-xs">
            A modern anime catalog and watch hub. Stream sub or dub from one place.
          </p>
        </div>

        <div className="text-sm">
          <h4 className="font-semibold mb-3">Explore</h4>
          <ul className="space-y-2 text-muted-foreground">
            <li><Link to="/" className="hover:text-foreground">Home</Link></li>
            <li><Link to="/browse" className="hover:text-foreground">Browse</Link></li>
            <li><Link to="/genres" className="hover:text-foreground">Genres</Link></li>
            <li><Link to="/schedule" className="hover:text-foreground">Schedule</Link></li>
          </ul>
        </div>

        <div className="text-sm">
          <h4 className="font-semibold mb-3">Company</h4>
          <ul className="space-y-2 text-muted-foreground">
            <li><Link to="/about" className="hover:text-foreground">About</Link></li>
            <li><Link to="/terms" className="hover:text-foreground">Terms</Link></li>
            <li><Link to="/privacy" className="hover:text-foreground">Privacy</Link></li>
            <li><Link to="/dmca" className="hover:text-foreground">DMCA</Link></li>
          </ul>
        </div>

        <div className="text-sm text-muted-foreground">
          <h4 className="font-semibold mb-3 text-foreground">Disclaimer</h4>
          <p>
            animerewa does not host any media files. All playable content is loaded
            from independent third-party services.
          </p>
        </div>
      </div>
      <div className="border-t border-border/40 py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} animerewa
      </div>
    </footer>
  );
}
