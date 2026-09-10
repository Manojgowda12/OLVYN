import Link from "next/link";
import { BookOpen, Github, Heart } from "lucide-react";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-slate-800/80 bg-slate-950/60 text-slate-400 text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-3 md:col-span-2">
            <div className="flex items-center gap-2 font-bold text-lg text-white">
              <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                <BookOpen className="w-4 h-4" />
              </div>
              <span>OpenLearner AI</span>
            </div>
            <p className="text-slate-400 text-sm max-w-sm">
              An open, transparent learning platform empowering anyone to discover, learn, and contribute legally shareable educational courses with AI-powered tutoring.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-200 mb-3">Platform</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/explore" className="hover:text-white transition-colors">Explore Catalog</Link></li>
              <li><Link href="/#nova" className="hover:text-white transition-colors">Nova AI Assistant</Link></li>
              <li><Link href="/register" className="hover:text-white transition-colors">Join Community</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-200 mb-3">Roles & Guidelines</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/login" className="hover:text-white transition-colors">Learner Portal</Link></li>
              <li><Link href="/login" className="hover:text-white transition-colors">Course Creator Studio</Link></li>
              <li><Link href="/login" className="hover:text-white transition-colors">Editorial Standards</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-slate-800/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <p>© {new Date().getFullYear()} OpenLearner AI Platform. Open educational resources.</p>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">Built with rigor and modular architecture</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
