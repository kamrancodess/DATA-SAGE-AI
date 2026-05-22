"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Brain, CheckCircle, Loader2, Play, RotateCcw, Trophy, XCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { DocumentItem, fetchJson, getDocuments, QuizQuestion, QuizResult } from "@/lib/study-api"

export function QuizSection() {
  const [documents, setDocuments] = useState<DocumentItem[]>([])
  const [documentId, setDocumentId] = useState<number | null>(null)
  const [difficulty, setDifficulty] = useState("Medium")
  const [attemptId, setAttemptId] = useState<number | null>(null)
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState("")
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [result, setResult] = useState<QuizResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    void getDocuments().then((data) => {
      setDocuments(data.documents)
      setDocumentId(data.documents[0]?.id ?? null)
    })
  }, [])

  const startQuiz = async () => {
    if (!documentId) return
    setIsLoading(true)
    setResult(null)
    try {
      const data = await fetchJson<{ attempt_id: number | null; questions: QuizQuestion[] }>("/quiz/generate", {
        method: "POST",
        body: JSON.stringify({ document_id: documentId, count: 6, difficulty }),
      })
      setAttemptId(data.attempt_id)
      setQuestions(data.questions)
      setCurrentQuestion(0)
      setSelectedAnswer("")
      setAnswers({})
    } finally {
      setIsLoading(false)
    }
  }

  const nextQuestion = async () => {
    const question = questions[currentQuestion]
    const nextAnswers = { ...answers, [question.id]: selectedAnswer }
    setAnswers(nextAnswers)
    setSelectedAnswer("")

    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1)
      return
    }

    const data = await fetchJson<QuizResult>("/quiz/submit", {
      method: "POST",
      body: JSON.stringify({
        attempt_id: attemptId,
        answers: questions.map((item) => ({ question_id: item.id, selected_answer: nextAnswers[item.id] ?? "" })),
      }),
    })
    setResult(data)
  }

  const resetQuiz = () => {
    setQuestions([])
    setCurrentQuestion(0)
    setSelectedAnswer("")
    setAnswers({})
    setResult(null)
    setAttemptId(null)
  }

  const activeQuestion = questions[currentQuestion]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Quiz Generator</h1>
        <p className="text-muted-foreground mt-1">Generate and grade quizzes from your uploaded study materials.</p>
      </div>

      {!questions.length ? (
        <Card className="glass border-border/30">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="p-8 rounded-2xl bg-gradient-to-br from-neon-cyan/20 to-neon-blue/20 mb-8">
              <Brain className="w-16 h-16 text-neon-cyan" />
            </motion.div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Ready to Test Your Knowledge?</h2>
            <p className="text-muted-foreground text-center max-w-md mb-6">The demo ML PDF includes a 120-question bank. Uploaded PDFs generate their own questions and feed weak-topic detection.</p>
            <div className="grid w-full max-w-xl gap-3 md:grid-cols-2 mb-6">
              <select value={documentId ?? ""} onChange={(event) => setDocumentId(Number(event.target.value))} className="rounded-xl border border-border/50 bg-muted/30 px-4 py-3 text-sm text-foreground">
                {documents.map((document) => <option key={document.id} value={document.id}>{document.title}</option>)}
              </select>
              <select value={difficulty} onChange={(event) => setDifficulty(event.target.value)} className="rounded-xl border border-border/50 bg-muted/30 px-4 py-3 text-sm text-foreground">
                <option>Easy</option>
                <option>Medium</option>
                <option>Hard</option>
              </select>
            </div>
            <Button onClick={startQuiz} disabled={!documentId || isLoading} className="bg-gradient-to-r from-neon-cyan to-neon-blue hover:opacity-90 text-white px-8 py-6 text-lg">
              {isLoading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Play className="w-5 h-5 mr-2" />}
              Generate Quiz
            </Button>
          </CardContent>
        </Card>
      ) : result ? (
        <Card className="glass border-border/30">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="p-8 rounded-2xl bg-gradient-to-br from-neon-cyan/20 to-neon-blue/20 mb-8">
              <Trophy className="w-16 h-16 text-neon-cyan" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Quiz Complete!</h2>
            <p className="text-4xl font-bold text-neon-cyan mb-4">{result.score} / {result.total}</p>
            <p className="text-muted-foreground text-center max-w-md mb-8">Accuracy {Math.round(result.accuracy * 100)}%. Missed topics now influence recommendations.</p>
            <div className="w-full max-w-3xl space-y-4 mb-8">
              {result.results.map((item) => (
                <div key={item.question_id} className={`p-4 rounded-xl flex items-start gap-3 ${item.is_correct ? "bg-green-500/10 border border-green-500/30" : "bg-red-500/10 border border-red-500/30"}`}>
                  {item.is_correct ? <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" /> : <XCircle className="w-5 h-5 text-red-500 mt-0.5" />}
                  <div>
                    <p className="text-sm font-medium text-foreground">{item.topic}</p>
                    <p className="text-sm text-muted-foreground">Correct answer: {item.correct_answer}</p>
                    <p className="text-xs text-muted-foreground mt-1">{item.explanation}</p>
                  </div>
                </div>
              ))}
            </div>
            <Button onClick={resetQuiz} className="bg-gradient-to-r from-neon-cyan to-neon-blue hover:opacity-90 text-white">
              <RotateCcw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      ) : activeQuestion ? (
        <Card className="glass border-border/30">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Question {currentQuestion + 1} of {questions.length}</CardTitle>
              <span className="text-sm text-muted-foreground">{Math.round(((currentQuestion + 1) / questions.length) * 100)}% Complete</span>
            </div>
            <Progress value={((currentQuestion + 1) / questions.length) * 100} className="h-2 mt-2" />
          </CardHeader>
          <CardContent className="space-y-6">
            <motion.div key={activeQuestion.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              <div>
                <p className="text-xs text-neon-cyan mb-2">{activeQuestion.topic} - {activeQuestion.question_type}</p>
                <h2 className="text-xl font-semibold text-foreground">{activeQuestion.question}</h2>
              </div>
              {activeQuestion.options.length ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {activeQuestion.options.map((option) => (
                    <motion.button
                      key={option}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setSelectedAnswer(option)}
                      className={`p-4 rounded-xl text-left transition-all border ${selectedAnswer === option ? "bg-gradient-to-r from-neon-cyan/20 to-neon-blue/20 border-neon-cyan" : "bg-muted/20 border-border/30 hover:border-neon-cyan/50"}`}
                    >
                      <span className="font-medium text-foreground">{option}</span>
                    </motion.button>
                  ))}
                </div>
              ) : (
                <textarea value={selectedAnswer} onChange={(event) => setSelectedAnswer(event.target.value)} className="min-h-32 w-full rounded-xl border border-border/50 bg-muted/30 p-4 text-sm text-foreground outline-none" />
              )}
              <Button onClick={() => void nextQuestion()} disabled={!selectedAnswer.trim()} className="w-full bg-gradient-to-r from-neon-cyan to-neon-blue hover:opacity-90 text-white">
                {currentQuestion === questions.length - 1 ? "Finish Quiz" : "Next Question"}
              </Button>
            </motion.div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
