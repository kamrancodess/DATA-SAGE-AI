"use client"

import { useCallback, useRef, useState } from "react"
import { motion } from "framer-motion"
import { AlertCircle, CheckCircle, FileText, Loader2, Upload, X } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { fetchJson, fileToBase64 } from "@/lib/study-api"

interface UploadedFile {
  id: string
  name: string
  size: string
  status: "processing" | "complete" | "error"
  progress: number
  message: string
}

export function UploadSection() {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
  }

  const processFiles = useCallback(async (incomingFiles: File[]) => {
    const pdfs = incomingFiles.filter((file) => file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf"))
    const newFiles: UploadedFile[] = pdfs.map((file) => ({
      id: crypto.randomUUID(),
      name: file.name,
      size: formatFileSize(file.size),
      status: "processing",
      progress: 35,
      message: "Extracting text and building embeddings...",
    }))

    setFiles((prev) => [...newFiles, ...prev])

    for (let index = 0; index < pdfs.length; index += 1) {
      const file = pdfs[index]
      const uiFile = newFiles[index]
      try {
        const contentBase64 = await fileToBase64(file)
        setFiles((prev) => prev.map((item) => item.id === uiFile.id ? { ...item, progress: 70, message: "Indexing chunks in FAISS-ready storage..." } : item))
        const result = await fetchJson<{ chunks: number; flashcards: number; pages: number }>("/documents/upload", {
          method: "POST",
          body: JSON.stringify({ filename: file.name, content_base64: contentBase64 }),
        })
        setFiles((prev) =>
          prev.map((item) =>
            item.id === uiFile.id
              ? { ...item, progress: 100, status: "complete", message: `${result.pages} pages, ${result.chunks} chunks, ${result.flashcards} flashcards indexed.` }
              : item,
          ),
        )
      } catch (error) {
        setFiles((prev) =>
          prev.map((item) =>
            item.id === uiFile.id
              ? { ...item, progress: 100, status: "error", message: error instanceof Error ? error.message : "Upload failed." }
              : item,
          ),
        )
      }
    }
  }, [])

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    setIsDragging(false)
    void processFiles(Array.from(event.dataTransfer.files))
  }, [processFiles])

  const removeFile = (fileId: string) => {
    setFiles((prev) => prev.filter((file) => file.id !== fileId))
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Upload Notes</h1>
        <p className="text-muted-foreground mt-1">Upload PDFs to power RAG, summaries, quizzes, clustering, and flashcards.</p>
        <p className="text-sm text-muted-foreground mt-2">Selectable-text PDFs index fastest. Scanned/image PDFs use local OCR and can take a few minutes for large files.</p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        multiple
        className="hidden"
        onChange={(event) => void processFiles(Array.from(event.target.files ?? []))}
      />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card
          className={`glass border-2 border-dashed transition-all duration-300 ${
            isDragging ? "border-neon-cyan bg-neon-cyan/5" : "border-border/50 hover:border-neon-cyan/50"
          }`}
          onDragOver={(event) => {
            event.preventDefault()
            setIsDragging(true)
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          <CardContent className="flex flex-col items-center justify-center py-16">
            <motion.div animate={{ scale: isDragging ? 1.1 : 1 }} className="p-6 rounded-2xl bg-gradient-to-br from-neon-cyan/20 to-neon-blue/20 mb-6">
              <Upload className="w-12 h-12 text-neon-cyan" />
            </motion.div>
            <h3 className="text-xl font-semibold text-foreground mb-2">Drop PDFs here</h3>
            <p className="text-muted-foreground text-center mb-6 max-w-md">Readable text-layer PDFs work best. Scanned PDFs are handled with local Tesseract OCR when available.</p>
            <Button onClick={() => inputRef.current?.click()} className="bg-gradient-to-r from-neon-cyan to-neon-blue hover:opacity-90 text-white">
              <Upload className="w-4 h-4 mr-2" />
              Browse PDFs
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {files.length > 0 && (
        <Card className="glass border-border/30">
          <CardHeader>
            <CardTitle className="text-lg">Indexed Files</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {files.map((file, index) => (
              <motion.div
                key={file.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center gap-4 p-4 rounded-xl bg-muted/20 border border-border/30"
              >
                <div className="p-2 rounded-lg bg-gradient-to-br from-neon-cyan/20 to-neon-blue/20">
                  <FileText className="w-5 h-5 text-neon-cyan" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{file.size} · {file.message}</p>
                  {file.status === "processing" && <Progress value={file.progress} className="h-1 mt-2" />}
                </div>
                <div className="flex items-center gap-2">
                  {file.status === "processing" && <Loader2 className="w-5 h-5 animate-spin text-neon-cyan" />}
                  {file.status === "complete" && <CheckCircle className="w-5 h-5 text-green-500" />}
                  {file.status === "error" && <AlertCircle className="w-5 h-5 text-red-500" />}
                  <Button variant="ghost" size="sm" onClick={() => removeFile(file.id)} className="hover:bg-destructive/10 hover:text-destructive">
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
