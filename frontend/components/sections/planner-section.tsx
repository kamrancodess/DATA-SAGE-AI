"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Calendar, CheckCircle, Circle, Clock, Plus } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { fetchJson, RecommendationData } from "@/lib/study-api"

export function PlannerSection() {
  const [data, setData] = useState<RecommendationData | null>(null)

  useEffect(() => {
    void fetchJson<RecommendationData>("/recommendations").then(setData)
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Study Planner</h1>
          <p className="text-muted-foreground mt-1">A weekly schedule generated from your weak topics.</p>
        </div>
        <Button className="bg-gradient-to-r from-neon-cyan to-neon-blue hover:opacity-90 text-white">
          <Plus className="w-4 h-4 mr-2" />
          AI Generated
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="glass border-border/30 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="w-5 h-5 text-neon-cyan" />
              7-Day Schedule
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(data?.weekly_plan ?? []).map((task, index) => (
              <motion.div key={task.date} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.08 }} className="flex items-center gap-4 p-4 rounded-xl bg-muted/20 border border-border/30 hover:border-neon-cyan/30 transition-all">
                <button className="flex-shrink-0">{index < 2 ? <CheckCircle className="w-6 h-6 text-green-500" /> : <Circle className="w-6 h-6 text-muted-foreground" />}</button>
                <div className="flex-1">
                  <p className="font-medium text-foreground">{task.topic}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" />{task.date}</span>
                    <span className="text-xs text-neon-cyan">{task.minutes}m</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{task.task}</p>
                </div>
              </motion.div>
            ))}
            {!data?.weekly_plan?.length && <p className="text-sm text-muted-foreground">Upload material and take quizzes to build a plan.</p>}
          </CardContent>
        </Card>

        <Card className="glass border-border/30">
          <CardHeader>
            <CardTitle className="text-lg">Revision Priorities</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {(data?.recommendations ?? []).map((item, index) => (
              <motion.div key={item.topic} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + index * 0.1 }} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-foreground">{item.topic}</span>
                  <span className="text-neon-cyan">{item.priority}</span>
                </div>
                <p className="text-xs text-muted-foreground">{item.action}</p>
              </motion.div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
