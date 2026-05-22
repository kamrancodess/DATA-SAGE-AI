"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Send, Bot, User, Sparkles, Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AskResponse, fetchJson } from "@/lib/study-api"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

const suggestedQuestions = [
  "Explain overfitting and underfitting with an example",
  "Give me a 7-day plan to revise ML Unit 1-5",
  "Why is precision different from recall?",
  "Teach me K-means, DBSCAN, and PCA like I am preparing for an exam",
  "Ask me viva-style questions on neural networks",
  "What should I revise first based on my weak topics?",
]

export function TutorSection() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: "Hello! I am your AI Study Companion. I already have a demo ML Unit 1-5 knowledge base loaded for showcase mode, and I will switch naturally to your uploaded PDFs when you add them.",
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    try {
      const response = await fetchJson<AskResponse>("/ask", {
        method: "POST",
        body: JSON.stringify({ question: input }),
      })
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `${response.answer}\n\nConfidence: ${response.confidence.toFixed(2)}${response.sources.length ? `\nSource: ${response.sources[0].document_title}, pages ${response.sources[0].page_start}-${response.sources[0].page_end}` : ""}`,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, aiMessage])
    } catch (error) {
      setMessages((prev) => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: error instanceof Error ? error.message : "I could not reach the local AI backend.",
        timestamp: new Date(),
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSuggestedQuestion = (question: string) => {
    setInput(question)
  }

  return (
    <div className="space-y-6 h-[calc(100vh-6rem)] flex flex-col">
      <div>
        <h1 className="text-3xl font-bold text-foreground">AI Tutor</h1>
        <p className="text-muted-foreground mt-1">
          Your personal AI assistant for learning anything
        </p>
      </div>

      {/* Chat Container */}
      <Card className="glass border-border/30 flex-1 flex flex-col overflow-hidden">
        <CardHeader className="border-b border-border/30 py-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-neon-cyan to-neon-blue">
              <Bot className="w-4 h-4 text-white" />
            </div>
            AI Study Companion
            <span className="ml-auto flex items-center gap-1 text-xs text-neon-cyan">
              <span className="w-2 h-2 rounded-full bg-neon-cyan animate-pulse" />
              Online
            </span>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message, index) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`flex gap-3 ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {message.role === "assistant" && (
                <div className="p-2 rounded-lg bg-gradient-to-br from-neon-cyan/20 to-neon-blue/20 h-fit">
                  <Bot className="w-4 h-4 text-neon-cyan" />
                </div>
              )}
              <div
                className={`max-w-[80%] p-4 rounded-2xl ${
                  message.role === "user"
                    ? "bg-gradient-to-r from-neon-cyan to-neon-blue text-white"
                    : "bg-muted/30 border border-border/30"
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                <p className={`text-xs mt-2 ${
                  message.role === "user" ? "text-white/70" : "text-muted-foreground"
                }`}>
                  {message.timestamp.toLocaleTimeString([], { 
                    hour: "2-digit", 
                    minute: "2-digit" 
                  })}
                </p>
              </div>
              {message.role === "user" && (
                <div className="p-2 rounded-lg bg-muted/30 h-fit">
                  <User className="w-4 h-4 text-muted-foreground" />
                </div>
              )}
            </motion.div>
          ))}
          
          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-3"
            >
              <div className="p-2 rounded-lg bg-gradient-to-br from-neon-cyan/20 to-neon-blue/20 h-fit">
                <Bot className="w-4 h-4 text-neon-cyan" />
              </div>
              <div className="p-4 rounded-2xl bg-muted/30 border border-border/30">
                <Loader2 className="w-5 h-5 animate-spin text-neon-cyan" />
              </div>
            </motion.div>
          )}
        </CardContent>

        {/* Suggested Questions */}
        {messages.length === 1 && (
          <div className="px-4 pb-2">
            <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Suggested questions
            </p>
            <div className="flex flex-wrap gap-2">
              {suggestedQuestions.map((question) => (
                <Button
                  key={question}
                  variant="outline"
                  size="sm"
                  className="text-xs border-border/50 hover:border-neon-cyan/50 hover:bg-neon-cyan/5"
                  onClick={() => handleSuggestedQuestion(question)}
                >
                  {question}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="p-4 border-t border-border/30">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSend()
            }}
            className="flex gap-3"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me anything about your studies..."
              className="flex-1 bg-muted/30 border-border/50 focus:border-neon-cyan/50"
            />
            <Button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="bg-gradient-to-r from-neon-cyan to-neon-blue hover:opacity-90 text-white"
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </Card>
    </div>
  )
}
