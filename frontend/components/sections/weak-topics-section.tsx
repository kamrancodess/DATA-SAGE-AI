"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { AlertTriangle, BookOpen, Target, TrendingDown } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { DashboardData, getDashboard } from "@/lib/study-api"

export function WeakTopicsSection() {
  const [data, setData] = useState<DashboardData | null>(null)

  useEffect(() => {
    void getDashboard().then(setData)
  }, [])

  const weakTopics = data?.weak_topics ?? []
  const tips = data?.recommendations.map((item) => item.action) ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Weak Topic Analysis</h1>
        <p className="text-muted-foreground mt-1">Identify and improve challenging areas from real quiz history.</p>
      </div>

      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-4 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 flex items-center gap-4">
        <div className="p-3 rounded-lg bg-amber-500/20">
          <AlertTriangle className="w-6 h-6 text-amber-500" />
        </div>
        <div className="flex-1">
          <p className="font-medium text-foreground">Attention Needed</p>
          <p className="text-sm text-muted-foreground">{weakTopics.length ? `You have ${weakTopics.length} topics that need review.` : "Submit quizzes to unlock weak-topic analysis."}</p>
        </div>
        <Button variant="outline" className="border-amber-500/30 hover:bg-amber-500/10 text-amber-500">Start Practice</Button>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {weakTopics.map((topic, index) => {
          const score = Math.round(topic.accuracy * 100)
          return (
            <motion.div key={topic.topic} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}>
              <Card className="glass border-border/30 hover:border-neon-cyan/40 transition-all">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-foreground">{topic.topic}</h3>
                      <p className="text-sm text-muted-foreground">{topic.answered} answered · {topic.reason}</p>
                    </div>
                    <div className={score < 60 ? "p-2 rounded-lg bg-red-500/20" : "p-2 rounded-lg bg-amber-500/20"}>
                      <TrendingDown className={score < 60 ? "w-4 h-4 text-red-500" : "w-4 h-4 text-amber-500"} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Mastery Level</span>
                      <span className={score < 60 ? "font-medium text-red-500" : "font-medium text-amber-500"}>{score}%</span>
                    </div>
                    <Progress value={score} className="h-2" />
                  </div>
                  <Button variant="ghost" className="w-full mt-4 hover:bg-neon-cyan/10 hover:text-neon-cyan">
                    <BookOpen className="w-4 h-4 mr-2" />
                    Practice Now
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>

      <Card className="glass border-border/30">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="w-5 h-5 text-neon-cyan" />
            Personalized Improvement Tips
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {(tips.length ? tips : ["Upload PDFs, generate a quiz, and submit answers to train your weak-topic profile."]).map((tip, index) => (
              <motion.li key={`${tip}-${index}`} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + index * 0.1 }} className="flex items-center gap-3 p-3 rounded-xl bg-muted/20">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-neon-cyan to-neon-blue flex items-center justify-center text-xs font-medium text-white">{index + 1}</div>
                <span className="text-sm text-foreground">{tip}</span>
              </motion.li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
