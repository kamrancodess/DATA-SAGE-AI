"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Check, Copy, FileText, Loader2, Wand2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { DocumentItem, fetchJson, getDocuments } from "@/lib/study-api"

export function SummarizerSection() {
  const [documents, setDocuments] = useState<DocumentItem[]>([])
  const [documentId, setDocumentId] = useState<number | null>(null)
  const [mode, setMode] = useState<"document" | "chunks">("document")
  const [summary, setSummary] = useState<string | null>(null)
  const [items, setItems] = useState<Array<{ topic: string; summary: string }>>([])
  const [isLoading, setIsLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    void getDocuments().then((data) => {
      setDocuments(data.documents)
      setDocumentId(data.documents[0]?.id ?? null)
    })
  }, [])

  const handleSummarize = async () => {
    if (!documentId) return
    setIsLoading(true)
    setSummary(null)
    setItems([])
    try {
      const result = await fetchJson<{ summary?: string; items?: Array<{ topic: string; summary: string }> }>("/summarize", {
        method: "POST",
        body: JSON.stringify({ document_id: documentId, mode }),
      })
      setSummary(result.summary ?? null)
      setItems(result.items ?? [])
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopy = () => {
    const text = summary ?? items.map((item) => `${item.topic}\n${item.summary}`).join("\n\n")
    if (text) {
      navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Smart Summarizer</h1>
        <p className="text-muted-foreground mt-1">Generate local AI summaries from indexed PDFs.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="glass border-border/30">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="w-5 h-5 text-neon-cyan" />
              Source Document
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <select
              value={documentId ?? ""}
              onChange={(event) => setDocumentId(Number(event.target.value))}
              className="w-full rounded-xl border border-border/50 bg-muted/30 px-4 py-3 text-sm text-foreground outline-none"
            >
              {documents.map((document) => (
                <option key={document.id} value={document.id}>{document.title}</option>
              ))}
            </select>

            <div>
              <p className="text-sm text-muted-foreground mb-3">Summary Mode</p>
              <div className="flex gap-2">
                {[
                  { id: "document", label: "Whole Document", description: "One revision summary" },
                  { id: "chunks", label: "Chunk Wise", description: "Topic summaries" },
                ].map((option) => (
                  <Button
                    key={option.id}
                    variant="outline"
                    size="sm"
                    onClick={() => setMode(option.id as "document" | "chunks")}
                    className={`flex-1 ${mode === option.id ? "border-neon-cyan bg-neon-cyan/10 text-neon-cyan" : "border-border/50"}`}
                  >
                    <div className="text-center">
                      <p className="font-medium">{option.label}</p>
                      <p className="text-xs text-muted-foreground">{option.description}</p>
                    </div>
                  </Button>
                ))}
              </div>
            </div>

            <Button
              onClick={handleSummarize}
              disabled={!documentId || isLoading}
              className="w-full bg-gradient-to-r from-neon-cyan to-neon-blue hover:opacity-90 text-white"
            >
              {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Wand2 className="w-4 h-4 mr-2" />}
              Generate Summary
            </Button>
          </CardContent>
        </Card>

        <Card className="glass border-border/30">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Wand2 className="w-5 h-5 text-neon-cyan" />
              Summary
            </CardTitle>
            {(summary || items.length > 0) && (
              <Button variant="ghost" size="sm" onClick={handleCopy} className="hover:bg-neon-cyan/10">
                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {summary || items.length ? (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 min-h-[300px]">
                {summary && <div className="p-6 rounded-xl bg-muted/20 border border-border/30 text-sm whitespace-pre-wrap text-foreground">{summary}</div>}
                {items.map((item) => (
                  <div key={item.topic} className="p-5 rounded-xl bg-muted/20 border border-border/30">
                    <p className="text-sm font-semibold text-neon-cyan">{item.topic}</p>
                    <p className="mt-2 text-sm text-foreground">{item.summary}</p>
                  </div>
                ))}
              </motion.div>
            ) : (
              <div className="flex flex-col items-center justify-center min-h-[300px] text-center">
                <div className="p-6 rounded-2xl bg-gradient-to-br from-neon-cyan/20 to-neon-blue/20 mb-6">
                  <Wand2 className="w-12 h-12 text-neon-cyan" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">Your summary will appear here</h3>
                <p className="text-muted-foreground max-w-md">Choose an indexed document and generate a local summary.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
