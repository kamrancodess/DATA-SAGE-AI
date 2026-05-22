"use client"

import { useEffect, useMemo, useState } from "react"
import { motion } from "framer-motion"
import { BarChart3, Calendar, Clock, Target, TrendingUp } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DashboardData, getDashboard } from "@/lib/study-api"

export function AnalyticsSection() {
  const [data, setData] = useState<DashboardData | null>(null)

  useEffect(() => {
    void getDashboard().then(setData)
  }, [])

  const stats = [
    { label: "Study Minutes", value: String(data?.metrics.study_minutes ?? 0), icon: Clock },
    { label: "Quizzes Completed", value: String(data?.metrics.attempts ?? 0), icon: Target },
    { label: "Average Score", value: `${Math.round((data?.metrics.accuracy ?? 0) * 100)}%`, icon: TrendingUp },
    { label: "Documents", value: String(data?.metrics.documents ?? 0), icon: Calendar },
  ]

  const heatmap = useMemo(() => Array.from({ length: 84 }, (_, index) => ((index * 37) % 100) / 100), [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Analytics Dashboard</h1>
        <p className="text-muted-foreground mt-1">Track learning progress and performance from SQLite history.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}>
            <Card className="glass border-border/30">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-blue/20">
                    <stat.icon className="w-6 h-6 text-neon-cyan" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Card className="glass border-border/30">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-neon-cyan" />
            Topic Performance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {(data?.topic_accuracy ?? []).map((topic, index) => {
            const score = Math.round(topic.accuracy * 100)
            return (
              <motion.div key={topic.topic} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + index * 0.1 }} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-foreground">{topic.topic}</span>
                  <span className="text-neon-cyan">{score}%</span>
                </div>
                <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${score}%` }} transition={{ delay: 0.5 + index * 0.1, duration: 0.5 }} className="h-full bg-gradient-to-r from-neon-cyan to-neon-blue rounded-full" />
                </div>
              </motion.div>
            )
          })}
          {!data?.topic_accuracy?.length && <p className="text-sm text-muted-foreground">Submit quizzes to see topic performance.</p>}
        </CardContent>
      </Card>

      <Card className="glass border-border/30">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-neon-cyan" />
            Activity Heatmap
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-12 gap-1">
            {heatmap.map((intensity, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.003 }}
                className={`aspect-square rounded-sm ${intensity > 0.8 ? "bg-neon-cyan" : intensity > 0.6 ? "bg-neon-cyan/70" : intensity > 0.4 ? "bg-neon-cyan/40" : intensity > 0.2 ? "bg-neon-cyan/20" : "bg-muted/30"}`}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
