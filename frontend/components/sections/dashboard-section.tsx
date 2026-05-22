"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { AlertCircle, Brain, CheckCircle2, Clock, FileText, Flame, Loader2, Target, TrendingUp, Upload, Zap } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { API_BASE, DashboardData, getDashboard } from "@/lib/study-api"

export function DashboardSection() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setIsLoading(true)
    setError("")
    void getDashboard()
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : "API unavailable."))
      .finally(() => setIsLoading(false))
  }, [])

  const stats = [
    { label: "Documents", value: String(data?.metrics.documents ?? 0), change: "indexed", icon: FileText, color: "from-neon-cyan to-neon-blue" },
    { label: "Quiz Attempts", value: String(data?.metrics.attempts ?? 0), change: "saved", icon: Target, color: "from-neon-blue to-neon-teal" },
    { label: "Quiz Accuracy", value: `${Math.round((data?.metrics.accuracy ?? 0) * 100)}%`, change: "average", icon: Brain, color: "from-neon-teal to-neon-cyan" },
    { label: "Study Minutes", value: String(data?.metrics.study_minutes ?? 0), change: "tracked", icon: Clock, color: "from-neon-cyan to-neon-blue" },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Welcome back!</h1>
          <p className="text-muted-foreground mt-1">Here&apos;s your live local study overview.</p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-border/40 bg-background/35 px-3 py-2 text-sm backdrop-blur">
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-neon-cyan" />
          ) : error ? (
            <AlertCircle className="h-4 w-4 text-red-400" />
          ) : (
            <CheckCircle2 className="h-4 w-4 text-neon-cyan" />
          )}
          <span className={error ? "text-red-300" : "text-muted-foreground"}>
            {isLoading ? "Checking FastAPI backend..." : error ? `Backend offline: ${error}` : `Connected to FastAPI backend at ${API_BASE}`}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}>
            <Card className="glass border-border/30 hover:border-neon-cyan/40 transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-3xl font-bold text-foreground mt-1">{stat.value}</p>
                    <p className="text-sm text-neon-cyan mt-1">{stat.change}</p>
                  </div>
                  <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.color} opacity-80`}>
                    <stat.icon className="w-6 h-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="glass border-border/30 lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Zap className="w-5 h-5 text-neon-cyan" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: "Upload Notes", icon: Upload },
              { label: "Generate Quiz", icon: Brain },
              { label: "Ask PDF", icon: Zap },
              { label: "Review Plan", icon: Flame },
            ].map((action, index) => (
              <motion.div key={action.label} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + index * 0.1 }}>
                <Button variant="ghost" className="w-full justify-start gap-3 h-12 hover:bg-neon-cyan/10 hover:text-neon-cyan transition-all">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-neon-cyan/20 to-neon-blue/20">
                    <action.icon className="w-4 h-4" />
                  </div>
                  {action.label}
                </Button>
              </motion.div>
            ))}
          </CardContent>
        </Card>

        <Card className="glass border-border/30 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-neon-cyan" />
              Revision Priorities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(data?.weak_topics ?? []).map((topic, index) => (
                <motion.div key={topic.topic} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + index * 0.1 }} className="flex items-center gap-4 p-3 rounded-xl hover:bg-muted/30 transition-colors">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-neon-cyan/20 to-neon-blue/20">
                    <Brain className="w-4 h-4 text-neon-cyan" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{topic.topic}</p>
                    <p className="text-xs text-muted-foreground">{topic.reason} - {Math.round(topic.accuracy * 100)}% accuracy</p>
                  </div>
                </motion.div>
              ))}
              {!data?.weak_topics?.length && <p className="text-sm text-muted-foreground">Take a quiz to generate weak-topic recommendations.</p>}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="glass border-border/30">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="w-5 h-5 text-neon-cyan" />
            Topic Accuracy
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {(data?.topic_accuracy ?? []).map((topic) => (
              <div key={topic.topic}>
                <div className="mb-2 flex justify-between text-sm">
                  <span className="text-foreground">{topic.topic}</span>
                  <span className="text-neon-cyan">{Math.round(topic.accuracy * 100)}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted/30">
                  <div className="h-full rounded-full bg-gradient-to-r from-neon-cyan to-neon-blue" style={{ width: `${Math.round(topic.accuracy * 100)}%` }} />
                </div>
              </div>
            ))}
            {!data?.topic_accuracy?.length && <p className="text-sm text-muted-foreground">No quiz analytics yet.</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
