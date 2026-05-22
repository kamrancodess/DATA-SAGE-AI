"use client"

import { motion } from "framer-motion"
import { Trophy, Star, Target, Flame, Award, Medal } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

const achievements = [
  { id: "1", title: "First Steps", description: "Complete your first quiz", earned: true, icon: Star },
  { id: "2", title: "Week Warrior", description: "Study for 7 days in a row", earned: true, icon: Flame },
  { id: "3", title: "Quiz Master", description: "Score 100% on 5 quizzes", earned: true, icon: Trophy },
  { id: "4", title: "Knowledge Seeker", description: "Upload 10 documents", earned: false, icon: Target },
  { id: "5", title: "Flashcard Pro", description: "Master 100 flashcards", earned: false, icon: Award },
  { id: "6", title: "AI Companion", description: "Have 50 tutor sessions", earned: false, icon: Medal },
]

const milestones = [
  { id: "1", title: "Beginner", level: 1, xp: 500, maxXp: 500, completed: true },
  { id: "2", title: "Learner", level: 2, xp: 1200, maxXp: 1500, completed: false },
  { id: "3", title: "Scholar", level: 3, xp: 0, maxXp: 3000, completed: false },
  { id: "4", title: "Expert", level: 4, xp: 0, maxXp: 5000, completed: false },
  { id: "5", title: "Master", level: 5, xp: 0, maxXp: 10000, completed: false },
]

const weeklyProgress = {
  currentXp: 450,
  weeklyGoal: 1000,
  streak: 7,
  totalXp: 1700,
}

export function ProgressSection() {
  const currentMilestone = milestones.find((m) => !m.completed) || milestones[milestones.length - 1]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Progress Tracker</h1>
        <p className="text-muted-foreground mt-1">
          Track your achievements and milestones
        </p>
      </div>

      {/* Current Level */}
      <Card className="glass border-border/30 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-neon-cyan/5 to-neon-blue/5" />
        <CardContent className="relative p-8">
          <div className="flex items-center gap-8">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="relative"
            >
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-neon-cyan to-neon-blue p-1">
                <div className="w-full h-full rounded-full bg-card flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-4xl font-bold text-foreground">{currentMilestone.level}</p>
                    <p className="text-xs text-muted-foreground">Level</p>
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-to-r from-neon-cyan to-neon-blue text-xs font-medium text-white">
                {currentMilestone.title}
              </div>
            </motion.div>

            <div className="flex-1 space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-foreground">Progress to {milestones[currentMilestone.level]?.title || "Master"}</span>
                  <span className="text-neon-cyan">{currentMilestone.xp} / {currentMilestone.maxXp} XP</span>
                </div>
                <Progress value={(currentMilestone.xp / currentMilestone.maxXp) * 100} className="h-3" />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-muted/20 text-center">
                  <p className="text-2xl font-bold text-foreground">{weeklyProgress.totalXp}</p>
                  <p className="text-xs text-muted-foreground">Total XP</p>
                </div>
                <div className="p-4 rounded-xl bg-muted/20 text-center">
                  <p className="text-2xl font-bold text-foreground">{weeklyProgress.streak}</p>
                  <p className="text-xs text-muted-foreground">Day Streak</p>
                </div>
                <div className="p-4 rounded-xl bg-muted/20 text-center">
                  <p className="text-2xl font-bold text-foreground">{achievements.filter((a) => a.earned).length}</p>
                  <p className="text-xs text-muted-foreground">Achievements</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Weekly Goal */}
      <Card className="glass border-border/30">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="w-5 h-5 text-neon-cyan" />
            Weekly Goal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <div className="flex-1 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-foreground">XP Earned This Week</span>
                <span className="text-neon-cyan">{weeklyProgress.currentXp} / {weeklyProgress.weeklyGoal}</span>
              </div>
              <Progress value={(weeklyProgress.currentXp / weeklyProgress.weeklyGoal) * 100} className="h-2" />
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-foreground">{Math.round((weeklyProgress.currentXp / weeklyProgress.weeklyGoal) * 100)}%</p>
              <p className="text-xs text-muted-foreground">Complete</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Achievements */}
      <Card className="glass border-border/30">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Trophy className="w-5 h-5 text-neon-cyan" />
            Achievements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {achievements.map((achievement, index) => (
              <motion.div
                key={achievement.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`p-4 rounded-xl border transition-all ${
                  achievement.earned
                    ? "bg-gradient-to-br from-neon-cyan/10 to-neon-blue/10 border-neon-cyan/30"
                    : "bg-muted/10 border-border/30 opacity-60"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-xl ${
                    achievement.earned
                      ? "bg-gradient-to-br from-neon-cyan to-neon-blue"
                      : "bg-muted/30"
                  }`}>
                    <achievement.icon className={`w-5 h-5 ${
                      achievement.earned ? "text-white" : "text-muted-foreground"
                    }`} />
                  </div>
                  <div>
                    <p className={`font-medium ${
                      achievement.earned ? "text-foreground" : "text-muted-foreground"
                    }`}>
                      {achievement.title}
                    </p>
                    <p className="text-xs text-muted-foreground">{achievement.description}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Milestones */}
      <Card className="glass border-border/30">
        <CardHeader>
          <CardTitle className="text-lg">Level Milestones</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            {milestones.map((milestone, index) => (
              <div key={milestone.id} className="flex items-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    milestone.completed
                      ? "bg-gradient-to-br from-neon-cyan to-neon-blue text-white"
                      : milestone.xp > 0
                      ? "bg-neon-cyan/20 border-2 border-neon-cyan text-neon-cyan"
                      : "bg-muted/30 text-muted-foreground"
                  }`}
                >
                  {milestone.level}
                </motion.div>
                {index < milestones.length - 1 && (
                  <div className={`w-16 h-1 ${
                    milestone.completed ? "bg-gradient-to-r from-neon-cyan to-neon-blue" : "bg-muted/30"
                  }`} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2">
            {milestones.map((milestone) => (
              <span key={milestone.id} className="text-xs text-muted-foreground w-12 text-center">
                {milestone.title}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
