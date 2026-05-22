"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { BookOpen, ExternalLink, FileText, Lightbulb } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { fetchJson, RecommendationData } from "@/lib/study-api"

export function RecommendationsSection() {
  const [data, setData] = useState<RecommendationData | null>(null)

  useEffect(() => {
    void fetchJson<RecommendationData>("/recommendations").then(setData)
  }, [])

  const top = data?.recommendations[0]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Smart Recommendations</h1>
        <p className="text-muted-foreground mt-1">Personalized revision resources based on your local progress data.</p>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="glass border-border/30 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-neon-cyan/10 to-neon-blue/10" />
          <CardContent className="relative p-8">
            <div className="flex items-start gap-6">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-neon-cyan to-neon-blue">
                <Lightbulb className="w-8 h-8 text-white" />
              </div>
              <div className="flex-1">
                <span className="text-xs font-medium text-neon-cyan uppercase tracking-wider">Top Pick for You</span>
                <h2 className="text-2xl font-bold text-foreground mt-2">{top?.topic ?? "Upload notes and take a quiz"}</h2>
                <p className="text-muted-foreground mt-2">{top?.action ?? "The recommendation engine needs study material and quiz history to personalize your next step."}</p>
                <Button className="mt-4 bg-gradient-to-r from-neon-cyan to-neon-blue hover:opacity-90 text-white">Continue Learning</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(data?.recommendations ?? []).map((rec, index) => (
          <motion.div key={rec.topic} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}>
            <Card className="glass border-border/30 hover:border-neon-cyan/40 transition-all h-full">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-blue/20">
                    <FileText className="w-5 h-5 text-neon-cyan" />
                  </div>
                  <div className="flex-1">
                    <div className="mb-1">
                      <span className={rec.priority === "High" ? "text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-500" : "text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-500"}>{rec.priority}</span>
                    </div>
                    <h3 className="font-semibold text-foreground">{rec.topic}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{rec.action}</p>
                    <Button variant="ghost" size="sm" className="mt-3 hover:bg-neon-cyan/10 hover:text-neon-cyan">
                      Open Study Task
                      <ExternalLink className="w-3 h-3 ml-2" />
                    </Button>
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
            <BookOpen className="w-5 h-5 text-neon-cyan" />
            Weekly Learning Path
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {(data?.weekly_plan ?? []).map((path, index) => (
            <motion.div key={path.date} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + index * 0.1 }} className="p-4 rounded-xl bg-muted/20 border border-border/30">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-foreground">{path.topic}</h4>
                <span className="text-sm text-neon-cyan">{path.minutes} min</span>
              </div>
              <p className="text-xs text-muted-foreground">{path.date} · {path.task}</p>
            </motion.div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
