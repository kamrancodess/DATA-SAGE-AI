"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { FileQuestion, FileText, Loader2, MessageSquare, Send } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AskResponse, DocumentItem, fetchJson, getDocuments } from "@/lib/study-api"

const demoQuestions = [
  "What is the difference between supervised and unsupervised learning?",
  "How do precision, recall, and F1 score help evaluate a classifier?",
  "Why does overfitting happen, and how can regularization reduce it?",
  "Explain how RAG uses embeddings and retrieval to answer questions.",
]

export function PdfQaSection() {
  const [documents, setDocuments] = useState<DocumentItem[]>([])
  const [selectedPdf, setSelectedPdf] = useState<number | null>(null)
  const [question, setQuestion] = useState("")
  const [answer, setAnswer] = useState<AskResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    void getDocuments().then((data) => {
      setDocuments(data.documents)
      setSelectedPdf(data.documents[0]?.id ?? null)
    }).catch((err) => setError(err instanceof Error ? err.message : "Could not load documents."))
  }, [])

  const handleAsk = async () => {
    if (!question.trim() || !selectedPdf) return
    setIsLoading(true)
    setError("")
    try {
      setAnswer(await fetchJson<AskResponse>("/ask", {
        method: "POST",
        body: JSON.stringify({ question, document_id: selectedPdf }),
      }))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Question answering failed.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">PDF Q&A</h1>
        <p className="text-muted-foreground mt-1">Ask grounded questions about your uploaded documents.</p>
      </div>

      {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="glass border-border/30 lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="w-5 h-5 text-neon-cyan" />
              Your Documents
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {documents.length ? documents.map((pdf) => (
              <motion.button
                key={pdf.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedPdf(pdf.id)}
                className={`w-full p-4 rounded-xl text-left transition-all ${
                  selectedPdf === pdf.id
                    ? "bg-gradient-to-r from-neon-cyan/20 to-neon-blue/20 border border-neon-cyan/30"
                    : "bg-muted/20 border border-border/30 hover:border-neon-cyan/30"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-neon-cyan/20 to-neon-blue/20">
                    <FileText className="w-4 h-4 text-neon-cyan" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{pdf.title}</p>
                    <p className="text-xs text-muted-foreground">{pdf.page_count} pages</p>
                  </div>
                </div>
              </motion.button>
            )) : (
              <p className="text-sm text-muted-foreground">Upload a PDF first.</p>
            )}
          </CardContent>
        </Card>

        <Card className="glass border-border/30 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-neon-cyan" />
              Ask a Question
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {!selectedPdf ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="p-6 rounded-2xl bg-gradient-to-br from-neon-cyan/20 to-neon-blue/20 mb-6">
                  <FileQuestion className="w-12 h-12 text-neon-cyan" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">No Document Selected</h3>
                <p className="text-muted-foreground max-w-md">Upload a PDF to start retrieval-augmented Q&A.</p>
              </div>
            ) : (
              <>
                <form
                  onSubmit={(event) => {
                    event.preventDefault()
                    void handleAsk()
                  }}
                  className="flex gap-3"
                >
                  <Input
                    value={question}
                    onChange={(event) => setQuestion(event.target.value)}
                    placeholder="What would you like to know about this document?"
                    className="flex-1 bg-muted/30 border-border/50 focus:border-neon-cyan/50"
                  />
                  <Button type="submit" disabled={!question.trim() || isLoading} className="bg-gradient-to-r from-neon-cyan to-neon-blue hover:opacity-90 text-white">
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                </form>

                {!answer && (
                  <div className="space-y-2">
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Demo questions</p>
                    <div className="flex flex-wrap gap-2">
                      {demoQuestions.map((item) => (
                        <Button
                          key={item}
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setQuestion(item)}
                          className="border-border/50 bg-muted/20 text-xs hover:border-neon-cyan/50 hover:bg-neon-cyan/5"
                        >
                          {item}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {answer && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                    <div className="p-6 rounded-xl bg-muted/20 border border-border/30">
                      <p className="text-sm whitespace-pre-wrap text-foreground">{answer.answer}</p>
                      <p className="mt-3 text-xs text-neon-cyan">Confidence {answer.confidence.toFixed(2)}</p>
                    </div>
                    {answer.sources.map((source, index) => (
                      <div key={`${source.document_title}-${index}`} className="p-4 rounded-xl bg-muted/20 border border-border/30">
                        <p className="text-sm font-medium text-foreground">{source.document_title} pages {source.page_start}-{source.page_end}</p>
                        <p className="text-xs text-muted-foreground">{source.topic} - score {source.score.toFixed(2)}</p>
                        <p className="mt-2 text-xs text-muted-foreground line-clamp-3">{source.text}</p>
                      </div>
                    ))}
                  </motion.div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
