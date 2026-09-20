import Link from "next/link";
import Image from "next/image";
import { Globe } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-[#121417] text-slate-400 mt-auto border-t border-white/5">
      <div className="max-w-7xl mx-auto px-6 lg:px-12 pt-16 pb-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-10 pb-12 border-b border-white/10">
          {/* Brand Col */}
          <div className="space-y-4">
          <Link href="/" className="flex items-center gap-2.5 mb-1 group">
            <div className="w-9 h-9 rounded-xl bg-[#050812] flex-shrink-0 overflow-hidden ring-1 ring-white/10 group-hover:ring-white/20 transition-all duration-200">
              <Image
                src="/logo.jpg"
                alt="OpenLearnerAI"
                width={36}
                height={36}
                className="w-full h-full object-cover"
              />
            </div>
            <span className="font-black text-xl text-white tracking-tight">
              OpenLearner<span className="text-[#d2f835] ml-0.5">.ai</span>
            </span>
          </Link>
            <p className="text-xs text-slate-400 leading-relaxed max-w-xs">
              Learn everything you want and need. Free open courses with transparent syllabi, progress tracking, and Nova AI tutor.
            </p>
          </div>

          {/* Column 1: Links */}
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-[#d2f835] mb-4">Navigation</h4>
            <ul className="space-y-2.5 text-xs text-slate-300 font-semibold">
              <li><Link href="/" prefetch={true} className="hover:text-[#d2f835] transition-colors">Home</Link></li>
              <li><Link href="/explore" prefetch={true} className="hover:text-[#d2f835] transition-colors">Course Catalog</Link></li>
              <li><Link href="/#categories" className="hover:text-[#d2f835] transition-colors">Categories</Link></li>
              <li><Link href="/nova" prefetch={true} className="hover:text-[#d2f835] transition-colors">Nova AI Assistant</Link></li>
            </ul>
          </div>

          {/* Column 2: Studio */}
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-[#d2f835] mb-4">Studio & Authors</h4>
            <ul className="space-y-2.5 text-xs text-slate-300 font-semibold">
              <li><Link href="/contributor" prefetch={true} className="hover:text-[#d2f835] transition-colors">Creator Studio</Link></li>
              <li><Link href="/contributor/courses/new" className="hover:text-[#d2f835] transition-colors">Create Course Draft</Link></li>
              <li><Link href="/admin" prefetch={true} className="hover:text-[#d2f835] transition-colors">Editorial Review</Link></li>
              <li><Link href="/register" className="hover:text-[#d2f835] transition-colors">Join Community</Link></li>
            </ul>
          </div>

          {/* Column 3: Contact info */}
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-[#d2f835] mb-4">Platform</h4>
            <ul className="space-y-2 text-xs text-slate-300">
              <li className="font-semibold text-white">support@openlearner.ai</li>
              <li>Global Open Learning Network</li>
              <li className="pt-2 text-slate-400">100% Free Open Education Initiative</li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span>© {new Date().getFullYear()} OpenLearner AI. All Rights Reserved.</span>
            <span>·</span>
            <Link href="/explore" className="hover:text-white transition-colors">Privacy</Link>
            <span>·</span>
            <Link href="/explore" className="hover:text-white transition-colors">Terms of Use</Link>
          </div>

          <div className="flex items-center gap-4 text-slate-400 font-semibold">
            <span className="flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5" />
              <span>EN (US)</span>
            </span>
            <span>·</span>
            <span className="text-[#d2f835] font-black">100% Free Access</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
