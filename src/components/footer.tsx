import Link from "next/link";
import Image from "next/image";

export function Footer() {
  return (
    <footer
      className="mt-auto"
      style={{
        background: "var(--bg-surface)",
        borderTop: "1px solid rgba(255, 255, 255, 0.08)",
      }}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-12 pt-16 pb-12">
        <div
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-10 pb-12"
          style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.06)" }}
        >
          {/* Brand */}
          <div className="space-y-4">
            <Link href="/" className="flex items-center gap-2.5 mb-1 group tactile-button">
              <div
                className="w-9 h-9 rounded-xl flex-shrink-0 overflow-hidden transition-all duration-200 group-hover:scale-105"
                style={{
                  boxShadow: "0 0 0 1px rgba(255,255,255,0.12), inset 0 1px 0 rgba(255,255,255,0.2), 0 4px 12px rgba(37, 99, 235, 0.25)",
                }}
              >
                <Image
                  src="/logo.jpg"
                  alt="OLVYN"
                  width={36}
                  height={36}
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="font-extrabold text-xl tracking-tight group-hover:text-blue-200 transition-colors" style={{ color: "var(--text-primary)" }}>
                OLVYN
              </span>
            </Link>
            <p className="text-xs leading-relaxed max-w-xs" style={{ color: "var(--text-secondary)" }}>
              Free open courses with transparent syllabi, progress tracking, and Nova AI guidance.
            </p>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/40 border border-emerald-500/30 text-[10px] font-mono text-emerald-300">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400"></span>
              </span>
              <span>SYSTEM: OPERATIONAL</span>
            </div>
          </div>

          {/* Navigation */}
          <div>
            <h4
              className="text-[11px] font-mono uppercase tracking-widest mb-4"
              style={{ color: "var(--cyan)" }}
            >
              EXPLORATION
            </h4>
            <ul className="space-y-2.5 text-xs font-semibold" style={{ color: "#A8B4CC" }}>
              <li><Link href="/" className="hover:text-[#F5F7FF] transition-colors">Home</Link></li>
              <li><Link href="/explore" className="hover:text-[#F5F7FF] transition-colors">Course Catalog</Link></li>
              <li><Link href="/#categories" className="hover:text-[#F5F7FF] transition-colors">Categories</Link></li>
              <li><Link href="/nova" className="hover:text-[#F5F7FF] transition-colors">Nova AI</Link></li>
            </ul>
          </div>

          {/* Studio */}
          <div>
            <h4
              className="text-[11px] font-mono uppercase tracking-widest mb-4"
              style={{ color: "var(--cyan)" }}
            >
              STUDIO &amp; AUTHORS
            </h4>
            <ul className="space-y-2.5 text-xs font-semibold" style={{ color: "#A8B4CC" }}>
              <li><Link href="/contributor" className="hover:text-[#F5F7FF] transition-colors">Creator Studio</Link></li>
              <li><Link href="/contributor/courses/new" className="hover:text-[#F5F7FF] transition-colors">Create Course</Link></li>
              <li><Link href="/admin" className="hover:text-[#F5F7FF] transition-colors">Editorial Review</Link></li>
              <li><Link href="/register" className="hover:text-[#F5F7FF] transition-colors">Join Community</Link></li>
            </ul>
          </div>

          {/* Platform */}
          <div>
            <h4
              className="text-[11px] font-mono uppercase tracking-widest mb-4"
              style={{ color: "var(--cyan)" }}
            >
              INFRASTRUCTURE
            </h4>
            <ul className="space-y-2 text-xs font-mono" style={{ color: "#A8B4CC" }}>
              <li className="font-semibold text-white">support@openlearner.ai</li>
              <li>Global Open Learning Network</li>
              <li className="pt-2 text-emerald-400 font-semibold">100% Free Open Education</li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-mono" style={{ color: "var(--text-muted)" }}>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span>© {new Date().getFullYear()} OLVYN. All Rights Reserved.</span>
            <span>·</span>
            <Link href="/explore" className="hover:text-[#F5F7FF] transition-colors">Privacy</Link>
            <span>·</span>
            <Link href="/explore" className="hover:text-[#F5F7FF] transition-colors">Terms of Use</Link>
          </div>
          <span className="font-bold text-xs text-blue-400">
            OPEN ACCESS REPOSITORY
          </span>
        </div>
      </div>
    </footer>
  );
}
