export const API_BASE = process.env.NEXT_PUBLIC_STUDY_API_URL ?? "http://127.0.0.1:8000"

export type DocumentItem = {
  id: number
  title: string
  filename: string
  page_count: number
  created_at: string
}

export type DashboardData = {
  metrics: {
    documents: number
    attempts: number
    answers: number
    accuracy: number
    study_minutes: number
  }
  topic_accuracy: Array<{ topic: string; answered: number; accuracy: number }>
  weak_topics: Array<{ topic: string; accuracy: number; answered: number; reason: string }>
  recommendations: Array<{ topic: string; action: string; priority: string }>
  documents: DocumentItem[]
}

export type AskResponse = {
  answer: string
  confidence: number
  sources: Array<{
    document_title: string
    topic: string
    page_start: number | null
    page_end: number | null
    score: number
    text: string
  }>
}

export type QuizQuestion = {
  id: number
  topic: string
  difficulty: string
  question_type: string
  question: string
  options: string[]
  correct_answer: string
  explanation: string
}

export type QuizResult = {
  score: number
  total: number
  accuracy: number
  results: Array<{
    question_id: number
    is_correct: boolean
    correct_answer: string
    explanation: string
    topic: string
  }>
}

export type RecommendationData = {
  recommendations: Array<{ topic: string; action: string; priority: string }>
  weekly_plan: Array<{ date: string; topic: string; minutes: number; task: string }>
  flashcards: Array<{ id: number; topic: string; front: string; back: string; due_at: string }>
}

export type ClusterData = {
  clusters: Array<{ cluster_id: number; label: string; size: number; sample: string }>
  chunks: Array<{ chunk_id: number; document: string; topic: string; cluster: number; page_start: number; page_end: number }>
  quality: string
}

export async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  })

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.detail ?? body.error ?? `Request failed with ${response.status}`)
  }

  return response.json() as Promise<T>
}

export function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const value = String(reader.result ?? "")
      resolve(value.includes(",") ? value.split(",")[1] : value)
    }
    reader.onerror = () => reject(new Error("Could not read file"))
    reader.readAsDataURL(file)
  })
}

export async function getDashboard() {
  return fetchJson<DashboardData>("/dashboard")
}

export async function getDocuments() {
  return fetchJson<{ documents: DocumentItem[] }>("/documents")
}
