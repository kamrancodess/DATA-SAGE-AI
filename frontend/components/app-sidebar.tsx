"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  LayoutDashboard,
  Upload,
  MessageSquare,
  FileQuestion,
  FileText,
  Brain,
  TrendingDown,
  Calendar,
  Lightbulb,
  Network,
  BarChart3,
  Layers,
  Trophy,
  Settings,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "upload", label: "Upload Notes", icon: Upload },
  { id: "tutor", label: "AI Tutor", icon: MessageSquare },
  { id: "pdf-qa", label: "PDF Q&A", icon: FileQuestion },
  { id: "summarizer", label: "Summarizer", icon: FileText },
  { id: "quiz", label: "Quiz Generator", icon: Brain },
  { id: "weak-topics", label: "Weak Topic Analysis", icon: TrendingDown },
  { id: "planner", label: "Study Planner", icon: Calendar },
  { id: "recommendations", label: "Recommendations", icon: Lightbulb },
  { id: "clustering", label: "Topic Clustering", icon: Network },
  { id: "analytics", label: "Analytics Dashboard", icon: BarChart3 },
  { id: "flashcards", label: "Flashcards", icon: Layers },
  { id: "progress", label: "Progress Tracker", icon: Trophy },
  { id: "settings", label: "Settings", icon: Settings },
]

interface AppSidebarProps {
  activeSection: string
  onSectionChange: (section: string) => void
  onLogoClick?: () => void
}

export function AppSidebar({ activeSection, onSectionChange, onLogoClick }: AppSidebarProps) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <motion.aside
      initial={{ width: 280 }}
      animate={{ width: collapsed ? 80 : 280 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="fixed left-0 top-0 h-screen z-50 flex flex-col glass-strong"
    >
      {/* Logo */}
      <div className="flex items-center gap-3 p-4 border-b border-border/30">
        <motion.button
          onClick={onLogoClick}
          className="relative flex items-center justify-center w-10 h-10 rounded-xl overflow-hidden cursor-pointer"
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
          style={{
            background: "linear-gradient(135deg, hsl(193, 85%, 66%), hsl(196, 100%, 83%), hsl(195, 100%, 50%))",
          }}
        >
          {/* Animated shimmer effect */}
          <motion.div
            className="absolute inset-0"
            style={{
              background: "linear-gradient(45deg, transparent, rgba(255,255,255,0.4), transparent)",
            }}
            animate={{
              x: ["-100%", "100%"],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "linear",
              repeatDelay: 1.5,
            }}
          />
          {/* Pulsing glow */}
          <motion.div
            className="absolute inset-0 rounded-xl"
            style={{
              background: "linear-gradient(135deg, hsl(193, 85%, 66%), hsl(196, 100%, 83%))",
              filter: "blur(8px)",
            }}
            animate={{
              opacity: [0.4, 0.7, 0.4],
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          <Sparkles className="w-5 h-5 text-white relative z-10" />
        </motion.button>
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="flex flex-col"
            >
              <span className="font-semibold text-foreground">AI Study</span>
              <span className="text-xs text-muted-foreground">Companion</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 no-scrollbar">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = activeSection === item.id
            
            return (
              <li key={item.id}>
                <motion.button
                  onClick={() => onSectionChange(item.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200",
                    "hover:bg-sidebar-accent/50 group relative",
                    isActive && "bg-gradient-to-r from-neon-cyan/20 to-neon-blue/20 border border-neon-cyan/30"
                  )}
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div
                    className={cn(
                      "flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200",
                      isActive 
                        ? "bg-gradient-to-br from-neon-cyan to-neon-blue text-white shadow-lg shadow-neon-cyan/30" 
                        : "bg-muted/50 text-muted-foreground group-hover:text-foreground group-hover:bg-muted"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <AnimatePresence>
                    {!collapsed && (
                      <motion.span
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        className={cn(
                          "text-sm font-medium transition-colors",
                          isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
                        )}
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                  
                  {/* Active indicator glow */}
                  {isActive && (
                    <motion.div
                      layoutId="activeIndicator"
                      className="absolute inset-0 rounded-xl bg-gradient-to-r from-neon-cyan/10 to-neon-blue/10 -z-10"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                </motion.button>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Collapse Toggle */}
      <div className="p-4 border-t border-border/30">
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              className="mb-3 rounded-xl border border-neon-cyan/20 bg-neon-cyan/5 px-3 py-2"
            >
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Built by</p>
              <p className="text-sm font-semibold text-neon-cyan">Kamran</p>
            </motion.div>
          )}
        </AnimatePresence>
        <motion.button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Collapse</span>
            </>
          )}
        </motion.button>
      </div>
    </motion.aside>
  )
}
