import Link from "next/link";
import Image from "next/image";
import { getSession } from "@/lib/auth";
import { LogOut } from "lucide-react";
import { NavLinks } from "./nav-links";

export async function Navbar() {
  const session = await getSession();

  return (
    <>
      {/* Scrolled-nav style enhancement via IntersectionObserver in ScrollNav */}
      <style>{`
        header.nav-scrolled {
          background: rgba(5, 8, 22, 0.96) !important;
          border-bottom-color: rgba(37, 99, 235, 0.3) !important;
          box-shadow: 0 4px 30px rgba(0, 0, 0, 0.5) !important;
        }
      `}</style>

      <header
        className="sticky top-0 z-50 w-full transition-all duration-300"
        style={{
          background: "rgba(5, 8, 22, 0.82)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(37, 99, 235, 0.2)",
          boxShadow: "0 1px 0 rgba(37, 99, 235, 0.1)",
        }}
      >
        <div className="max-w-7xl mx-auto h-[72px] px-6 lg:px-12 flex items-center justify-between">
          {/* Brand Logo + Wordmark */}
          <Link href="/" prefetch={true} className="flex items-center gap-3 group">
            <div
              className="w-9 h-9 rounded-xl flex-shrink-0 overflow-hidden transition-all duration-200"
              style={{
                boxShadow: "0 0 0 1px rgba(37,99,235,0.35), 0 4px 14px rgba(37,99,235,0.25)",
              }}
            >
              <Image
                src="/logo.jpg"
                alt="OLVYN"
                width={36}
                height={36}
                className="w-full h-full object-cover"
                priority
              />
            </div>
            <span
              className="font-extrabold text-[20px] tracking-tight"
              style={{ color: "#F5F7FF" }}
            >
              OLVYN
            </span>
          </Link>

          {/* Center & Mobile Navigation */}
          <NavLinks session={session} />

          {/* Right Action Area */}
          <div className="hidden sm:flex items-center gap-3">
            {session ? (
              <div
                className="flex items-center gap-2.5 pl-2.5 pr-2 py-1.5 rounded-full"
                style={{
                  background: "rgba(13, 22, 41, 0.85)",
                  border: "1px solid rgba(59, 130, 246, 0.35)",
                  backdropFilter: "blur(12px)",
                }}
              >
                <Link
                  href={
                    session.role === "ADMIN"
                      ? "/admin"
                      : session.role === "CONTRIBUTOR"
                      ? "/contributor"
                      : "/dashboard"
                  }
                  prefetch={true}
                  className="flex items-center gap-2 group"
                >
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black uppercase text-white"
                    style={{
                      background: "linear-gradient(135deg, #1d4ed8, #0891b2)",
                      boxShadow: "0 0 10px rgba(37,99,235,0.5)",
                    }}
                  >
                    {session.name.charAt(0)}
                  </div>
                  <span
                    className="text-xs font-bold max-w-[90px] truncate hidden sm:inline-block"
                    style={{ color: "#F5F7FF" }}
                  >
                    {session.name.split(" ")[0]}
                  </span>
                </Link>
                <form action="/api/auth/logout" method="POST" className="inline" suppressHydrationWarning>
                  <button
                    type="submit"
                    title="Sign Out"
                    className="p-1 rounded-full transition-colors hover:text-white"
                    style={{ color: "#7F8CA8" }}
                    suppressHydrationWarning
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  href="/login"
                  className="text-xs font-semibold px-4 py-2 rounded-full transition-all duration-200"
                  style={{
                    background: "rgba(13, 22, 41, 0.75)",
                    border: "1px solid rgba(59, 130, 246, 0.45)",
                    color: "#F5F7FF",
                    backdropFilter: "blur(10px)",
                  }}
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="text-xs font-bold px-5 py-2 rounded-full text-white transition-all duration-200"
                  style={{
                    background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                    boxShadow: "0 0 16px rgba(37,99,235,0.45), 0 2px 6px rgba(0,0,0,0.3)",
                  }}
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>
    </>
  );
}
