"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle, Database, Loader2, Menu, X } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://127.0.0.1:8000";

interface DatabaseConnectResponse {
  success: boolean;
  path?: string;
  error?: string;
}

const navLinks = [
  { name: "Dashboard", href: "#dashboard" },
  { name: "Features", href: "#features" },
  { name: "Integrations", href: "#integrations" },
  { name: "Security", href: "#security" },
  { name: "Pricing", href: "#pricing" },
];

export function Navigation() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isConnectOpen, setIsConnectOpen] = useState(false);
  const [databasePath, setDatabasePath] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectMessage, setConnectMessage] = useState<string | null>(null);
  const [connectError, setConnectError] = useState<string | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const openConnectDialog = () => {
    setIsMobileMenuOpen(false);
    setIsConnectOpen(true);
    setConnectMessage(null);
    setConnectError(null);
  };

  const handleConnectDatabase = async () => {
    const path = databasePath.trim();
    if (!path) {
      setConnectError("Paste the full path to a SQLite .db file first.");
      setConnectMessage(null);
      return;
    }

    setIsConnecting(true);
    setConnectError(null);
    setConnectMessage(null);

    try {
      const res = await fetch(`${API_BASE}/database/connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path }),
      });
      const json: DatabaseConnectResponse = await res.json();

      if (!res.ok || !json.success) {
        setConnectError(json.error ?? "Could not connect to that database.");
        return;
      }

      setConnectMessage(`Connected to ${json.path ?? path}`);
    } catch {
      setConnectError(`Could not reach the backend at ${API_BASE}. Is FastAPI running?`);
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <header
      className={`fixed z-50 transition-all duration-500 ${
        isScrolled ? "top-4 left-4 right-4" : "top-0 left-0 right-0"
      }`}
    >
      <nav
        className={`mx-auto transition-all duration-500 ${
          isScrolled || isMobileMenuOpen
            ? "bg-background/80 backdrop-blur-xl border border-foreground/10 rounded-2xl shadow-lg max-w-[1200px]"
            : "bg-transparent max-w-[1400px]"
        }`}
      >
        <div
          className={`flex items-center justify-between transition-all duration-500 px-6 lg:px-8 ${
            isScrolled ? "h-14" : "h-20"
          }`}
        >
          <a href="#" className="flex items-center gap-2 group">
            <span
              className={`font-display tracking-tight transition-all duration-500 ${
                isScrolled ? "text-xl text-foreground" : "text-2xl text-white"
              }`}
            >
              Data Sage
            </span>
            <span
              className={`font-mono transition-all duration-500 ${
                isScrolled
                  ? "text-[10px] mt-0.5 text-muted-foreground"
                  : "text-xs mt-1 text-white/60"
              }`}
            >
              AI
            </span>
          </a>

          <div className="hidden md:flex items-center gap-12">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className={`text-sm transition-colors duration-300 relative group ${
                  isScrolled
                    ? "text-foreground/70 hover:text-foreground"
                    : "text-white/70 hover:text-white"
                }`}
              >
                {link.name}
                <span
                  className={`absolute -bottom-1 left-0 w-0 h-px transition-all duration-300 group-hover:w-full ${
                    isScrolled ? "bg-foreground" : "bg-white"
                  }`}
                />
              </a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-4">
            <a
              href="#"
              className={`transition-all duration-500 ${
                isScrolled
                  ? "text-xs text-foreground/70 hover:text-foreground"
                  : "text-sm text-white/70 hover:text-white"
              }`}
            >
              Sign in
            </a>

            <Button
              size="sm"
              onClick={openConnectDialog}
              className={`rounded-full border-0 text-white transition-all duration-500 bg-[linear-gradient(90deg,#ef4444_0%,#ec4899_30%,#06b6d4_65%,#8b5cf6_100%)] bg-[length:250%_250%] animate-[gradientShift_3s_linear_infinite] ${
                isScrolled
                  ? "px-4 h-8 text-xs shadow-[0_0_24px_rgba(236,72,153,0.35)]"
                  : "px-6 shadow-[0_0_32px_rgba(236,72,153,0.35)]"
              }`}
            >
              Connect your database
            </Button>
          </div>

          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className={`md:hidden p-2 transition-colors duration-500 ${
              isScrolled || isMobileMenuOpen ? "text-foreground" : "text-white"
            }`}
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>
      </nav>

      <div
        className={`md:hidden fixed inset-0 bg-background z-40 transition-all duration-500 ${
          isMobileMenuOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        style={{ top: 0 }}
      >
        <div className="flex flex-col h-full px-8 pt-28 pb-8">
          <div className="flex-1 flex flex-col justify-center gap-8">
            {navLinks.map((link, i) => (
              <a
                key={link.name}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`text-5xl font-display text-foreground hover:text-muted-foreground transition-all duration-500 ${
                  isMobileMenuOpen
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-4"
                }`}
                style={{ transitionDelay: isMobileMenuOpen ? `${i * 75}ms` : "0ms" }}
              >
                {link.name}
              </a>
            ))}
          </div>

          <div
            className={`flex gap-4 pt-8 border-t border-foreground/10 transition-all duration-500 ${
              isMobileMenuOpen
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-4"
            }`}
            style={{ transitionDelay: isMobileMenuOpen ? "300ms" : "0ms" }}
          >
            <Button
              variant="outline"
              className="flex-1 rounded-full h-14 text-base"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Sign in
            </Button>

            <Button
              className="flex-1 rounded-full h-14 text-base text-white border-0 bg-[linear-gradient(90deg,#ef4444_0%,#ec4899_30%,#06b6d4_65%,#8b5cf6_100%)] bg-[length:250%_250%] animate-[gradientShift_3s_linear_infinite] shadow-[0_0_28px_rgba(236,72,153,0.35)]"
              onClick={openConnectDialog}
            >
              Connect your database
            </Button>
          </div>
        </div>
      </div>

      {isConnectOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center px-5">
          <button
            type="button"
            aria-label="Close connect database dialog"
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
            onClick={() => setIsConnectOpen(false)}
          />

          <div className="relative w-full max-w-xl rounded-3xl p-[1px] bg-[linear-gradient(135deg,rgba(239,68,68,0.55),rgba(236,72,153,0.55),rgba(6,182,212,0.55),rgba(139,92,246,0.55))] shadow-[0_0_70px_rgba(236,72,153,0.22)]">
            <div className="rounded-[23px] bg-background/95 backdrop-blur-xl border border-white/10 p-7">
              <div className="flex items-start justify-between gap-5">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-[linear-gradient(90deg,#ef4444,#ec4899,#06b6d4,#8b5cf6)] bg-[length:250%_250%] animate-[gradientShift_3s_linear_infinite] flex items-center justify-center shadow-[0_0_30px_rgba(236,72,153,0.35)]">
                    <Database className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-display font-bold tracking-tight">Connect SQLite Database</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Paste the full local path to a `.db` file on the backend machine.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsConnectOpen(false)}
                  className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-foreground/10 transition-colors"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-7 space-y-4">
                <input
                  value={databasePath}
                  onChange={(e) => setDatabasePath(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleConnectDatabase();
                  }}
                  placeholder="C:\Users\ibrah\Desktop\my_company_data.db"
                  className="w-full rounded-2xl border border-foreground/10 bg-foreground/[0.03] px-5 py-4 text-sm font-mono outline-none transition-all placeholder:text-muted-foreground/40 focus:border-pink-500/50 focus:bg-pink-500/5 focus:shadow-[0_0_28px_rgba(236,72,153,0.16)]"
                />

                <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/5 px-5 py-4 text-sm text-cyan-100/80">
                  Example: <span className="font-mono text-cyan-300">C:\Users\ibrah\OneDrive\Desktop\data sage ai\data.db</span>
                </div>

                {connectError && (
                  <div className="flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-300">
                    <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                    <span>{connectError}</span>
                  </div>
                )}

                {connectMessage && (
                  <div className="flex items-start gap-3 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-5 py-4 text-sm text-emerald-300">
                    <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <span>{connectMessage}</span>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <Button
                    type="button"
                    onClick={handleConnectDatabase}
                    disabled={isConnecting}
                    className="flex-1 rounded-full h-12 text-white border-0 bg-[linear-gradient(90deg,#ef4444,#ec4899,#06b6d4,#8b5cf6)] bg-[length:250%_250%] animate-[gradientShift_3s_linear_infinite] shadow-[0_0_30px_rgba(236,72,153,0.3)] disabled:opacity-60"
                  >
                    {isConnecting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      "Connect database"
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsConnectOpen(false)}
                    className="rounded-full h-12 border-foreground/15 bg-foreground/[0.02]"
                  >
                    Close
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
