"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Check, ChevronLeft, ChevronRight, Layers, X } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { fetchJson, RecommendationData } from "@/lib/study-api"

export function FlashcardsSection() {
  const [cards, setCards] = useState<RecommendationData["flashcards"]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)

  useEffect(() => {
    void fetchJson<RecommendationData>("/recommendations").then((data) => setCards(data.flashcards))
  }, [])

  const currentCard = cards[currentIndex]
  const handleNext = () => {
    setIsFlipped(false)
    setCurrentIndex((prev) => (cards.length ? (prev + 1) % cards.length : 0))
  }
  const handlePrev = () => {
    setIsFlipped(false)
    setCurrentIndex((prev) => (cards.length ? (prev - 1 + cards.length) % cards.length : 0))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Flashcards</h1>
          <p className="text-muted-foreground mt-1">Review cards generated from uploaded PDFs.</p>
        </div>
        <span className="text-sm text-muted-foreground">{cards.length} due</span>
      </div>

      {currentCard ? (
        <div className="flex flex-col items-center">
          <div className="w-full max-w-2xl">
            <motion.div className="relative w-full aspect-[3/2] cursor-pointer" onClick={() => setIsFlipped(!isFlipped)}>
              <Card className={isFlipped ? "glass border-border/30 h-full bg-gradient-to-br from-neon-cyan/10 to-neon-blue/10" : "glass border-border/30 h-full"}>
                <CardContent className="flex flex-col items-center justify-center h-full p-8 text-center">
                  <span className={isFlipped ? "text-xs font-medium px-3 py-1 rounded-full mb-4 bg-neon-cyan/20 text-neon-cyan" : "text-xs font-medium px-3 py-1 rounded-full mb-4 bg-muted/30 text-muted-foreground"}>
                    {isFlipped ? "Answer" : currentCard.topic}
                  </span>
                  <p className="text-xl font-medium text-foreground">{isFlipped ? currentCard.back : currentCard.front}</p>
                  <p className="text-sm text-muted-foreground mt-6">{isFlipped ? "Click to see question" : "Click to reveal answer"}</p>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          <div className="flex items-center gap-4 mt-6">
            <Button variant="outline" size="lg" onClick={handlePrev} className="border-border/50 hover:border-neon-cyan/50"><ChevronLeft className="w-5 h-5" /></Button>
            <Button variant="outline" size="lg" onClick={handleNext} className="border-red-500/30 hover:bg-red-500/10 hover:border-red-500/50 text-red-500"><X className="w-5 h-5 mr-2" />Still Learning</Button>
            <Button size="lg" onClick={handleNext} className="bg-gradient-to-r from-neon-cyan to-neon-blue hover:opacity-90 text-white"><Check className="w-5 h-5 mr-2" />Reviewed</Button>
            <Button variant="outline" size="lg" onClick={handleNext} className="border-border/50 hover:border-neon-cyan/50"><ChevronRight className="w-5 h-5" /></Button>
          </div>
        </div>
      ) : (
        <Card className="glass border-border/30">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Layers className="w-12 h-12 text-neon-cyan mb-4" />
            <h2 className="text-xl font-semibold text-foreground">No flashcards due</h2>
            <p className="text-muted-foreground mt-2">Upload PDFs to generate cards automatically.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
