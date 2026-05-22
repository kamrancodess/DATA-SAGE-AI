"use client"

import { motion, AnimatePresence } from "framer-motion"
import { DashboardSection } from "./sections/dashboard-section"
import { UploadSection } from "./sections/upload-section"
import { TutorSection } from "./sections/tutor-section"
import { PdfQaSection } from "./sections/pdf-qa-section"
import { SummarizerSection } from "./sections/summarizer-section"
import { QuizSection } from "./sections/quiz-section"
import { WeakTopicsSection } from "./sections/weak-topics-section"
import { PlannerSection } from "./sections/planner-section"
import { RecommendationsSection } from "./sections/recommendations-section"
import { ClusteringSection } from "./sections/clustering-section"
import { AnalyticsSection } from "./sections/analytics-section"
import { FlashcardsSection } from "./sections/flashcards-section"
import { ProgressSection } from "./sections/progress-section"
import { SettingsSection } from "./sections/settings-section"

interface DashboardContentProps {
  activeSection: string
}

const sectionComponents: Record<string, React.ComponentType> = {
  dashboard: DashboardSection,
  upload: UploadSection,
  tutor: TutorSection,
  "pdf-qa": PdfQaSection,
  summarizer: SummarizerSection,
  quiz: QuizSection,
  "weak-topics": WeakTopicsSection,
  planner: PlannerSection,
  recommendations: RecommendationsSection,
  clustering: ClusteringSection,
  analytics: AnalyticsSection,
  flashcards: FlashcardsSection,
  progress: ProgressSection,
  settings: SettingsSection,
}

export function DashboardContent({ activeSection }: DashboardContentProps) {
  const ActiveComponent = sectionComponents[activeSection] || DashboardSection

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={activeSection}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="h-full"
      >
        <ActiveComponent />
      </motion.div>
    </AnimatePresence>
  )
}
