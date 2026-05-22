"use client";

import { ArrowUpRight, Shield, Lock, CheckCircle, Mail, MessageSquare } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const footerLinks = {
  Product: [
    { name: "Dashboard", href: "#dashboard" },
    { name: "Features", href: "#features" },
    { name: "Pricing", href: "#pricing" },
    { name: "Integrations", href: "#integrations" },
  ],
  Developers: [
    { name: "Documentation", href: "#developers" },
    { name: "Data Sage SDK", href: "#" },
    { name: "API Reference", href: "#developers" },
    { name: "Status", href: "#" },
  ],
  Company: [
    { name: "About", href: "#" },
    { name: "Blog", href: "#" },
    { name: "Careers", href: "#", badge: "Hiring" },
    { name: "Contact Sales", href: "#", action: "contact" },
  ],
  Legal: [
    { name: "Privacy Policy", href: "#" },
    { name: "Terms of Service", href: "#" },
    { name: "Security", href: "#security" },
  ],
};

const socialLinks = [
  { name: "Twitter", href: "#" },
  { name: "GitHub", href: "#" },
  { name: "LinkedIn", href: "#" },
];

function AnimatedWaveCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let time = 0;

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resize();
    window.addEventListener("resize", resize);

    const animate = () => {
      const width = canvas.offsetWidth;
      const height = canvas.offsetHeight;
      ctx.clearRect(0, 0, width, height);

      ctx.strokeStyle = "rgba(100, 200, 150, 0.3)";
      ctx.lineWidth = 1;

      for (let wave = 0; wave < 3; wave++) {
        ctx.beginPath();
        for (let x = 0; x <= width; x += 5) {
          const y =
            height * 0.5 +
            Math.sin(x * 0.01 + time + wave * 0.5) * 30 +
            Math.sin(x * 0.02 + time * 1.5 + wave) * 20;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      time += 0.02;
      animationId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return <canvas ref={canvasRef} className="w-full h-full" />;
}

export function FooterSection() {
  const [showContactModal, setShowContactModal] = useState(false);
  
  return (
    <footer className="relative bg-black">
      {/* Contact Sales Modal */}
      {showContactModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowContactModal(false)} />
          <div className="relative glass-strong rounded-2xl p-8 max-w-md w-full glow-purple animate-in fade-in zoom-in-95 duration-300">
            <button 
              onClick={() => setShowContactModal(false)}
              className="absolute top-4 right-4 text-white/60 hover:text-white"
            >
              <ArrowUpRight className="w-5 h-5 rotate-45" />
            </button>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-display text-white">Contact Sales</h3>
                <p className="text-sm text-white/60">Get in touch with our team</p>
              </div>
            </div>
            <form className="space-y-4">
              <input 
                type="email" 
                placeholder="Work email" 
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-pink-500/50"
              />
              <input 
                type="text" 
                placeholder="Company name" 
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-pink-500/50"
              />
              <textarea 
                placeholder="How can we help?" 
                rows={3}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-pink-500/50 resize-none"
              />
              <button 
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white font-medium rounded-xl hover:opacity-90 transition-opacity"
              >
                Send Message
              </button>
            </form>
          </div>
        </div>
      )}
      {/* Panoramic banner image */}
      <div className="relative w-full h-[340px] md:h-[420px] overflow-hidden">
        <img
          src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Upscaled%20Image%20%2810%29-UnDKstODkIENp5xqTYUEpt0Sm8tNOw.png"
          alt="Bioluminescent landscape"
          className="w-full h-full object-cover object-center"
        />
        {/* Gradient fade to black at bottom */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black" />
        {/* Subtle dark vignette on sides */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-black/40" />
      </div>

      {/* Footer content — black background, white text */}
      <div className="relative z-10 max-w-[1400px] mx-auto px-6 lg:px-12">
        {/* Main Footer */}
        <div className="py-16 lg:py-20">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-12 lg:gap-8">
            {/* Brand Column */}
            <div className="col-span-2">
              <a href="#" className="inline-flex items-center gap-2 mb-6">
                <span className="text-2xl font-display text-white">Data Sage</span>
                <span className="text-xs text-white/40 font-mono">AI</span>
              </a>

              <p className="text-white/50 leading-relaxed mb-8 max-w-xs text-sm">
                Autonomous Data Orchestration Layer. Transform raw data into intelligent decisions.
              </p>

              {/* Social Links */}
              <div className="flex gap-6">
                {socialLinks.map((link) => (
                  <a
                    key={link.name}
                    href={link.href}
                    className="text-sm text-white/40 hover:text-white transition-colors flex items-center gap-1 group"
                  >
                    {link.name}
                    <ArrowUpRight className="w-3 h-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                  </a>
                ))}
              </div>
            </div>

            {/* Link Columns */}
            {Object.entries(footerLinks).map(([title, links]) => (
              <div key={title}>
                <h3 className="text-sm font-medium text-white mb-6">{title}</h3>
                <ul className="space-y-4">
                  {links.map((link) => (
                    <li key={link.name}>
                      {"action" in link && link.action === "contact" ? (
                        <button
                          onClick={() => setShowContactModal(true)}
                          className="text-sm text-white/40 hover:text-white transition-colors inline-flex items-center gap-2"
                        >
                          {link.name}
                        </button>
                      ) : (
                        <a
                          href={link.href}
                          className="text-sm text-white/40 hover:text-white transition-colors inline-flex items-center gap-2"
                        >
                          {link.name}
                          {"badge" in link && link.badge && (
                            <span className="text-xs px-2 py-0.5 bg-white text-black rounded-full">
                              {link.badge}
                            </span>
                          )}
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Pricing Teaser */}
        <div className="py-8 border-t border-white/10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <span className="text-white/60">Pricing:</span>
              <span className="px-3 py-1 rounded-full bg-white/5 text-white/80 text-xs">Starter $49/mo</span>
              <span className="px-3 py-1 rounded-full bg-gradient-to-r from-pink-500/20 to-purple-500/20 border border-pink-500/30 text-white text-xs">Pro $199/mo</span>
              <span className="px-3 py-1 rounded-full bg-white/5 text-white/80 text-xs">Enterprise Custom</span>
            </div>
            <a href="#pricing" className="text-sm text-pink-400 hover:text-pink-300 transition-colors flex items-center gap-1">
              See pricing
              <ArrowUpRight className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* Compliance Badges */}
        <div className="py-6 border-t border-white/10">
          <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-white/40">
            <span className="flex items-center gap-2">
              <CheckCircle className="w-3.5 h-3.5 text-green-400" />
              Production-ready
            </span>
            <span className="flex items-center gap-2">
              <Shield className="w-3.5 h-3.5 text-purple-400" />
              SOC2 Compliant
            </span>
            <span className="flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 text-pink-400" />
              GDPR Ready
            </span>
            <span className="flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 text-orange-400" />
              HIPAA Ready
            </span>
            <span className="text-white/60">Used by 500+ engineering teams</span>
          </div>
        </div>

        {/* 14-day trial banner */}
        <div className="py-4 border-t border-white/10 text-center">
          <span className="inline-flex items-center gap-3 text-sm">
            <span className="text-white/60">14-day free trial</span>
            <span className="text-white/30">|</span>
            <span className="text-white/60">Enterprise security</span>
            <span className="text-white/30">|</span>
            <span className="text-pink-400">No credit card required</span>
          </span>
        </div>

        {/* Bottom Bar */}
        <div className="py-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-white/30">
            &copy; 2026 Data Sage AI, Inc. All rights reserved.
          </p>

          <div className="flex items-center gap-4 text-sm text-white/30">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#ec4899]" />
              99.9% uptime - Enterprise security
            </span>
          </div>
        </div>

        {/* Contact Section */}
        <div className="py-10 border-t border-white/10">
          <div className="glass-strong rounded-2xl p-8 glow-pink">
            <div className="flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center shrink-0">
                  <Mail className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-display text-white mb-1">Get in Touch</h3>
                  <p className="text-white/60 text-sm">Have questions? Reach out directly.</p>
                </div>
              </div>
              
              <div className="glass rounded-xl px-6 py-4 flex flex-col sm:flex-row items-center gap-4">
                <div className="text-center sm:text-left">
                  <p className="text-white font-medium">Mohammed Kamran</p>
                  <a 
                    href="mailto:itskamran47@gmail.com" 
                    className="text-pink-400 hover:text-pink-300 transition-colors text-sm flex items-center gap-2 justify-center sm:justify-start"
                  >
                    <Mail className="w-4 h-4" />
                    itskamran47@gmail.com
                  </a>
                </div>
                <a 
                  href="mailto:itskamran47@gmail.com"
                  className="px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white font-medium rounded-xl hover:opacity-90 transition-opacity flex items-center gap-2"
                >
                  Send Email
                  <ArrowUpRight className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
