"use client"

import { useState } from "react"
import { GradientBackground } from "@/components/gradient-background"
import { AppSidebar } from "@/components/app-sidebar"
import { DashboardContent } from "@/components/dashboard-content"
import { LandingHero } from "@/components/landing-hero"

export default function Page() {
  const [activeSection, setActiveSection] = useState("dashboard")
  const [showDashboard, setShowDashboard] = useState(true)

  const handleGoHome = () => {
    setShowDashboard(false)
  }

  const handleEnterDashboard = () => {
    setShowDashboard(true)
    setActiveSection("dashboard")
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <GradientBackground />
      
      {showDashboard ? (
        <>
          <AppSidebar 
            activeSection={activeSection} 
            onSectionChange={setActiveSection}
            onLogoClick={handleGoHome}
          />
          <main className="ml-[280px] min-h-screen p-6 transition-all duration-300">
            <DashboardContent activeSection={activeSection} />
          </main>
        </>
      ) : (
        <LandingHero onEnterDashboard={handleEnterDashboard} />
      )}
    </div>
  )
}
