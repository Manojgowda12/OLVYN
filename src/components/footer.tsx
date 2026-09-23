import Link from "next/link";
import Image from "next/image";

export function Footer() {
  return (
    <footer
      className="mt-auto"
      style={{
        background: "var(--bg-surface)",
        borderTop: "1px solid rgba(37, 99, 235, 0.2)",
      }}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-12 pt-16 pb-10">
        <div
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-10 pb-12"
          style={{ borderBottom: "1px solid rgba(37, 99, 235, 0.15)" }}
        >
          {/* Brand */}
          <div className="space-y-4">
            <Link href="/" className="flex items-center gap-2.5 mb-1 group">
              <div
                className="w-9 h-9 rounded-xl flex-shrink-0 overflow-hidden transition-all duration-200"
                style={{ boxShadow: "0 0 0 1px rgba(37, 99, 235, 0.35), 0 4px 12px rgba(37, 99, 235, 0.2)" }}
              >
                <Image
                  src="/logo.jpg"
                  alt="OLVYN"
                  width={36}
                  height={36}
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="font-extrabold text-xl tracking-tight" style={{ color: "var(--text-primary)" }}>
                OLVYN
              </span>
            </Link>
            <p className="text-xs leading-relaxed max-w-xs" style={{ color: "var(--text-muted)" }}>
              Free open courses with transparent syllabi, progress tracking, and Nova AI guidance.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h4
              className="text-xs font-black uppercase tracking-wider mb-4"
              style={{ color: "var(--cyan)" }}
            >
              Navigation
            </h4>
            <ul className="space-y-2.5 text-xs font-semibold" style={{ color: "#A8B4CC" }}>
              <li><Link href="/" className="hover:text-[#EAF2FF] transition-colors">Home</Link></li>
              <li><Link href="/explore" className="hover:text-[#EAF2FF] transition-colors">Course Catalog</Link></li>
              <li><Link href="/#categories" className="hover:text-[#EAF2FF] transition-colors">Categories</Link></li>
              <li><Link href="/nova" className="hover:text-[#EAF2FF] transition-colors">Nova AI</Link></li>
            </ul>
          </div>

          {/* Studio */}
          <div>
            <h4
              className="text-xs font-black uppercase tracking-wider mb-4"
              style={{ color: "var(--cyan)" }}
            >
              Studio &amp; Authors
            </h4>
            <ul className="space-y-2.5 text-xs font-semibold" style={{ color: "#A8B4CC" }}>
              <li><Link href="/contributor" className="hover:text-[#EAF2FF] transition-colors">Creator Studio</Link></li>
              <li><Link href="/contributor/courses/new" className="hover:text-[#EAF2FF] transition-colors">Create Course</Link></li>
              <li><Link href="/admin" className="hover:text-[#EAF2FF] transition-colors">Editorial Review</Link></li>
              <li><Link href="/register" className="hover:text-[#EAF2FF] transition-colors">Join Community</Link></li>
            </ul>
          </div>

          {/* Platform */}
          <div>
            <h4
              className="text-xs font-black uppercase tracking-wider mb-4"
              style={{ color: "var(--cyan)" }}
            >
              Platform
            </h4>
            <ul className="space-y-2 text-xs" style={{ color: "#A8B4CC" }}>
              <li className="font-semibold" style={{ color: "#F5F7FF" }}>support@openlearner.ai</li>
              <li>Global Open Learning Network</li>
              <li className="pt-2" style={{ color: "var(--text-muted)" }}>100% Free Open Education</li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs" style={{ color: "var(--text-muted)" }}>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span>© {new Date().getFullYear()} OLVYN. All Rights Reserved.</span>
            <span>·</span>
            <Link href="/explore" className="hover:text-[#EAF2FF] transition-colors">Privacy</Link>
            <span>·</span>
            <Link href="/explore" className="hover:text-[#EAF2FF] transition-colors">Terms of Use</Link>
          </div>
          <span className="font-black text-xs" style={{ color: "var(--blue-bright)" }}>
            100% Free Access
          </span>
        </div>
      </div>
    </footer>
  );
}
