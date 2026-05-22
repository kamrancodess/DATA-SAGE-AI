"use client"

import { motion } from "framer-motion"
import { Sparkles, ArrowRight, Brain, Zap, Target } from "lucide-react"
import { Button } from "@/components/ui/button"

interface LandingHeroProps {
  onEnterDashboard: () => void
}

export function LandingHero({ onEnterDashboard }: LandingHeroProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
      {/* Animated Logo */}
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.2 }}
        className="relative mb-8"
      >
        {/* Outer glow ring */}
        <motion.div
          className="absolute inset-0 rounded-3xl blur-xl"
          style={{
            background: "linear-gradient(135deg, hsl(193, 85%, 66%), hsl(196, 100%, 83%), hsl(195, 100%, 50%))",
          }}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 0.8, 0.5],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        
        {/* Logo container with animated gradient */}
        <motion.div
          className="relative flex items-center justify-center w-24 h-24 rounded-3xl overflow-hidden"
          whileHover={{ scale: 1.05 }}
          style={{
            background: "linear-gradient(135deg, hsl(193, 85%, 66%), hsl(196, 100%, 83%), hsl(195, 100%, 50%))",
          }}
        >
          {/* Animated gradient overlay */}
          <motion.div
            className="absolute inset-0"
            style={{
              background: "linear-gradient(45deg, transparent, rgba(255,255,255,0.3), transparent)",
            }}
            animate={{
              x: ["-100%", "100%"],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "linear",
              repeatDelay: 1,
            }}
          />
          <Sparkles className="w-12 h-12 text-white relative z-10" />
        </motion.div>
      </motion.div>

      {/* Title */}
      <motion.h1
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.8 }}
        className="text-6xl md:text-8xl font-bold text-center mb-4 tracking-tight"
        style={{
          background: "linear-gradient(135deg, #ffffff 0%, hsl(193, 85%, 76%) 50%, hsl(196, 100%, 83%) 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
        }}
      >
        AI Study
      </motion.h1>

      <motion.h2
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.8 }}
        className="text-3xl md:text-5xl font-light text-center mb-8 text-white/80"
      >
        Companion
      </motion.h2>

      {/* Description */}
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.8 }}
        className="text-lg md:text-xl text-center text-white/70 max-w-2xl mb-12 leading-relaxed"
      >
        Your intelligent learning partner powered by AI. Upload your notes, get personalized tutoring, 
        generate quizzes, and track your progress with advanced analytics.
      </motion.p>

      {/* Feature highlights */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7, duration: 0.8 }}
        className="flex flex-wrap justify-center gap-6 mb-12"
      >
        {[
          { icon: Brain, label: "AI-Powered Learning" },
          { icon: Zap, label: "Instant Summaries" },
          { icon: Target, label: "Personalized Quizzes" },
        ].map((feature, index) => (
          <motion.div
            key={feature.label}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.8 + index * 0.1 }}
            className="flex items-center gap-2 px-4 py-2 rounded-full glass border border-neon-cyan/30"
          >
            <feature.icon className="w-4 h-4 text-neon-cyan" />
            <span className="text-sm text-white/80">{feature.label}</span>
          </motion.div>
        ))}
      </motion.div>

      {/* CTA Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9, duration: 0.8 }}
      >
        <Button
          onClick={onEnterDashboard}
          size="lg"
          className="relative group px-8 py-6 text-lg font-semibold rounded-2xl overflow-hidden border-0"
          style={{
            background: "linear-gradient(135deg, hsl(193, 85%, 56%), hsl(196, 100%, 63%), hsl(195, 100%, 50%))",
          }}
        >
          <motion.div
            className="absolute inset-0"
            style={{
              background: "linear-gradient(45deg, transparent, rgba(255,255,255,0.2), transparent)",
            }}
            animate={{
              x: ["-100%", "100%"],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "linear",
              repeatDelay: 2,
            }}
          />
          <span className="relative z-10 flex items-center gap-2 text-white">
            Enter Dashboard
            <motion.span
              animate={{ x: [0, 5, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <ArrowRight className="w-5 h-5" />
            </motion.span>
          </span>
        </Button>
      </motion.div>

      {/* Floating particles effect */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 rounded-full"
            style={{
              background: "linear-gradient(135deg, hsl(193, 85%, 66%), hsl(196, 100%, 83%))",
              left: `${15 + i * 15}%`,
              top: `${20 + (i % 3) * 25}%`,
            }}
            animate={{
              y: [0, -30, 0],
              opacity: [0.3, 0.7, 0.3],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 3 + i * 0.5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.3,
            }}
          />
        ))}
      </div>
    </div>
  )
}
