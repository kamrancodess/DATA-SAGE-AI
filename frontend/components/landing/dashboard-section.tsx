"use client";

import { useState, useEffect, useRef } from "react";
import {
  Sparkles, Play, Database, BarChart3, Table, TrendingUp,
  AlertTriangle, CheckCircle, Zap, Terminal, Clock, Lightbulb,
  Activity, PieChart, LineChart, Info, Search, Brain
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
type ResultRow = (string | number)[];   // backend returns raw tuples
type Severity = "low" | "medium" | "high";

interface QueryResponse {
  success: boolean;
  sql?: string;
  columns?: string[];
  data?: ResultRow[];
  intelligence?: QueryIntelligence;
  report?: QueryReport;
  error?: string;
}

interface QueryIntelligence {
  understood: string;
  tables_used: string[];
  why: string;
  confidence: number;
  insights: string[];
  recommendation: string;
  generated_by_model?: boolean;
  model_error?: string;
}

interface QueryReport {
  title: string;
  rows: number;
  columns: number;
  model: string;
  database: string;
}

interface LogAnalysis {
  issues: string[];
  suggested_fixes: string[];
  severity?: Severity;
  affected_service?: string;
  root_cause?: string;
  timeline?: { stage: string; detail: string }[];
}

interface LogResponse {
  success: boolean;
  analysis?: LogAnalysis;
  error?: string;
}

interface ResourceMetric {
  name: "CPU" | "Memory" | "Storage" | "Network";
  value: number;
  color: string;
}

interface ResourceResponse {
  success: boolean;
  data?: ResourceMetric[];
  error?: string;
}

interface ModelStatus {
  success: boolean;
  model?: string;
  database?: string;
  tables?: number;
  columns?: number;
  mode?: string;
  error?: string;
}

interface QualityResponse {
  success: boolean;
  tables?: { table: string; rows: number; columns: number; checks: string[] }[];
  findings?: string[];
  ai_summary?: {
    summary: string;
    risk_level: string;
    next_actions: string[];
    generated_by_model?: boolean;
  };
  error?: string;
}

interface SavedReport extends QueryReport {
  question: string;
  sql: string;
  insights: string[];
  savedAt: string;
}

interface ForecastPoint {
  date: string;
  revenue?: number;
  predicted?: number;
  lower?: number;
  upper?: number;
}

interface ForecastData {
  historical: ForecastPoint[];
  forecast: ForecastPoint[];
}

interface AnomalyData {
  anomalous_orders: { id: number; user_id: number; amount: number; date: string; reason: string }[];
  anomalous_logs: { id: number; service: string; message: string; timestamp: string }[];
  total_anomalies: number;
}

interface ClusterData {
  clusters: { label: string; count: number; avg_spend: number; users: string[] }[];
}

interface RecommendationData {
  user: string;
  recommendations: { product_name: string; category: string; price: number; score: number }[];
}

interface InsightScenario {
  title: string;
  summary: string;
  drivers: string[];
  forecastData: ForecastData;
  anomalyData: AnomalyData;
  clusterData: ClusterData;
  recommendationData: RecommendationData;
}

interface InsightHover {
  title: string;
  value: string;
  detail: string;
  x: number;
  y: number;
  color: string;
}

interface InsightApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://127.0.0.1:8000";


const sampleQueries = [
  "Show me revenue by country",
  "Monthly revenue trend",
  "Top 10 customers by spend",
  "Returns by reason",
  "Products with low stock",
  "Payment failures by method",
];

const severityConfig: Record<Severity, { label: string; color: string; bg: string; icon: typeof AlertTriangle }> = {
  low:    { label: "LOW",    color: "text-emerald-400", bg: "bg-emerald-400/10 border-emerald-400/30", icon: CheckCircle  },
  medium: { label: "MEDIUM", color: "text-amber-400",   bg: "bg-amber-400/10 border-amber-400/30",   icon: AlertTriangle },
  high:   { label: "HIGH",   color: "text-red-400",     bg: "bg-red-400/10 border-red-400/30",       icon: Zap           },
};

// Static metrics data (charts that don't depend on query results)
const queryVolumeData = [
  { time: "00:00", queries: 1200, latency: 45 },
  { time: "04:00", queries: 800,  latency: 32 },
  { time: "08:00", queries: 3500, latency: 78 },
  { time: "12:00", queries: 5200, latency: 125 },
  { time: "16:00", queries: 4800, latency: 98 },
  { time: "20:00", queries: 3200, latency: 67 },
  { time: "24:00", queries: 1500, latency: 42 },
];

const defaultResourceData: ResourceMetric[] = [
  { name: "CPU",     value: 67, color: "#ec4899" },
  { name: "Memory",  value: 54, color: "#a855f7" },
  { name: "Storage", value: 38, color: "#f97316" },
  { name: "Network", value: 23, color: "#06b6d4" },
];

const errorRateData = [
  { time: "Mon", rate: 0.8 },
  { time: "Tue", rate: 1.2 },
  { time: "Wed", rate: 0.5 },
  { time: "Thu", rate: 2.1 },
  { time: "Fri", rate: 1.8 },
  { time: "Sat", rate: 0.3 },
  { time: "Sun", rate: 0.2 },
];

const demoForecastData: ForecastData = {
  historical: Array.from({ length: 24 }, (_, index) => {
    const month = index + 1;
    const year = month <= 12 ? 2023 : 2024;
    const monthInYear = ((month - 1) % 12) + 1;
    const seasonalBoost = monthInYear >= 10 ? 1.38 : monthInYear >= 7 ? 1.14 : 1;
    const trend = 42_000 + index * 2_850;
    return {
      date: `${year}-${String(monthInYear).padStart(2, "0")}-01`,
      revenue: Math.round((trend * seasonalBoost + Math.sin(index * 1.7) * 6200) * 100) / 100,
    };
  }),
  forecast: Array.from({ length: 12 }, (_, index) => {
    const predicted = 122_000 + index * 4_700 + Math.sin(index * 1.2) * 8_000;
    return {
      date: `2025-${String(index + 1).padStart(2, "0")}-01`,
      predicted: Math.round(predicted * 100) / 100,
      lower: Math.round((predicted * 0.86) * 100) / 100,
      upper: Math.round((predicted * 1.16) * 100) / 100,
    };
  }),
};

const demoAnomalyData: AnomalyData = {
  total_anomalies: 38,
  anomalous_orders: [
    { id: 4187, user_id: 92, amount: 12984.4, date: "2024-11-29", reason: "enterprise order 6.8x above median cart value" },
    { id: 3921, user_id: 311, amount: 8740.25, date: "2024-10-18", reason: "large Q4 purchase paired with refund history" },
    { id: 2215, user_id: 144, amount: 6380.99, date: "2024-06-02", reason: "quantity spike outside normal user behavior" },
    { id: 4772, user_id: 27, amount: 5944.75, date: "2024-12-12", reason: "payment and session pattern mismatch" },
    { id: 3510, user_id: 408, amount: 5108.2, date: "2024-09-21", reason: "rare product bundle combination" },
  ],
  anomalous_logs: [
    { id: 1881, service: "database", message: "pool exhausted during Q4 revenue dashboard refresh", timestamp: "2024-12-02 09:41:11" },
    { id: 1740, service: "payment", message: "gateway timeout after high-value checkout retry", timestamp: "2024-11-28 18:12:44" },
    { id: 1622, service: "cache", message: "cache miss storm on product recommendation endpoint", timestamp: "2024-10-19 11:02:09" },
    { id: 1395, service: "api", message: "response time exceeded anomaly threshold", timestamp: "2024-08-13 15:33:27" },
    { id: 1199, service: "auth", message: "token refresh failures clustered by region", timestamp: "2024-05-06 07:22:13" },
  ],
};

const demoClusterData: ClusterData = {
  clusters: [
    { label: "Champions", count: 88, avg_spend: 8420.5, users: ["Mason Baker", "Aarav Mehta", "Sophia Clark", "Olivia Rao", "Kenji Tanaka"] },
    { label: "At Risk", count: 126, avg_spend: 2310.75, users: ["Fatima Ali", "Lucas Weber", "Priya Nair", "Noah Wilson", "Mila Schmidt"] },
    { label: "New Users", count: 154, avg_spend: 780.2, users: ["Diya Patel", "Yuki Sato", "Omar Haddad", "Emma Davis", "Ishaan Rao"] },
    { label: "Hibernating", count: 132, avg_spend: 412.8, users: ["John Brown", "Lucia Garcia", "Rohan Singh", "Hana Suzuki", "Zoya Khan"] },
  ],
};

const demoRecommendationPools: RecommendationData[] = [
  {
    user: "Mason Baker",
    recommendations: [
      { product_name: "Analytics Pro", category: "SaaS", price: 249, score: 0.96 },
      { product_name: "4K Monitor", category: "Electronics", price: 389, score: 0.91 },
      { product_name: "Security Suite", category: "SaaS", price: 299, score: 0.87 },
      { product_name: "Data Strategy", category: "Books", price: 46, score: 0.78 },
      { product_name: "Workflow Cloud", category: "SaaS", price: 189, score: 0.74 },
    ],
  },
  {
    user: "Priya Nair",
    recommendations: [
      { product_name: "Wireless Earbuds", category: "Electronics", price: 89, score: 0.93 },
      { product_name: "Classic Hoodie", category: "Clothing", price: 64, score: 0.88 },
      { product_name: "Organic Coffee", category: "Food", price: 22, score: 0.81 },
      { product_name: "AI Operations", category: "Books", price: 52, score: 0.77 },
      { product_name: "Campaign Pilot", category: "SaaS", price: 99, score: 0.72 },
    ],
  },
  {
    user: "Kenji Tanaka",
    recommendations: [
      { product_name: "Portable SSD", category: "Electronics", price: 145, score: 0.95 },
      { product_name: "Cloud Patterns", category: "Books", price: 58, score: 0.9 },
      { product_name: "Support Desk", category: "SaaS", price: 129, score: 0.85 },
      { product_name: "Green Tea", category: "Food", price: 18, score: 0.79 },
      { product_name: "Team Wiki", category: "SaaS", price: 79, score: 0.71 },
    ],
  },
];

const insightQuestionPrompts = [
  "Forecast revenue risk for Q4 enterprise customers",
  "Find churn risk from sessions, refunds, and payment failures",
  "Show product categories with high revenue but weak ratings",
  "Where are operational anomalies hurting checkout conversion?",
];

// 3D bar colour palette (cycles for any result length)
const barColors = [
  { front: "#ec4899", side: "#be185d", top: "#f472b6", glow: "rgba(236, 72, 153, 0.6)" },
  { front: "#a855f7", side: "#7c3aed", top: "#c084fc", glow: "rgba(168, 85, 247, 0.6)" },
  { front: "#f97316", side: "#c2410c", top: "#fb923c", glow: "rgba(249, 115, 22, 0.6)"  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Safely extract a numeric value from a result row (defaults to index 1) */
function getRowValue(row: ResultRow, valueIndex = 1): number {
  const v = row[valueIndex];
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const parsed = parseFloat(v.replace(/[^0-9.-]/g, ""));
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

/** Safely extract a display label from a result row (index 0 = name column) */
function getRowLabel(row: ResultRow): string {
  return String(row[0] ?? "—");
}

/** Format a number for display — currency if large, plain otherwise */
function formatValue(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000)     return `$${v.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
  return `$${v.toFixed(2)}`;
}

function getNumericValue(value: string | number | undefined): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const parsed = parseFloat(value.replace(/[^0-9.-]/g, ""));
    return isNaN(parsed) ? null : parsed;
  }
  return null;
}

function getColumnLabel(columns: string[], index: number): string {
  return columns[index] ?? `Column ${index + 1}`;
}

function isCurrencyColumn(label: string): boolean {
  return /revenue|sales|amount|price|cost|refund|spend|value|aov/i.test(label);
}

function formatMetricValue(value: number, label: string): string {
  if (isCurrencyColumn(label)) return formatValue(value);
  if (/rate|percent|share|usage/i.test(label)) return `${value.toFixed(1)}%`;
  if (Math.abs(value) >= 1_000) {
    return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function formatResultCell(value: string | number, label: string): string {
  const numeric = getNumericValue(value);
  if (numeric !== null) return formatMetricValue(numeric, label);
  return String(value ?? "—");
}

function getChartValueIndex(rows: ResultRow[]): number {
  if (!rows.length) return -1;
  const maxColumns = Math.max(...rows.map((row) => row.length));

  for (let index = 1; index < maxColumns; index += 1) {
    const numericCount = rows.reduce((count, row) => {
      return count + (getNumericValue(row[index]) !== null ? 1 : 0);
    }, 0);

    if (numericCount >= Math.max(1, Math.ceil(rows.length * 0.6))) {
      return index;
    }
  }

  return -1;
}

function isDateLikeLabel(value: string | number | undefined): boolean {
  if (typeof value !== "string") return false;
  return /^\d{4}-\d{2}(-\d{2})?$/.test(value);
}

function shouldPreferTableView(rows: ResultRow[]): boolean {
  if (!rows.length) return true;
  if (rows.length > 24) return true;
  return rows.some((row) => row.length > 2);
}

function toCsvValue(value: string | number): string {
  const stringValue = String(value ?? "");
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, "\"\"")}"`;
  }
  return stringValue;
}

function getDisplayColumns(columns: string[], rows: ResultRow[]): string[] {
  if (columns.length) return columns;
  if (!rows.length) return [];
  return rows[0].map((_, index) => `Column ${index + 1}`);
}

function formatOrdinal(value: number): string {
  const remainder100 = value % 100;
  if (remainder100 >= 11 && remainder100 <= 13) return `${value}th`;
  const remainder10 = value % 10;
  if (remainder10 === 1) return `${value}st`;
  if (remainder10 === 2) return `${value}nd`;
  if (remainder10 === 3) return `${value}rd`;
  return `${value}th`;
}

function getRoundedAxisMax(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 1;

  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;

  let niceNormalized = 10;
  if (normalized <= 1) niceNormalized = 1;
  else if (normalized <= 2) niceNormalized = 2;
  else if (normalized <= 2.5) niceNormalized = 2.5;
  else if (normalized <= 5) niceNormalized = 5;

  return niceNormalized * magnitude;
}

function sumForecastValues(points: ForecastPoint[], key: "revenue" | "predicted"): number {
  return points.reduce((sum, point) => sum + Number(point[key] ?? 0), 0);
}

function getInsightPointValue(point: ForecastPoint): number {
  return Number(point.revenue ?? point.predicted ?? 0);
}

function buildLinePath(points: { x: number; y: number }[]): string {
  return points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
}

function formatCompactCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

function hashText(value: string): number {
  return value.split("").reduce((hash, char) => ((hash << 5) - hash + char.charCodeAt(0)) | 0, 0);
}

function scaleForecastData(base: ForecastData, multiplier: number, volatility: number): ForecastData {
  return {
    historical: base.historical.map((point, index) => {
      const wave = 1 + Math.sin(index * 1.45) * volatility;
      return { ...point, revenue: Math.round(Number(point.revenue ?? 0) * multiplier * wave) };
    }),
    forecast: base.forecast.map((point, index) => {
      const wave = 1 + Math.cos(index * 1.2) * volatility;
      const predicted = Math.round(Number(point.predicted ?? 0) * multiplier * wave);
      return { ...point, predicted, lower: Math.round(predicted * 0.84), upper: Math.round(predicted * 1.18) };
    }),
  };
}

function buildInsightScenario(question: string): InsightScenario {
  const safeQuestion = question.trim() || "revenue growth";
  const normalized = safeQuestion.toLowerCase();
  const seed = Math.abs(hashText(safeQuestion)) % 17;

  if (/churn|risk|retention|inactive|at risk/.test(normalized)) {
    return {
      title: "Retention Risk Intelligence",
      summary: `The model reads "${safeQuestion}" as a churn-risk scenario. It highlights shrinking sessions, refund behavior, and fewer repeat purchases rather than only looking at revenue.`,
      drivers: ["session duration down 18%", "refund touchpoints rising", "free-plan upgrades slowing", "support latency linked to churn"],
      forecastData: scaleForecastData(demoForecastData, 0.91 + seed * 0.004, 0.08),
      anomalyData: {
        total_anomalies: 46 + seed,
        anomalous_orders: [
          { id: 4912, user_id: 144, amount: 1820.4, date: "2024-12-08", reason: "high refund probability after 3 short sessions" },
          { id: 4766, user_id: 312, amount: 940.25, date: "2024-11-27", reason: "repeat buyer stopped after failed payment retry" },
          { id: 4551, user_id: 88, amount: 2160.8, date: "2024-11-04", reason: "enterprise account usage dropped below segment baseline" },
          ...demoAnomalyData.anomalous_orders.slice(0, 3),
        ],
        anomalous_logs: [
          { id: 2015, service: "auth", message: "login failures clustered among previously active pro users", timestamp: "2024-12-09 14:31:02" },
          { id: 1988, service: "api", message: "session completion rate fell after slow dashboard responses", timestamp: "2024-12-07 09:18:44" },
          { id: 1971, service: "payment", message: "card retry loop affecting renewal attempts", timestamp: "2024-12-03 19:42:10" },
          ...demoAnomalyData.anomalous_logs.slice(0, 3),
        ],
      },
      clusterData: {
        clusters: [
          { label: "Champions", count: 72, avg_spend: 8820.5, users: ["Mason Baker", "Sophia Clark", "Aarav Mehta", "Kenji Tanaka", "Olivia Rao"] },
          { label: "At Risk", count: 168, avg_spend: 2840.75, users: ["Priya Nair", "Lucas Weber", "Fatima Ali", "Noah Wilson", "Mila Schmidt"] },
          { label: "New Users", count: 141, avg_spend: 690.2, users: ["Diya Patel", "Yuki Sato", "Omar Haddad", "Emma Davis", "Ishaan Rao"] },
          { label: "Hibernating", count: 119, avg_spend: 388.8, users: ["John Brown", "Lucia Garcia", "Rohan Singh", "Hana Suzuki", "Zoya Khan"] },
        ],
      },
      recommendationData: demoRecommendationPools[1],
    };
  }

  if (/payment|checkout|gateway|fraud|failure|failed/.test(normalized)) {
    return {
      title: "Checkout Reliability Intelligence",
      summary: `The model reads "${safeQuestion}" as a payment and checkout health scenario. It separates genuine demand from failures caused by gateway latency, retry loops, and stale cache behavior.`,
      drivers: ["gateway p95 latency 1.9s", "refund anomalies concentrated in mobile", "retry success rate 63%", "cache misses affecting checkout"],
      forecastData: scaleForecastData(demoForecastData, 0.97 + seed * 0.003, 0.11),
      anomalyData: {
        total_anomalies: 58 + seed,
        anomalous_orders: [
          { id: 4992, user_id: 271, amount: 12840.1, date: "2024-12-18", reason: "high-value cart recovered after 4 gateway retries" },
          { id: 4860, user_id: 433, amount: 6240, date: "2024-12-02", reason: "duplicate authorization risk on payment callback" },
          { id: 4729, user_id: 119, amount: 3180.35, date: "2024-11-26", reason: "mobile checkout retry pattern outside normal range" },
          ...demoAnomalyData.anomalous_orders.slice(1, 4),
        ],
        anomalous_logs: [
          { id: 2031, service: "payment", message: "gateway timeout spike during checkout peak", timestamp: "2024-12-18 20:11:37" },
          { id: 2024, service: "cache", message: "pricing cache stale during payment confirmation", timestamp: "2024-12-18 20:09:12" },
          { id: 1997, service: "database", message: "order write lock held longer than anomaly threshold", timestamp: "2024-12-02 18:44:05" },
          ...demoAnomalyData.anomalous_logs.slice(1, 4),
        ],
      },
      clusterData: demoClusterData,
      recommendationData: demoRecommendationPools[0],
    };
  }

  if (/product|category|inventory|stock|rating|recommend/.test(normalized)) {
    return {
      title: "Product Portfolio Intelligence",
      summary: `The model reads "${safeQuestion}" as a product-mix scenario. It searches for categories that sell strongly but create hidden risk through low ratings, returns, or stock pressure.`,
      drivers: ["electronics demand up 22%", "SaaS margin strongest", "low-stock SKUs near reorder point", "returns concentrated in apparel"],
      forecastData: scaleForecastData(demoForecastData, 1.08 + seed * 0.005, 0.07),
      anomalyData: {
        total_anomalies: 34 + seed,
        anomalous_orders: [
          { id: 4881, user_id: 77, amount: 7480.9, date: "2024-12-11", reason: "bulk purchase from low-stock electronics category" },
          { id: 4519, user_id: 205, amount: 2840.25, date: "2024-10-29", reason: "high return likelihood for apparel bundle" },
          { id: 4390, user_id: 361, amount: 5120, date: "2024-10-03", reason: "SaaS upgrade bundle above normal product mix" },
          ...demoAnomalyData.anomalous_orders.slice(2, 5),
        ],
        anomalous_logs: [
          { id: 2009, service: "api", message: "product detail latency increased on best-selling SKUs", timestamp: "2024-12-11 12:10:18" },
          { id: 1966, service: "cache", message: "inventory cache mismatch for top electronics items", timestamp: "2024-11-30 16:28:51" },
          { id: 1904, service: "database", message: "stock update queue lagged behind purchase events", timestamp: "2024-10-03 10:03:22" },
          ...demoAnomalyData.anomalous_logs.slice(0, 2),
        ],
      },
      clusterData: {
        clusters: [
          { label: "Champions", count: 96, avg_spend: 9360.1, users: ["Aarav Mehta", "Mason Baker", "Olivia Rao", "Sophia Clark", "Kenji Tanaka"] },
          { label: "At Risk", count: 112, avg_spend: 2190.4, users: ["Fatima Ali", "Priya Nair", "Lucas Weber", "Mila Schmidt", "Noah Wilson"] },
          { label: "New Users", count: 173, avg_spend: 820.6, users: ["Diya Patel", "Emma Davis", "Omar Haddad", "Yuki Sato", "Ishaan Rao"] },
          { label: "Hibernating", count: 119, avg_spend: 402.1, users: ["Rohan Singh", "Hana Suzuki", "John Brown", "Lucia Garcia", "Zoya Khan"] },
        ],
      },
      recommendationData: demoRecommendationPools[2],
    };
  }

  return {
    title: "Revenue Growth Intelligence",
    summary: `The model reads "${safeQuestion}" as a revenue and demand forecast. It compares historical seasonality, Q4 lift, customer segments, and operational anomalies before projecting the next period.`,
    drivers: ["Q4 revenue lift detected", "enterprise plan mix improving", "repeat orders rising", "forecast confidence band tightening"],
    forecastData: scaleForecastData(demoForecastData, 1.02 + seed * 0.004, 0.06),
    anomalyData: demoAnomalyData,
    clusterData: demoClusterData,
    recommendationData: demoRecommendationPools[0],
  };
}

const defaultInsightScenario = buildInsightScenario(insightQuestionPrompts[0]);

// ─── Component ────────────────────────────────────────────────────────────────
export function DashboardSection() {
  const [activeMainTab, setActiveMainTab] = useState<"queryforge" | "infrasage" | "metrics" | "insights">("queryforge");
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  // QueryForge state
  const [query, setQuery]               = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [showResults, setShowResults]   = useState(false);
  const [activeTab, setActiveTab]       = useState<"sql" | "results" | "chart">("chart");
  const [sql, setSql]                   = useState<string>("");
  const [resultColumns, setResultColumns] = useState<string[]>([]);
  const [results, setResults]           = useState<ResultRow[]>([]);
  const [queryHistory, setQueryHistory] = useState<string[]>([]);
  const [queryIntelligence, setQueryIntelligence] = useState<QueryIntelligence | null>(null);
  const [currentReport, setCurrentReport] = useState<QueryReport | null>(null);
  const [savedReports, setSavedReports] = useState<SavedReport[]>([]);
  const [queryError, setQueryError]     = useState<string | null>(null);
  const [hoveredBar, setHoveredBar]     = useState<number | null>(null);
  const [inputFocused, setInputFocused] = useState(false);

  // InfraSage state
  const [logs, setLogs]                   = useState("");
  const [isAnalyzing, setIsAnalyzing]     = useState(false);
  const [showAnalysis, setShowAnalysis]   = useState(false);
  const [logAnalysis, setLogAnalysis]     = useState<LogAnalysis | null>(null);
  const [logError, setLogError]           = useState<string | null>(null);
  const [logInputFocused, setLogInputFocused] = useState(false);

  // Metrics state
  const [hoveredMetric, setHoveredMetric]         = useState<{ type: string; value: string; label?: string; x: number; y: number } | null>(null);
  const [hoveredPieSegment, setHoveredPieSegment] = useState<number | null>(null);
  const [resourceData, setResourceData]           = useState<ResourceMetric[]>(defaultResourceData);
  const [modelStatus, setModelStatus]             = useState<ModelStatus | null>(null);
  const [qualityScan, setQualityScan]             = useState<QualityResponse | null>(null);
  const [isScanningQuality, setIsScanningQuality] = useState(false);

  // Insights state
  const [forecastData, setForecastData] = useState<ForecastData | null>(defaultInsightScenario.forecastData);
  const [anomalyData, setAnomalyData] = useState<AnomalyData | null>(defaultInsightScenario.anomalyData);
  const [clusterData, setClusterData] = useState<ClusterData | null>(defaultInsightScenario.clusterData);
  const [recommendationData, setRecommendationData] = useState<RecommendationData | null>(defaultInsightScenario.recommendationData);
  const [recommendUserId, setRecommendUserId] = useState("1");
  const [insightQuestion, setInsightQuestion] = useState(insightQuestionPrompts[0]);
  const [activeInsightScenario, setActiveInsightScenario] = useState<InsightScenario>(defaultInsightScenario);
  const [hoveredInsight, setHoveredInsight] = useState<InsightHover | null>(null);
  const [insightsError, setInsightsError] = useState<string | null>(null);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);

  // ── Intersection observer ──────────────────────────────────────────────────
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setIsVisible(true); },
      { threshold: 0.1 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let isCancelled = false;

    const loadResourceMetrics = async () => {
      try {
        const res = await fetch("/api/metrics/resources", { cache: "no-store" });
        const json: ResourceResponse = await res.json();

        if (!res.ok || !json.success || !json.data?.length || isCancelled) {
          return;
        }

        setResourceData(json.data);
      } catch {
        // Keep the last known values on screen if live metrics fail temporarily.
      }
    };

    loadResourceMetrics();
    const intervalId = window.setInterval(loadResourceMetrics, 15000);

    return () => {
      isCancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    if (activeMainTab !== "insights" || forecastData || isLoadingInsights) return;

    setForecastData(demoForecastData);
    setAnomalyData(demoAnomalyData);
    setClusterData(demoClusterData);
    setInsightsError(null);
  }, [activeMainTab, forecastData, isLoadingInsights]);

  useEffect(() => {
    let isCancelled = false;

    const loadModelStatus = async () => {
      try {
        const res = await fetch(`${API_BASE}/model/status`, { cache: "no-store" });
        const json: ModelStatus = await res.json();
        if (!isCancelled) setModelStatus(json);
      } catch {
        if (!isCancelled) {
          setModelStatus({ success: false, error: `Backend unavailable at ${API_BASE}` });
        }
      }
    };

    loadModelStatus();
    return () => {
      isCancelled = true;
    };
  }, []);

  const saveQueryHistory = (value: string) => {
    const nextHistory = [value, ...queryHistory.filter((item) => item !== value)].slice(0, 6);
    setQueryHistory(nextHistory);
  };

  const exportResultsAsCsv = () => {
    if (!results.length) return;

    const headers = resultColumns.length
      ? resultColumns
      : results[0].map((_, index) => `Column ${index + 1}`);
    const lines = [
      headers.map(toCsvValue).join(","),
      ...results.map((row) => row.map((cell) => toCsvValue(cell)).join(",")),
    ];

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    const safeName = (query.trim() || "queryforge-results")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    anchor.href = url;
    anchor.download = `${safeName || "queryforge-results"}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveReport = () => {
    if (!currentReport || !sql) return;

    const report: SavedReport = {
      ...currentReport,
      question: query.trim(),
      sql,
      insights: queryIntelligence?.insights ?? [],
      savedAt: new Date().toLocaleString(),
    };

    setSavedReports((existing) => [report, ...existing.filter((item) => item.sql !== sql)].slice(0, 5));
  };

  const handleRunQualityScan = async () => {
    setIsScanningQuality(true);
    setQualityScan(null);

    try {
      const res = await fetch(`${API_BASE}/database/quality`, { cache: "no-store" });
      const json: QualityResponse = await res.json();
      setQualityScan(json);
    } catch (err) {
      setQualityScan({
        success: false,
        error: err instanceof Error ? err.message : `Could not reach ${API_BASE}`,
      });
    } finally {
      setIsScanningQuality(false);
    }
  };

  const handleAnalyzeInsightScenario = () => {
    const scenario = buildInsightScenario(insightQuestion);
    setActiveInsightScenario(scenario);
    setForecastData(scenario.forecastData);
    setAnomalyData(scenario.anomalyData);
    setClusterData(scenario.clusterData);
    setRecommendationData(scenario.recommendationData);
    setInsightsError(null);
    setHoveredInsight(null);
  };

  const handleGetRecommendations = async () => {
    const id = Number.parseInt(recommendUserId, 10);
    if (!Number.isFinite(id) || id <= 0) {
      setInsightsError("Enter a valid user id.");
      return;
    }

    setIsLoadingRecommendations(true);
    setInsightsError(null);
    window.setTimeout(() => {
      const pool = demoRecommendationPools[(id - 1) % demoRecommendationPools.length];
      setRecommendationData({
        user: `${pool.user} · demo user ${id}`,
        recommendations: pool.recommendations.map((item, index) => ({
          ...item,
          score: Math.max(0.62, Math.min(0.98, item.score - ((id + index) % 5) * 0.015)),
        })),
      });
      setIsLoadingRecommendations(false);
    }, 350);
  };

  const handleClearQueryForge = () => {
    setQuery("");
    setSql("");
    setResultColumns([]);
    setResults([]);
    setQueryIntelligence(null);
    setCurrentReport(null);
    setQueryIntelligence(null);
    setCurrentReport(null);
    setQueryError(null);
    setShowResults(false);
    setHoveredBar(null);
    setActiveTab("chart");
  };

  const handleClearInfraSage = () => {
    setLogs("");
    setLogError(null);
    setLogAnalysis(null);
    setShowAnalysis(false);
  };

  useEffect(() => {
    if (activeMainTab !== "infrasage") {
      handleClearInfraSage();
    }
  }, [activeMainTab]);

  // ── API: Generate SQL ──────────────────────────────────────────────────────
  const handleGenerate = async () => {
    const q = query.trim();
    if (!q) return;

    setIsGenerating(true);
    setShowResults(false);
    setQueryError(null);
    setSql("");
    setResultColumns([]);
    setResults([]);

    try {
      const res = await fetch(`${API_BASE}/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: q }),
      });

      const rawText = await res.text();
      let json: QueryResponse | null = null;

      try {
        json = JSON.parse(rawText) as QueryResponse;
      } catch {
        throw new Error(rawText || `Backend returned HTTP ${res.status}`);
      }

      if (!res.ok || !json.success) {
        const message = json?.error ?? `Backend returned HTTP ${res.status}`;
        setQueryError(
          /unsafe sql/i.test(message)
            ? "That request was blocked for safety. Try rephrasing it as a read-only analytics question."
            : /only select/i.test(message)
              ? "QueryForge can only run read-only SELECT queries."
              : message
        );
        return;
      }

      setSql(json.sql ?? "");
      setResultColumns(json.columns ?? []);
      setResults(json.data ?? []);
      setQueryIntelligence(json.intelligence ?? null);
      setCurrentReport(json.report ?? null);
      setShowResults(true);
      saveQueryHistory(q);

      const nextResults = json.data ?? [];
      const nextColumns = json.columns ?? [];
      const nextChartIndex = getChartValueIndex(nextResults);
      const preferTable = shouldPreferTableView(nextResults);
      const preferChart = nextChartIndex > 0 && !preferTable && !isDateLikeLabel(nextResults[0]?.[0]);
      setActiveTab(preferChart ? "chart" : "results");

    } catch (err) {
      setQueryError(
        err instanceof Error
          ? err.message
          : `Could not reach the backend at ${API_BASE}. Is FastAPI running?`
      );
    } finally {
      setIsGenerating(false);
    }
  };

  // ── API: Analyze Logs ──────────────────────────────────────────────────────
  const handleAnalyze = async () => {
  const trimmedLogs = logs.trim();
  if (!trimmedLogs) return;

  setIsAnalyzing(true);
  setShowAnalysis(false);
  setLogError(null);
  setLogAnalysis(null);

  try {
    const res = await fetch(`${API_BASE}/logs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ logs: trimmedLogs }),
    });

    const rawText = await res.text();
    let json: LogResponse | null = null;

    try {
      json = JSON.parse(rawText) as LogResponse;
    } catch {
      throw new Error(rawText || `Backend returned HTTP ${res.status}`);
    }

    if (!res.ok || !json.success || !json.analysis) {
      setLogError(json?.error ?? `Backend returned HTTP ${res.status}`);
      return;
    }

    setLogAnalysis({
      issues: Array.isArray(json.analysis.issues) ? json.analysis.issues.slice(0, 3) : [],
      suggested_fixes: Array.isArray(json.analysis.suggested_fixes) ? json.analysis.suggested_fixes : [],
      severity: json.analysis.severity,
      affected_service: json.analysis.affected_service,
      root_cause: json.analysis.root_cause,
      timeline: Array.isArray(json.analysis.timeline) ? json.analysis.timeline : [],
    });
    setShowAnalysis(true);
  } catch (err) {
    setLogError(
      err instanceof Error
        ? err.message
        : `Could not reach the backend at ${API_BASE}. Is FastAPI running?`
    );
  } finally {
    setIsAnalyzing(false);
  }
};


  // ── Chart helpers ──────────────────────────────────────────────────────────
  const chartValueIndex = getChartValueIndex(results);
  const chartRows = chartValueIndex > 0
    ? results.filter((row) => getNumericValue(row[chartValueIndex]) !== null)
    : [];
  const isChartable = chartRows.length > 0;
  const tableColumns = getDisplayColumns(resultColumns, results);
  const chartMetricLabel = getColumnLabel(resultColumns, chartValueIndex > -1 ? chartValueIndex : 1);
  const chartLabelColumn = getColumnLabel(resultColumns, 0);

  const rawMaxResultValue = chartRows.length
    ? Math.max(...chartRows.map((row) => getRowValue(row, chartValueIndex)), 1)
    : 1;
  const maxResultValue = getRoundedAxisMax(rawMaxResultValue);

  const getBarHeight = (row: ResultRow) => {
    const v = getRowValue(row, chartValueIndex);
    return Math.max((v / maxResultValue) * 420, 4); // minimum 4 px so bars are always visible
  };

  const totalValue   = chartRows.reduce((sum, r) => sum + getRowValue(r, chartValueIndex), 0);
  const averageChartValue = chartRows.length ? totalValue / chartRows.length : 0;
  const chartMinWidth = Math.max(results.length * 72, 720);
  const chartOffsetClass = "ml-24";

  // severity is always high for log analysis
  const severity     = severityConfig[logAnalysis?.severity ?? "high"];
  const SeverityIcon = severity.icon;

  const historicalRevenue = forecastData?.historical ?? [];
  const forecastRevenue = forecastData?.forecast ?? [];
  const combinedForecast = [...historicalRevenue, ...forecastRevenue];
  const forecastMax = Math.max(...combinedForecast.map((point) => Math.max(getInsightPointValue(point), Number(point.upper ?? 0))), 1);
  const totalHistoricalRevenue = sumForecastValues(historicalRevenue, "revenue");
  const predictedRevenue = sumForecastValues(forecastRevenue, "predicted");
  const lastHistoricalWindow = historicalRevenue.slice(-90);
  const lastHistoricalRevenue = sumForecastValues(lastHistoricalWindow, "revenue") || 1;
  const forecastGrowth = ((predictedRevenue - lastHistoricalRevenue) / lastHistoricalRevenue) * 100;
  const chartWidth = 760;
  const chartHeight = 260;
  const allPointsCount = Math.max(combinedForecast.length - 1, 1);
  const historicalPoints = historicalRevenue.map((point, index) => ({
    x: (index / allPointsCount) * chartWidth,
    y: chartHeight - (Number(point.revenue ?? 0) / forecastMax) * chartHeight,
  }));
  const forecastOffset = Math.max(historicalRevenue.length - 1, 0);
  const forecastPoints = forecastRevenue.map((point, index) => ({
    x: ((forecastOffset + index) / allPointsCount) * chartWidth,
    y: chartHeight - (Number(point.predicted ?? 0) / forecastMax) * chartHeight,
  }));
  const upperBandPoints = forecastRevenue.map((point, index) => ({
    x: ((forecastOffset + index) / allPointsCount) * chartWidth,
    y: chartHeight - (Number(point.upper ?? point.predicted ?? 0) / forecastMax) * chartHeight,
  }));
  const lowerBandPoints = forecastRevenue.map((point, index) => ({
    x: ((forecastOffset + index) / allPointsCount) * chartWidth,
    y: chartHeight - (Number(point.lower ?? point.predicted ?? 0) / forecastMax) * chartHeight,
  })).reverse();
  const confidenceBandPath = [...upperBandPoints, ...lowerBandPoints].map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ") + " Z";

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <section
      id="dashboard"
      ref={sectionRef}
      className="relative py-40 lg:py-52 overflow-hidden"
    >
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/4 w-[700px] h-[700px] rounded-full bg-pink-500/8 blur-[180px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full bg-purple-500/8 blur-[150px] pointer-events-none" />
      <div className="absolute top-1/2 right-1/3 w-[400px] h-[400px] rounded-full bg-cyan-500/8 blur-[120px] pointer-events-none" />

      <div className="relative z-10 max-w-[1600px] mx-auto px-6 lg:px-16">

        {/* ── Header ── */}
        <div className="mb-16">
          <span className={`inline-flex items-center gap-3 text-sm font-mono text-muted-foreground mb-10 transition-all duration-700 ${isVisible ? "opacity-100" : "opacity-0"}`}>
            <span className="w-16 h-px bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500" />
            Data Sage Intelligence Suite
          </span>

          <h2 className={`text-6xl md:text-7xl lg:text-[96px] font-display tracking-tight leading-[0.9] transition-all duration-1000 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
            Your data,
            <br />
            <span className="bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 bg-clip-text text-transparent">visualized.</span>
          </h2>
        </div>

        {/* ── Main Tab Nav ── */}
        <div className={`flex flex-wrap gap-3 mb-12 transition-all duration-1000 delay-100 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          {[
            { id: "queryforge" as const, label: "QueryForge", icon: Database,  desc: "SQL Intelligence Engine", gradient: "from-pink-500 to-purple-500"  },
            { id: "infrasage"  as const, label: "InfraSage",  icon: Terminal,  desc: "Log Analysis Engine",     gradient: "from-blue-500 to-cyan-500"    },
            { id: "metrics"    as const, label: "Metrics",    icon: Activity,  desc: "Real-time Analytics",     gradient: "from-purple-500 to-pink-500"  },
            { id: "insights"   as const, label: "Insights",   icon: Brain,     desc: "ML Intelligence Layer",   gradient: "from-cyan-500 to-pink-500"    },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveMainTab(tab.id)}
              className={`group relative flex items-center gap-4 px-8 py-5 rounded-2xl border transition-all duration-500 ${
                activeMainTab === tab.id
                  ? "border-transparent text-foreground"
                  : "bg-foreground/[0.02] border-foreground/10 text-muted-foreground hover:border-foreground/20 hover:bg-foreground/[0.04]"
              }`}
              style={{
                background: activeMainTab === tab.id ? "linear-gradient(135deg, rgba(236,72,153,0.15), rgba(168,85,247,0.15))" : undefined,
                boxShadow:  activeMainTab === tab.id ? "0 0 40px rgba(168,85,247,0.2), inset 0 0 60px rgba(236,72,153,0.05)" : undefined,
              }}
            >
              {activeMainTab === tab.id && (
                <div className="absolute inset-0 rounded-2xl opacity-20" style={{
                  background: `linear-gradient(135deg, ${tab.id === "infrasage" ? "rgba(59,130,246,0.3), rgba(6,182,212,0.3)" : "rgba(236,72,153,0.3), rgba(168,85,247,0.3)"})`,
                }} />
              )}
              <div className={`relative w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 ${activeMainTab === tab.id ? `bg-gradient-to-br ${tab.gradient}` : "bg-foreground/10 group-hover:bg-foreground/15"}`}>
                <tab.icon className={`w-6 h-6 ${activeMainTab === tab.id ? "text-white" : "text-muted-foreground"}`} />
              </div>
              <div className="relative text-left">
                <span className="block text-lg font-semibold tracking-tight">{tab.label}</span>
                <span className="text-sm opacity-60">{tab.desc}</span>
              </div>
            </button>
          ))}
        </div>

        {/* ── Tab Content ── */}
        <div className={`transition-all duration-1000 delay-200 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"}`}>

          {/* INSIGHTS TAB */}
          {activeMainTab === "insights" && (
            <div className="animate-in fade-in duration-500 space-y-8">
              {insightsError && (
                <div className="px-6 py-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                  {insightsError}
                </div>
              )}

              <div className="rounded-3xl p-[2px]" style={{ background: "linear-gradient(135deg, rgba(6,182,212,0.45), rgba(236,72,153,0.45), rgba(168,85,247,0.45))", boxShadow: "0 0 55px rgba(6,182,212,0.12)" }}>
                <div className="bg-background/95 backdrop-blur-xl rounded-[22px] p-8">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 via-pink-500 to-purple-500 flex items-center justify-center" style={{ boxShadow: "0 0 25px rgba(6,182,212,0.35)" }}>
                      <Sparkles className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-display font-bold">Ask The Insight Layer</h3>
                      <p className="text-sm text-muted-foreground">Demo intelligence changes its forecast, anomalies, segments, and recommendations from your question.</p>
                    </div>
                  </div>
                  <div className="relative rounded-2xl p-[1px]" style={{ background: "linear-gradient(135deg, rgba(236,72,153,0.45), rgba(168,85,247,0.45), rgba(6,182,212,0.45))" }}>
                    <div className="relative bg-background/80 backdrop-blur-xl rounded-[15px] overflow-hidden">
                      <div className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground/50">
                        <Search className="w-5 h-5" />
                      </div>
                      <input
                        value={insightQuestion}
                        onChange={(e) => setInsightQuestion(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") handleAnalyzeInsightScenario(); }}
                        placeholder="Ask about revenue, churn risk, product mix, checkout failures..."
                        className="w-full bg-transparent pl-14 pr-48 py-5 text-lg placeholder:text-muted-foreground/40 focus:outline-none"
                      />
                      <button
                        onClick={handleAnalyzeInsightScenario}
                        className="absolute right-3 top-1/2 -translate-y-1/2 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 via-pink-500 to-purple-500 bg-[length:250%_250%] animate-[gradientShift_3s_linear_infinite] text-white font-semibold hover:opacity-90 transition-all"
                      >
                        Analyze
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3 mt-5">
                    {insightQuestionPrompts.map((prompt) => (
                      <button
                        key={prompt}
                        onClick={() => {
                          setInsightQuestion(prompt);
                          const scenario = buildInsightScenario(prompt);
                          setActiveInsightScenario(scenario);
                          setForecastData(scenario.forecastData);
                          setAnomalyData(scenario.anomalyData);
                          setClusterData(scenario.clusterData);
                          setRecommendationData(scenario.recommendationData);
                          setInsightsError(null);
                        }}
                        className="px-4 py-2 rounded-xl bg-foreground/[0.03] border border-foreground/10 text-sm text-muted-foreground hover:text-foreground hover:border-cyan-400/40 hover:bg-cyan-400/5 transition-all"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-3xl p-[2px]" style={{ background: "linear-gradient(135deg, rgba(236,72,153,0.5), rgba(168,85,247,0.45), rgba(6,182,212,0.45))", boxShadow: "0 0 60px rgba(236,72,153,0.16)" }}>
                <div className="bg-background/95 backdrop-blur-xl rounded-[22px] p-8">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 via-purple-500 to-cyan-500 flex items-center justify-center" style={{ boxShadow: "0 0 25px rgba(236,72,153,0.4)" }}>
                        <Brain className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-display font-bold">{activeInsightScenario.title}</h3>
                        <p className="text-sm text-muted-foreground">{activeInsightScenario.summary}</p>
                      </div>
                    </div>
                    {isLoadingInsights && <span className="text-sm text-muted-foreground">Loading ML insights...</span>}
                  </div>
                  <div className="flex flex-wrap gap-3 mb-7">
                    {activeInsightScenario.drivers.map((driver) => (
                      <span key={driver} className="px-4 py-2 rounded-full bg-foreground/[0.035] border border-foreground/10 text-xs font-mono text-cyan-200/80">
                        {driver}
                      </span>
                    ))}
                  </div>
                  <div className="relative h-[340px] rounded-2xl p-6 overflow-hidden" style={{ background: "linear-gradient(180deg, rgba(236,72,153,0.04), transparent)" }}>
                    <div className="absolute left-4 top-6 bottom-20 flex flex-col justify-between text-xs text-muted-foreground font-mono">
                      <span>{formatCompactCurrency(forecastMax)}</span>
                      <span>{formatCompactCurrency(forecastMax * 0.75)}</span>
                      <span>{formatCompactCurrency(forecastMax * 0.5)}</span>
                      <span>{formatCompactCurrency(forecastMax * 0.25)}</span>
                      <span>$0</span>
                    </div>
                    <svg className="w-full h-[260px] pl-16" viewBox={`0 0 ${chartWidth} ${chartHeight}`} preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="forecastBand" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#a855f7" stopOpacity="0.25" /><stop offset="100%" stopColor="#06b6d4" stopOpacity="0.02" /></linearGradient>
                        <filter id="insightGlow"><feGaussianBlur stdDeviation="1.4" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
                      </defs>
                      {[0,1,2,3,4].map((line) => <line key={line} x1="0" y1={(line / 4) * chartHeight} x2={chartWidth} y2={(line / 4) * chartHeight} stroke="currentColor" strokeOpacity="0.1" />)}
                      {forecastRevenue.length > 0 && <path d={confidenceBandPath} fill="url(#forecastBand)" />}
                      {historicalPoints.length > 1 && <path d={buildLinePath(historicalPoints)} fill="none" stroke="#ec4899" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />}
                      {forecastPoints.length > 1 && <path d={buildLinePath(forecastPoints)} fill="none" stroke="#a855f7" strokeWidth="3" strokeDasharray="10,8" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />}
                      {historicalPoints.map((point, index) => (
                        <circle
                          key={`historical-${historicalRevenue[index]?.date ?? index}`}
                          cx={point.x}
                          cy={point.y}
                          r={index % 3 === 0 || index === historicalPoints.length - 1 ? 6 : 4}
                          fill="#ec4899"
                          fillOpacity={index % 3 === 0 || index === historicalPoints.length - 1 ? 0.95 : 0.2}
                          className="cursor-pointer"
                          onMouseEnter={(e) => setHoveredInsight({
                            title: historicalRevenue[index]?.date ?? "Historical",
                            value: formatCompactCurrency(Number(historicalRevenue[index]?.revenue ?? 0)),
                            detail: "Actual historical revenue used by the scenario forecast.",
                            x: e.clientX,
                            y: e.clientY,
                            color: "#ec4899",
                          })}
                          onMouseLeave={() => setHoveredInsight(null)}
                        />
                      ))}
                      {forecastPoints.map((point, index) => (
                        <circle
                          key={`forecast-${forecastRevenue[index]?.date ?? index}`}
                          cx={point.x}
                          cy={point.y}
                          r={7}
                          fill="#a855f7"
                          className="cursor-pointer"
                          filter="url(#insightGlow)"
                          onMouseEnter={(e) => setHoveredInsight({
                            title: forecastRevenue[index]?.date ?? "Forecast",
                            value: formatCompactCurrency(Number(forecastRevenue[index]?.predicted ?? 0)),
                            detail: `Confidence range ${formatCompactCurrency(Number(forecastRevenue[index]?.lower ?? 0))} to ${formatCompactCurrency(Number(forecastRevenue[index]?.upper ?? 0))}.`,
                            x: e.clientX,
                            y: e.clientY,
                            color: "#a855f7",
                          })}
                          onMouseLeave={() => setHoveredInsight(null)}
                        />
                      ))}
                    </svg>
                    <div className="flex justify-between text-xs text-muted-foreground font-mono mt-4 ml-16">
                      <span>{historicalRevenue[0]?.date ?? "history"}</span><span className="text-pink-300">Historical</span><span className="text-purple-300">Forecast</span><span>{forecastRevenue[forecastRevenue.length - 1]?.date ?? "next 90 days"}</span>
                    </div>
                  </div>
                  <div className="grid md:grid-cols-3 gap-5 mt-8">
                    {[{ label: "Total Historical Revenue", value: formatCompactCurrency(totalHistoricalRevenue), color: "pink" }, { label: "Predicted Next 90 Days", value: formatCompactCurrency(predictedRevenue), color: "purple" }, { label: "Growth vs Last 90 Days", value: `${forecastGrowth.toFixed(1)}%`, color: "cyan" }].map((metric) => (
                      <div key={metric.label} className="rounded-2xl p-5 border border-foreground/10 bg-foreground/[0.025]">
                        <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">{metric.label}</p>
                        <p className={`text-3xl font-display font-bold mt-3 ${metric.color === "pink" ? "text-pink-400" : metric.color === "purple" ? "text-purple-400" : "text-cyan-400"}`}>{metric.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid lg:grid-cols-2 gap-8">
                <div className="rounded-3xl p-[2px]" style={{ background: "linear-gradient(135deg, rgba(239,68,68,0.45), rgba(236,72,153,0.35))" }}>
                  <div className="bg-background/95 backdrop-blur-xl rounded-[22px] p-8">
                    <div className="flex items-center justify-between mb-6"><h3 className="text-xl font-display font-bold">Anomalous Orders</h3><span className="px-4 py-2 rounded-full bg-red-500/10 border border-red-500/30 text-red-300 text-sm font-mono">{anomalyData?.total_anomalies ?? 0} total</span></div>
                    <div className="overflow-x-auto rounded-2xl border border-red-500/15"><table className="w-full text-sm"><thead><tr className="bg-red-500/5"><th className="text-left p-4">ID</th><th className="text-left p-4">Amount</th><th className="text-left p-4">Date</th><th className="text-left p-4">Reason</th></tr></thead><tbody>{(anomalyData?.anomalous_orders ?? []).slice(0, 8).map((order) => <tr key={order.id} className="border-t border-red-500/10 bg-red-500/[0.03] cursor-pointer hover:bg-red-500/[0.08] transition-colors" onMouseEnter={(e) => setHoveredInsight({ title: `Order #${order.id}`, value: formatValue(order.amount), detail: order.reason, x: e.clientX, y: e.clientY, color: "#ef4444" })} onMouseLeave={() => setHoveredInsight(null)}><td className="p-4 font-mono">{order.id}</td><td className="p-4 text-red-300 font-mono">{formatValue(order.amount)}</td><td className="p-4">{order.date}</td><td className="p-4 text-muted-foreground">{order.reason}</td></tr>)}</tbody></table></div>
                  </div>
                </div>
                <div className="rounded-3xl p-[2px]" style={{ background: "linear-gradient(135deg, rgba(239,68,68,0.35), rgba(6,182,212,0.35))" }}>
                  <div className="bg-background/95 backdrop-blur-xl rounded-[22px] p-8">
                    <h3 className="text-xl font-display font-bold mb-6">Anomalous Logs</h3>
                    <div className="overflow-x-auto rounded-2xl border border-red-500/15"><table className="w-full text-sm"><thead><tr className="bg-red-500/5"><th className="text-left p-4">Service</th><th className="text-left p-4">Message</th><th className="text-left p-4">Time</th></tr></thead><tbody>{(anomalyData?.anomalous_logs ?? []).slice(0, 8).map((log) => <tr key={log.id} className="border-t border-red-500/10 bg-red-500/[0.03] cursor-pointer hover:bg-red-500/[0.08] transition-colors" onMouseEnter={(e) => setHoveredInsight({ title: `${log.service} anomaly`, value: log.timestamp, detail: log.message, x: e.clientX, y: e.clientY, color: "#06b6d4" })} onMouseLeave={() => setHoveredInsight(null)}><td className="p-4 text-cyan-300 font-mono">{log.service}</td><td className="p-4">{log.message}</td><td className="p-4 text-muted-foreground whitespace-nowrap">{log.timestamp}</td></tr>)}</tbody></table></div>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl p-[2px]" style={{ background: "linear-gradient(135deg, rgba(168,85,247,0.45), rgba(6,182,212,0.35))" }}>
                <div className="bg-background/95 backdrop-blur-xl rounded-[22px] p-8">
                  <h3 className="text-xl font-display font-bold mb-6">User Segments</h3>
                  <div className="grid md:grid-cols-2 gap-6">{(clusterData?.clusters ?? []).map((cluster, index) => <div key={cluster.label} className="rounded-2xl p-6 border border-foreground/10 cursor-pointer hover:scale-[1.01] transition-all" style={{ background: ["linear-gradient(135deg, rgba(236,72,153,0.12), transparent)", "linear-gradient(135deg, rgba(249,115,22,0.12), transparent)", "linear-gradient(135deg, rgba(6,182,212,0.12), transparent)", "linear-gradient(135deg, rgba(168,85,247,0.12), transparent)"][index % 4] }} onMouseEnter={(e) => setHoveredInsight({ title: cluster.label, value: `${cluster.count} users`, detail: `Average spend ${formatValue(cluster.avg_spend)}. Top users: ${cluster.users.join(", ")}.`, x: e.clientX, y: e.clientY, color: ["#ec4899", "#f97316", "#06b6d4", "#a855f7"][index % 4] })} onMouseLeave={() => setHoveredInsight(null)}><div className="flex items-center justify-between"><h4 className="text-lg font-semibold">{cluster.label}</h4><span className="text-sm text-muted-foreground">{cluster.count} users</span></div><p className="text-3xl font-display font-bold text-pink-300 mt-4">{formatValue(cluster.avg_spend)}</p><p className="text-xs font-mono text-muted-foreground mt-1">average spend</p><div className="mt-5 flex flex-wrap gap-2">{cluster.users.map((user) => <span key={user} className="px-3 py-1 rounded-full bg-foreground/[0.04] border border-foreground/10 text-xs">{user}</span>)}</div></div>)}</div>
                </div>
              </div>

              <div className="rounded-3xl p-[2px]" style={{ background: "linear-gradient(135deg, rgba(236,72,153,0.45), rgba(168,85,247,0.45), rgba(6,182,212,0.35))" }}>
                <div className="bg-background/95 backdrop-blur-xl rounded-[22px] p-8">
                  <h3 className="text-xl font-display font-bold mb-6">Product Recommendations</h3>
                  <div className="flex flex-col md:flex-row gap-4 mb-6"><input value={recommendUserId} onChange={(e) => setRecommendUserId(e.target.value)} placeholder="User ID" className="flex-1 rounded-2xl border border-pink-500/20 bg-background/60 px-5 py-4 font-mono focus:outline-none focus:border-pink-500/60" /><button onClick={handleGetRecommendations} disabled={isLoadingRecommendations} className="px-8 py-4 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-500 bg-[length:250%_250%] animate-[gradientShift_3s_linear_infinite] text-white font-semibold disabled:opacity-60">{isLoadingRecommendations ? "Finding..." : "Get Recommendations"}</button></div>
                  {recommendationData && <p className="text-sm text-muted-foreground mb-5">Recommended for <span className="text-foreground font-semibold">{recommendationData.user}</span></p>}
                  <div className="grid md:grid-cols-5 gap-4">{(recommendationData?.recommendations ?? []).map((product) => <div key={product.product_name} className="rounded-2xl border border-pink-500/15 bg-pink-500/[0.04] p-5 cursor-pointer hover:scale-[1.02] hover:border-cyan-400/30 transition-all" onMouseEnter={(e) => setHoveredInsight({ title: product.product_name, value: `${(product.score * 100).toFixed(0)}% match`, detail: `${product.category} recommendation priced at ${formatValue(product.price)} for ${recommendationData?.user ?? "selected user"}.`, x: e.clientX, y: e.clientY, color: "#06b6d4" })} onMouseLeave={() => setHoveredInsight(null)}><span className="text-xs px-3 py-1 rounded-full bg-cyan-400/10 text-cyan-300 border border-cyan-400/20">{product.category}</span><h4 className="text-base font-semibold mt-4">{product.product_name}</h4><p className="text-pink-300 font-mono mt-2">{formatValue(product.price)}</p><div className="mt-4 h-2 rounded-full bg-foreground/10 overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-pink-500 to-cyan-500" style={{ width: `${Math.max(8, Math.min(100, product.score * 100))}%` }} /></div><p className="text-xs text-muted-foreground mt-2">score {(product.score * 100).toFixed(0)}%</p></div>)}</div>
                </div>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════
              QUERYFORGE TAB
          ════════════════════════════════════════ */}
          {activeMainTab === "queryforge" && (
            <div className="animate-in fade-in duration-500">
              <div
                className="rounded-3xl p-[2px] transition-all duration-500"
                style={{
                  background:  "linear-gradient(135deg, rgba(236,72,153,0.5), rgba(168,85,247,0.5), rgba(236,72,153,0.5))",
                  boxShadow:   "0 0 60px rgba(236,72,153,0.2), 0 0 120px rgba(168,85,247,0.1)",
                }}
              >
                <div className="bg-background/95 backdrop-blur-xl rounded-[22px] overflow-hidden">

                  {/* Input Area */}
                  <div className="p-8 lg:p-12 border-b border-foreground/10">
                    <div className="flex items-center gap-4 mb-8">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center" style={{ boxShadow: "0 0 30px rgba(236,72,153,0.4)" }}>
                        <Database className="w-7 h-7 text-white" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-display font-bold tracking-tight">QueryForge</h3>
                        <p className="text-muted-foreground">Transform natural language into powerful SQL queries</p>
                      </div>
                    </div>

                    {/* Input box */}
                    <div
                      className={`relative rounded-2xl p-[1px] transition-all duration-500 ${inputFocused ? "scale-[1.01]" : ""}`}
                      style={{
                        background: inputFocused
                          ? "linear-gradient(135deg, rgba(236,72,153,0.8), rgba(168,85,247,0.8), rgba(236,72,153,0.8))"
                          : "linear-gradient(135deg, rgba(236,72,153,0.3), rgba(168,85,247,0.3), rgba(236,72,153,0.3))",
                        boxShadow: inputFocused
                          ? "0 0 40px rgba(236,72,153,0.4), 0 0 80px rgba(168,85,247,0.2)"
                          : "0 0 20px rgba(236,72,153,0.1)",
                      }}
                    >
                      <div className="relative bg-background/80 backdrop-blur-xl rounded-[15px] overflow-hidden">
                        <div className="absolute left-6 top-7 text-muted-foreground/50">
                          <Search className="w-6 h-6" />
                        </div>
                        <textarea
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                          onFocus={() => setInputFocused(true)}
                          onBlur={() => setInputFocused(false)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              handleGenerate();
                            }
                          }}
                          placeholder="Ask your data anything..."
                          rows={2}
                          className="w-full min-h-[92px] max-h-[150px] resize-none bg-transparent pl-16 pr-44 py-5 text-xl leading-relaxed placeholder:text-muted-foreground/40 focus:outline-none"
                          style={{ fontFamily: "inherit" }}
                        />
                        <button
                          onClick={handleGenerate}
                          disabled={isGenerating}
                          className="absolute right-4 top-4 px-5 py-3 bg-gradient-to-r from-pink-500 to-purple-500 bg-[length:250%_250%] animate-[gradientShift_3s_linear_infinite] text-white rounded-xl font-semibold text-base flex items-center gap-2 hover:opacity-90 transition-all disabled:opacity-50"
                          style={{ boxShadow: "0 0 25px rgba(236,72,153,0.4)" }}
                        >
                          {isGenerating ? (
                            <><Sparkles className="w-4 h-4 animate-spin" />Generating...</>
                          ) : (
                            <><Play className="w-4 h-4" />Generate</>
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 flex justify-end">
                      <button
                        onClick={handleClearQueryForge}
                        disabled={!query && !showResults && !queryError}
                        className="px-5 py-3 rounded-xl border border-pink-500/20 bg-background/60 text-sm font-medium text-pink-200/80 hover:text-foreground hover:border-pink-500/50 hover:bg-pink-500/10 transition-all disabled:opacity-40"
                      >
                        Clear
                      </button>
                    </div>

                    {/* Sample query pills */}
                    <div className="flex flex-wrap gap-3 mt-6">
                      {sampleQueries.map((q, i) => (
                        <button
                          key={i}
                          onClick={() => setQuery(q)}
                          className="px-5 py-2.5 text-sm bg-foreground/[0.03] border border-foreground/10 rounded-xl text-muted-foreground hover:border-pink-500/50 hover:text-foreground hover:bg-pink-500/5 transition-all duration-300"
                        >
                          {q}
                        </button>
                      ))}
                    </div>

                    {queryHistory.length > 0 && (
                      <div className="mt-5">
                        <span className="block text-xs font-mono text-muted-foreground/70 mb-3">Recent queries</span>
                        <div className="flex flex-wrap gap-3">
                          {queryHistory.map((historyItem, i) => (
                            <button
                              key={`${historyItem}-${i}`}
                              onClick={() => setQuery(historyItem)}
                              className="px-5 py-2.5 text-sm bg-pink-500/5 border border-pink-500/20 rounded-xl text-pink-200/80 hover:border-pink-500/50 hover:text-foreground transition-all duration-300"
                            >
                              {historyItem}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="grid md:grid-cols-3 gap-4 mt-6">
                      {[
                        { label: "Active Model", value: modelStatus?.model ?? "checking...", color: "pink" },
                        { label: "Connected Tables", value: modelStatus?.success ? `${modelStatus.tables ?? 0} tables` : "offline", color: "purple" },
                        { label: "Saved Reports", value: `${savedReports.length} saved`, color: "orange" },
                      ].map((item) => (
                        <div
                          key={item.label}
                          className="rounded-2xl p-4 border bg-foreground/[0.02]"
                          style={{
                            borderColor: item.color === "pink" ? "rgba(236,72,153,0.22)" : item.color === "purple" ? "rgba(168,85,247,0.22)" : "rgba(249,115,22,0.22)",
                            background: item.color === "pink" ? "linear-gradient(135deg, rgba(236,72,153,0.08), transparent)" : item.color === "purple" ? "linear-gradient(135deg, rgba(168,85,247,0.08), transparent)" : "linear-gradient(135deg, rgba(249,115,22,0.08), transparent)",
                          }}
                        >
                          <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">{item.label}</p>
                          <p className="mt-2 text-sm font-semibold text-foreground truncate">{item.value}</p>
                        </div>
                      ))}
                    </div>

                    {savedReports.length > 0 && (
                      <div className="mt-5 rounded-2xl border border-pink-500/15 bg-pink-500/[0.03] p-5">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-mono text-pink-300 uppercase tracking-wider">Saved reports</span>
                          <span className="text-xs text-muted-foreground">local session</span>
                        </div>
                        <div className="grid md:grid-cols-2 gap-3">
                          {savedReports.slice(0, 4).map((report, i) => (
                            <button
                              key={`${report.savedAt}-${i}`}
                              onClick={() => setQuery(report.question)}
                              className="text-left rounded-xl border border-foreground/10 bg-background/50 px-4 py-3 hover:border-pink-500/40 hover:bg-pink-500/5 transition-all"
                            >
                              <p className="text-sm font-medium text-foreground truncate">{report.title}</p>
                              <p className="text-xs text-muted-foreground mt-1">{report.rows} rows • {report.model}</p>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Error banner */}
                    {queryError && (
                      <div className="mt-6 px-6 py-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-3">
                        <AlertTriangle className="w-5 h-5 shrink-0" />
                        {queryError}
                      </div>
                    )}
                  </div>

                  {/* Results */}
                  {showResults && results.length > 0 && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                      {/* Sub-tabs */}
                      <div className="flex items-center justify-between gap-4 border-b border-foreground/10">
                        <div className="flex">
                          {[
                            { id: "chart"   as const, label: "Visual Insights",  icon: BarChart3 },
                            { id: "results" as const, label: "Query Results",    icon: Table     },
                            { id: "sql"     as const, label: "Generated SQL",    icon: Database  },
                          ].map((tab) => (
                            <button
                              key={tab.id}
                              onClick={() => setActiveTab(tab.id)}
                              className={`flex items-center gap-3 px-8 py-5 text-base font-medium border-b-2 transition-all ${
                                activeTab === tab.id
                                  ? "border-pink-500 text-foreground bg-pink-500/5"
                                  : "border-transparent text-muted-foreground hover:text-foreground"
                              }`}
                            >
                              <tab.icon className="w-5 h-5" />
                              {tab.label}
                            </button>
                          ))}
                        </div>

                        <button
                          onClick={exportResultsAsCsv}
                          className="mr-6 px-4 py-2 text-sm rounded-xl border border-foreground/10 bg-foreground/[0.03] text-muted-foreground hover:text-foreground hover:border-pink-500/30 hover:bg-pink-500/5 transition-all"
                        >
                          Export CSV
                        </button>
                      </div>

                      <div className="p-8 lg:p-12">

                        {/* ── SQL tab ── */}
                        {activeTab === "sql" && (
                          <div className="relative">
                            <pre className="bg-foreground/[0.03] border border-foreground/10 rounded-2xl p-8 overflow-x-auto font-mono text-base leading-relaxed">
                              <code className="text-pink-400">{sql || "No SQL generated yet."}</code>
                            </pre>
                            <button
                              onClick={() => navigator.clipboard.writeText(sql)}
                              className="absolute top-6 right-6 px-5 py-2.5 bg-foreground/10 rounded-xl text-sm font-medium hover:bg-foreground/20 transition-colors"
                            >
                              Copy
                            </button>
                          </div>
                        )}

                        {/* ── Results table ── */}
                        {activeTab === "results" && (
                          <div className="overflow-x-auto rounded-2xl border border-foreground/10">
                            <table className="w-full">
                              <thead>
                                <tr className="border-b border-foreground/10 bg-foreground/[0.02]">
                                  {tableColumns.map((column, index) => (
                                    <th key={`${column}-${index}`} className="text-left py-5 px-6 font-semibold text-base whitespace-nowrap">
                                      {column}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {results.map((row, i) => (
                                  <tr key={i} className="border-b border-foreground/5 hover:bg-foreground/[0.03] transition-colors">
                                    {row.map((cell, cellIndex) => {
                                      const label = getColumnLabel(resultColumns, cellIndex);
                                      const isMetricColumn = getNumericValue(cell) !== null;
                                      return (
                                        <td
                                          key={`${i}-${cellIndex}`}
                                          className={`py-5 px-6 text-base whitespace-nowrap ${
                                            cellIndex === 0
                                              ? "font-medium"
                                              : isMetricColumn
                                                ? "text-pink-400 font-mono font-semibold"
                                                : "text-muted-foreground"
                                          }`}
                                        >
                                          {formatResultCell(cell, label)}
                                        </td>
                                      );
                                    })}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}

                        {/* ── Chart tab ── */}
                        {activeTab === "chart" && (
                          <div className="space-y-8">
                            {!isChartable ? (
                              <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-8 text-center text-muted-foreground">
                                <BarChart3 className="w-10 h-10 mx-auto mb-4 opacity-40" />
                                <p className="text-base text-foreground mb-2">This result is better viewed as a table.</p>
                                <p className="text-sm">
                                  QueryForge kept the current UI intact and switched to a smarter fallback because this result shape is not ideal for a single bar chart.
                                </p>
                              </div>
                            ) : (
                              <>
                            <div className="flex items-center justify-between">
                              <h4 className="text-lg font-semibold">Query Results — Live Data</h4>
                              <span className="text-sm text-muted-foreground flex items-center gap-2 px-4 py-2 bg-foreground/[0.03] rounded-full">
                                <Info className="w-4 h-4" />
                                Hover bars for details
                              </span>
                            </div>

                            {/* 3D Bar Chart */}
                            <div
                              className="relative rounded-2xl p-8 pt-16 pb-10"
                              style={{
                                background: "linear-gradient(180deg, rgba(236,72,153,0.05) 0%, transparent 100%)",
                                border:     "1px solid rgba(236,72,153,0.1)",
                              }}
                            >
                              {/* Y-axis */}
                              <div className="absolute left-6 top-16 bottom-24 flex flex-col justify-between text-sm text-muted-foreground font-mono">
                                <span>{formatMetricValue(maxResultValue, chartMetricLabel)}</span>
                                <span>{formatMetricValue(maxResultValue * 0.75, chartMetricLabel)}</span>
                                <span>{formatMetricValue(maxResultValue * 0.5, chartMetricLabel)}</span>
                                <span>{formatMetricValue(maxResultValue * 0.25, chartMetricLabel)}</span>
                                <span>{formatMetricValue(0, chartMetricLabel)}</span>
                              </div>

                              {/* Chart grid + bars */}
                              <div className={`${chartOffsetClass} overflow-x-auto overflow-y-visible pb-4 query-chart-scroll`}>
                                <div className="relative min-w-full pl-6 pr-6 md:pl-8 md:pr-8" style={{ width: `${chartMinWidth}px` }}>
                                  <div className="absolute inset-0 flex flex-col justify-between pointer-events-none" style={{ height: "420px" }}>
                                    {[0,1,2,3,4].map((i) => (
                                      <div key={i} className="border-t border-foreground/10 w-full" />
                                    ))}
                                  </div>

                                  <div className="flex items-end gap-3 md:gap-4" style={{ height: "420px" }}>
                                    {chartRows.map((row, i) => {
                                    const barHeight = getBarHeight(row);
                                    const label     = getRowLabel(row);
                                    const value     = getRowValue(row, chartValueIndex);
                                    const share     = totalValue > 0 ? ((value / totalValue) * 100).toFixed(1) : "0.0";
                                    const colors    = barColors[i % barColors.length];
                                    const isHovered = hoveredBar === i;
                                    const showTooltipBelow = barHeight > 340;
                                    const isFirstBar = i === 0;
                                    const isLastBar = i === chartRows.length - 1;
                                    const tooltipHorizontalStyle = isFirstBar
                                      ? { left: "0%", transform: "translateX(0)" }
                                      : isLastBar
                                        ? { left: "100%", transform: "translateX(-100%)" }
                                        : { left: "50%", transform: "translateX(-50%)" };

                                    return (
                                      <div
                                        key={i}
                                        className="w-14 md:w-16 shrink-0 flex flex-col items-center relative group cursor-pointer"
                                        onMouseEnter={() => setHoveredBar(i)}
                                        onMouseLeave={() => setHoveredBar(null)}
                                      >
                                        {/* Tooltip */}
                                        {isHovered && (
                                          <div
                                            className="absolute z-30 px-5 py-4 rounded-2xl text-sm whitespace-nowrap animate-in fade-in zoom-in-95 duration-200"
                                            style={{
                                              bottom:    showTooltipBelow ? "auto" : barHeight + 30,
                                              top:       showTooltipBelow ? 24 : "auto",
                                              background: "linear-gradient(135deg, rgba(15,15,15,0.98), rgba(30,30,30,0.98))",
                                              border:    `1px solid ${colors.front}50`,
                                              boxShadow: `0 0 40px ${colors.glow}, 0 20px 40px rgba(0,0,0,0.5)`,
                                              minWidth:  "220px",
                                              maxWidth:  "260px",
                                              ...tooltipHorizontalStyle,
                                            }}
                                          >
                                            <div className="font-bold text-base mb-2" style={{ color: colors.front }}>{label}</div>
                                            <div className="flex items-center gap-3 text-white/80">
                                              <span>Value:</span>
                                              <span className="font-mono font-semibold" style={{ color: colors.front }}>
                                                {formatMetricValue(value, chartMetricLabel)}
                                              </span>
                                            </div>
                                            <div className="flex items-center gap-3 mt-1.5 text-white/80">
                                              <span>Share:</span>
                                              <span className="font-mono font-semibold text-emerald-400">{share}%</span>
                                            </div>
                                            <div
                                              className={`absolute left-1/2 -translate-x-1/2 w-0 h-0 border-l-[10px] border-r-[10px] border-transparent ${
                                                showTooltipBelow ? "-top-2 border-b-[10px]" : "-bottom-2 border-t-[10px]"
                                              }`}
                                              style={showTooltipBelow ? { borderBottomColor: "rgba(30,30,30,0.98)" } : { borderTopColor: "rgba(30,30,30,0.98)" }}
                                            />
                                          </div>
                                        )}

                                        {/* 3D Bar */}
                                        <div
                                          className="relative w-full transition-all duration-300 ease-out"
                                          style={{
                                            height:    `${barHeight}px`,
                                            transform: isHovered ? "translateY(-12px) scale(1.08)" : "translateY(0) scale(1)",
                                          }}
                                        >
                                          <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-full h-8 rounded-full blur-xl transition-opacity duration-300"
                                            style={{ background: colors.front, opacity: isHovered ? 0.6 : 0.2 }} />

                                          <div className="absolute inset-0 rounded-t-xl transition-all duration-300"
                                            style={{
                                              background: `linear-gradient(180deg, ${colors.top} 0%, ${colors.front} 50%, ${colors.side} 100%)`,
                                              boxShadow: isHovered
                                                ? `0 0 50px ${colors.glow}, 0 25px 50px ${colors.glow}, inset 0 2px 0 rgba(255,255,255,0.3)`
                                                : `0 0 25px ${colors.front}40, inset 0 1px 0 rgba(255,255,255,0.2)`,
                                            }} />

                                          <div className="absolute top-0 -right-1 w-4 rounded-tr-xl"
                                            style={{
                                              height:          "100%",
                                              background:      `linear-gradient(180deg, ${colors.top}80, ${colors.side})`,
                                              transform:       "skewY(-45deg)",
                                              transformOrigin: "top right",
                                            }} />

                                          <div className="absolute -top-2 left-0 right-0 h-4 rounded-t-xl"
                                            style={{
                                              background:      `linear-gradient(90deg, ${colors.top}, ${colors.front}80)`,
                                              transform:       "rotateX(60deg) translateY(-2px)",
                                              transformOrigin: "bottom",
                                            }} />

                                          <div className="absolute inset-0 rounded-t-xl"
                                            style={{ background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 30%, transparent 70%)" }} />
                                        </div>

                                        {/* Label below bar */}
                                        <span className={`mt-5 text-xs font-mono font-medium transition-all duration-300 px-1 ${isHovered ? "text-foreground scale-110" : "text-muted-foreground"}`}>
                                          {formatOrdinal(i + 1)}
                                        </span>
                                      </div>
                                    );
                                    })}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Summary metric cards */}
                            <div className="grid grid-cols-3 gap-6 mt-10 pt-8 border-t border-foreground/10">
                                {[
                                { value: formatMetricValue(totalValue, chartMetricLabel),   label: `Total ${chartMetricLabel}`,   color: "pink"   },
                                { value: String(results.length),    label: "Rows Returned", color: "purple" },
                                { value: formatMetricValue(averageChartValue, chartMetricLabel), label: `Average ${chartMetricLabel}`, color: "orange" },
                              ].map((metric, i) => (
                                <div
                                  key={i}
                                  className="p-6 rounded-2xl transition-all duration-300 hover:scale-[1.02]"
                                  style={{
                                    background: `linear-gradient(135deg, ${metric.color === "pink" ? "rgba(236,72,153,0.1)" : metric.color === "purple" ? "rgba(168,85,247,0.1)" : "rgba(249,115,22,0.1)"}, transparent)`,
                                    border:     `1px solid ${metric.color === "pink" ? "rgba(236,72,153,0.2)" : metric.color === "purple" ? "rgba(168,85,247,0.2)" : "rgba(249,115,22,0.2)"}`,
                                  }}
                                >
                                  <span className={`text-3xl font-display font-bold ${metric.color === "pink" ? "text-pink-400" : metric.color === "purple" ? "text-purple-400" : "text-orange-400"}`}>{metric.value}</span>
                                  <p className="text-sm text-muted-foreground mt-2">{metric.label}</p>
                                </div>
                              ))}
                            </div>
                              </>
                            )}
                          </div>
                        )}

                        {queryIntelligence && (
                          <div className="mt-10 rounded-3xl p-[1px]" style={{ background: "linear-gradient(135deg, rgba(236,72,153,0.35), rgba(168,85,247,0.35), rgba(6,182,212,0.25))" }}>
                            <div className="rounded-[22px] bg-background/80 backdrop-blur-xl p-7">
                              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5 mb-6">
                                <div>
                                  <span className="text-xs font-mono text-pink-300 uppercase tracking-wider">AI Analyst Layer</span>
                                  <h4 className="text-2xl font-display font-bold mt-2">Query explanation & insight summary</h4>
                                  <p className="text-sm text-muted-foreground mt-2">{queryIntelligence.understood}</p>
                                </div>
                                <div className="flex gap-3">
                                  <div className="px-4 py-3 rounded-2xl border border-purple-400/20 bg-purple-400/10">
                                    <p className="text-xs text-muted-foreground">Confidence</p>
                                    <p className="text-lg font-mono text-purple-300">{Math.round((queryIntelligence.confidence ?? 0) * 100)}%</p>
                                  </div>
                                  <button
                                    onClick={handleSaveReport}
                                    className="px-5 py-3 rounded-2xl border border-pink-500/25 bg-pink-500/10 text-sm font-semibold text-pink-100 hover:bg-pink-500/20 transition-all"
                                  >
                                    Save report
                                  </button>
                                </div>
                              </div>

                              <div className="grid lg:grid-cols-3 gap-5">
                                <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.025] p-5">
                                  <p className="text-xs font-mono text-cyan-300 uppercase mb-3">Tables used</p>
                                  <div className="flex flex-wrap gap-2">
                                    {(queryIntelligence.tables_used?.length ? queryIntelligence.tables_used : ["model inferred"]).map((table) => (
                                      <span key={table} className="px-3 py-1 rounded-full bg-cyan-400/10 border border-cyan-400/20 text-xs text-cyan-200">{table}</span>
                                    ))}
                                  </div>
                                  <p className="text-sm text-muted-foreground mt-4">{queryIntelligence.why}</p>
                                </div>

                                <div className="lg:col-span-2 rounded-2xl border border-foreground/10 bg-foreground/[0.025] p-5">
                                  <p className="text-xs font-mono text-pink-300 uppercase mb-4">Generated insights</p>
                                  <div className="grid md:grid-cols-3 gap-4">
                                    {queryIntelligence.insights.slice(0, 3).map((insight, i) => (
                                      <div key={i} className="rounded-2xl border border-pink-500/15 bg-pink-500/[0.04] p-4">
                                        <span className="text-xl font-display font-bold text-pink-300">0{i + 1}</span>
                                        <p className="text-sm text-foreground mt-2">{insight}</p>
                                      </div>
                                    ))}
                                  </div>
                                  <div className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.05] p-4 text-sm text-emerald-200">
                                    {queryIntelligence.recommendation}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Empty state after a successful call that returned no rows */}
                  {showResults && results.length === 0 && !queryError && (
                    <div className="p-12 text-center text-muted-foreground">
                      <Database className="w-10 h-10 mx-auto mb-4 opacity-30" />
                      <p>The query ran successfully but returned no rows.</p>
                      <pre className="mt-4 text-xs text-pink-400 bg-foreground/[0.03] rounded-xl p-4 text-left overflow-x-auto">{sql}</pre>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════
              INFRASAGE TAB
          ════════════════════════════════════════ */}
          {activeMainTab === "infrasage" && (
            <div className="animate-in fade-in duration-500">
              <div className="grid lg:grid-cols-2 gap-8">

                {/* Input Panel */}
                <div
                  className="rounded-3xl p-[2px] transition-all duration-500"
                  style={{
                    background: "linear-gradient(135deg, rgba(59,130,246,0.5), rgba(6,182,212,0.5), rgba(139,92,246,0.5))",
                    boxShadow:  "0 0 60px rgba(6,182,212,0.2), 0 0 120px rgba(59,130,246,0.1)",
                  }}
                >
                  <div className="bg-background/95 backdrop-blur-xl rounded-[22px] overflow-hidden h-full flex flex-col">
                    <div className="p-8 border-b border-foreground/10">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 via-cyan-500 to-violet-500 flex items-center justify-center" style={{ boxShadow: "0 0 30px rgba(6,182,212,0.4)" }}>
                          <Terminal className="w-7 h-7 text-white" />
                        </div>
                        <div>
                          <h3 className="text-2xl font-display font-bold tracking-tight">InfraSage</h3>
                          <p className="text-muted-foreground">Intelligent log analysis &amp; root cause detection</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 p-8">
                      <div
                        className={`relative rounded-2xl p-[1px] transition-all duration-500 ${logInputFocused ? "scale-[1.01]" : ""}`}
                        style={{
                          background: logInputFocused
                            ? "linear-gradient(135deg, rgba(59,130,246,0.8), rgba(6,182,212,0.8), rgba(139,92,246,0.8))"
                            : "linear-gradient(135deg, rgba(59,130,246,0.3), rgba(6,182,212,0.3), rgba(139,92,246,0.3))",
                          boxShadow: logInputFocused
                            ? "0 0 40px rgba(6,182,212,0.4), 0 0 80px rgba(59,130,246,0.2)"
                            : "0 0 20px rgba(6,182,212,0.1)",
                        }}
                      >
                        <textarea
                          value={logs}
                          onChange={(e) => setLogs(e.target.value)}
                          onFocus={() => setLogInputFocused(true)}
                          onBlur={() => setLogInputFocused(false)}
                          placeholder="Paste your system logs here for intelligent analysis..."
                          className="w-full h-72 bg-background/80 backdrop-blur-xl border-0 rounded-[15px] px-6 py-5 font-mono text-base placeholder:text-muted-foreground/40 focus:outline-none resize-none"
                        />
                      </div>

                      <div className="mt-6 flex gap-4">
                        <button
                          onClick={handleClearInfraSage}
                          disabled={isAnalyzing && !logs && !showAnalysis}
                          className="px-6 py-5 rounded-2xl border border-cyan-500/20 bg-background/60 text-base font-medium text-cyan-200/80 hover:text-foreground hover:border-cyan-400/50 hover:bg-cyan-500/10 transition-all disabled:opacity-40"
                        >
                          Clear
                        </button>
                        <button
                          onClick={handleAnalyze}
                          disabled={isAnalyzing}
                          className="flex-1 px-8 py-5 bg-gradient-to-r from-blue-500 via-cyan-500 to-violet-500 bg-[length:250%_250%] animate-[gradientShift_3s_linear_infinite] text-white rounded-2xl font-semibold text-lg flex items-center justify-center gap-3 hover:opacity-90 transition-all disabled:opacity-50"
                          style={{ boxShadow: "0 0 30px rgba(6,182,212,0.4)" }}
                        >
                          {isAnalyzing ? (<><Zap className="w-5 h-5 animate-pulse" />Analyzing logs...</>) : (<><Zap className="w-5 h-5" />Analyze Logs</>)}
                        </button>
                      </div>

                      {logError && (
                        <div className="mt-4 px-6 py-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-3">
                          <AlertTriangle className="w-5 h-5 shrink-0" />
                          {logError}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Analysis Panel */}
                <div
                  className="rounded-3xl p-[1px]"
                  style={{ background: "linear-gradient(135deg, rgba(59,130,246,0.2), rgba(6,182,212,0.2))" }}
                >
                  <div className="bg-background/95 backdrop-blur-xl rounded-[22px] overflow-hidden h-full max-h-[700px] overflow-y-auto">
                    {!showAnalysis ? (
                      <div className="h-full min-h-[500px] flex items-center justify-center p-8">
                        <div className="text-center">
                          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 flex items-center justify-center mx-auto mb-6" style={{ border: "1px solid rgba(6,182,212,0.2)" }}>
                            <Lightbulb className="w-10 h-10 text-cyan-500/50" />
                          </div>
                          <p className="text-xl text-muted-foreground">
                            {isAnalyzing ? "AI is analyzing your logs..." : "Analysis results will appear here"}
                          </p>
                        </div>
                      </div>
                    ) : logAnalysis && (
                      <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                        {/* Severity badge */}
                        <div className="p-8 border-b border-foreground/10">
                          <div className={`inline-flex items-center gap-3 px-5 py-3 rounded-full border ${severity.bg}`} style={{ boxShadow: "0 0 20px rgba(239,68,68,0.2)" }}>
                            <SeverityIcon className={`w-5 h-5 ${severity.color}`} />
                            <span className={`text-sm font-mono font-bold ${severity.color}`}>SEVERITY: {severity.label}</span>
                          </div>
                          <div className="grid md:grid-cols-2 gap-4 mt-5">
                            <div className="rounded-2xl border border-cyan-400/15 bg-cyan-400/[0.04] p-4">
                              <p className="text-xs font-mono text-cyan-300 uppercase">Affected service</p>
                              <p className="text-base font-semibold mt-2">{logAnalysis.affected_service ?? "unknown service"}</p>
                            </div>
                            <div className="rounded-2xl border border-red-400/15 bg-red-400/[0.04] p-4">
                              <p className="text-xs font-mono text-red-300 uppercase">Suspected root cause</p>
                              <p className="text-sm text-foreground mt-2">{logAnalysis.root_cause ?? "InfraSage is waiting for stronger evidence."}</p>
                            </div>
                          </div>
                        </div>

                        {logAnalysis.timeline && logAnalysis.timeline.length > 0 && (
                          <div className="p-8 border-b border-foreground/10">
                            <h4 className="text-sm font-mono text-cyan-400 mb-5 flex items-center gap-2">
                              <Clock className="w-4 h-4" />
                              INCIDENT TIMELINE
                            </h4>
                            <div className="space-y-4">
                              {logAnalysis.timeline.map((event, i) => (
                                <div key={`${event.stage}-${i}`} className="flex gap-4">
                                  <span className="shrink-0 w-8 h-8 rounded-full bg-cyan-400/15 border border-cyan-400/25 flex items-center justify-center text-xs font-mono text-cyan-300">
                                    {i + 1}
                                  </span>
                                  <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.025] p-4 flex-1">
                                    <p className="text-sm font-semibold text-foreground">{event.stage}</p>
                                    <p className="text-sm text-muted-foreground mt-1">{event.detail}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Detected issues */}
                        <div className="p-8 border-b border-foreground/10">
                          <h4 className="text-sm font-mono text-cyan-400 mb-3 flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4" />
                            DETECTED ISSUES
                          </h4>
                          <ul className="space-y-3">
                            {logAnalysis.issues.map((issue, i) => (
                              <li key={i} className="flex items-start gap-3 text-base text-foreground">
                                <span className="shrink-0 w-2 h-2 rounded-full bg-red-400 mt-2" style={{ boxShadow: "0 0 8px rgba(239,68,68,0.5)" }} />
                                {issue}
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Suggested fixes */}
                        <div className="p-8">
                          <h4 className="text-sm font-mono text-cyan-400 mb-5 flex items-center gap-2">
                            <Lightbulb className="w-4 h-4" />
                            SUGGESTED FIXES ({logAnalysis.suggested_fixes.length} RECOMMENDATIONS)
                          </h4>
                          <div
                            className="rounded-2xl p-6"
                            style={{
                              background: "linear-gradient(135deg, rgba(16,185,129,0.05), transparent)",
                              border:     "1px solid rgba(16,185,129,0.2)",
                            }}
                          >
                            <ol className="space-y-4">
                              {logAnalysis.suggested_fixes.map((fix, i) => (
                                <li key={i} className="flex gap-4 text-base">
                                  <span className="shrink-0 w-8 h-8 rounded-full bg-emerald-400/20 flex items-center justify-center text-sm font-mono font-bold text-emerald-400" style={{ boxShadow: "0 0 15px rgba(16,185,129,0.2)" }}>
                                    {i + 1}
                                  </span>
                                  <span className="text-emerald-400/90 pt-1">{fix}</span>
                                </li>
                              ))}
                            </ol>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════
              METRICS TAB  (static infrastructure data)
          ════════════════════════════════════════ */}
          {activeMainTab === "metrics" && (
            <div className="animate-in fade-in duration-500">
              <div className="grid lg:grid-cols-2 gap-8">

                {/* Query Volume & Latency */}
                <div
                  className="rounded-3xl p-[2px]"
                  style={{
                    background: "linear-gradient(135deg, rgba(236,72,153,0.5), rgba(168,85,247,0.5))",
                    boxShadow:  "0 0 50px rgba(236,72,153,0.15)",
                  }}
                >
                  <div className="bg-background/95 backdrop-blur-xl rounded-[22px] p-8">
                    <div className="flex items-center justify-between mb-8">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center" style={{ boxShadow: "0 0 25px rgba(236,72,153,0.4)" }}>
                          <LineChart className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="text-xl font-display font-bold">Query Volume &amp; Latency</h3>
                          <p className="text-sm text-muted-foreground">24-hour overview</p>
                        </div>
                      </div>
                      <div className="flex gap-5 text-sm">
                        <span className="flex items-center gap-2"><span className="w-4 h-4 rounded-full bg-pink-500" style={{ boxShadow: "0 0 12px #ec4899" }} /> Queries</span>
                        <span className="flex items-center gap-2"><span className="w-4 h-4 rounded-full bg-purple-500" style={{ boxShadow: "0 0 12px #a855f7" }} /> Latency</span>
                      </div>
                    </div>

                    <div className="relative h-[320px] rounded-2xl p-6" style={{ background: "linear-gradient(180deg, rgba(236,72,153,0.03) 0%, transparent 100%)" }}>
                      <div className="absolute left-3 top-6 bottom-16 flex flex-col justify-between text-sm text-muted-foreground font-mono">
                        <span>6K</span><span>4K</span><span>2K</span><span>0</span>
                      </div>
                      <div className="ml-12 h-full relative">
                        <svg className="w-full" style={{ height: "calc(100% - 40px)" }} viewBox="0 0 700 220" preserveAspectRatio="none">
                          <defs>
                            <linearGradient id="pinkGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                              <stop offset="0%" stopColor="#ec4899" stopOpacity="0.4" />
                              <stop offset="100%" stopColor="#ec4899" stopOpacity="0" />
                            </linearGradient>
                            <filter id="glowPink"><feGaussianBlur stdDeviation="1.4" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
                            <filter id="glowPurple"><feGaussianBlur stdDeviation="1.2" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
                          </defs>
                          {[0,1,2,3].map((i) => (<line key={i} x1="0" y1={i * 55} x2="700" y2={i * 55} stroke="currentColor" strokeOpacity="0.1" />))}
                          <path d={`M 0 ${220-(queryVolumeData[0].queries/6000)*220} ${queryVolumeData.map((d,i) => `L ${(i/(queryVolumeData.length-1))*700} ${220-(d.queries/6000)*220}`).join(" ")} L 700 220 L 0 220 Z`} fill="url(#pinkGradient)" />
                          <path d={`M ${queryVolumeData.map((d,i) => `${(i/(queryVolumeData.length-1))*700} ${220-(d.queries/6000)*220}`).join(" L ")}`} fill="none" stroke="#ec4899" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                          <path d={`M ${queryVolumeData.map((d,i) => `${(i/(queryVolumeData.length-1))*700} ${220-(d.latency/150)*220}`).join(" L ")}`} fill="none" stroke="#a855f7" strokeWidth="2.5" strokeDasharray="10,7" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                          {queryVolumeData.map((d, i) => (
                            <g key={i}>
                              <circle cx={(i/(queryVolumeData.length-1))*700} cy={220-(d.queries/6000)*220} r="14" fill="#ec4899" fillOpacity="0.2" className="cursor-pointer" />
                              <circle cx={(i/(queryVolumeData.length-1))*700} cy={220-(d.queries/6000)*220} r="7"  fill="#ec4899" className="cursor-pointer" filter="url(#glowPink)"
                                onMouseEnter={(e) => setHoveredMetric({ type: "queries", value: d.queries.toLocaleString(), label: `${d.time} - Queries`, x: e.clientX, y: e.clientY })}
                                onMouseLeave={() => setHoveredMetric(null)} />
                              <circle cx={(i/(queryVolumeData.length-1))*700} cy={220-(d.latency/150)*220} r="10" fill="#a855f7" fillOpacity="0.2" className="cursor-pointer" />
                              <circle cx={(i/(queryVolumeData.length-1))*700} cy={220-(d.latency/150)*220} r="6"  fill="#a855f7" className="cursor-pointer" filter="url(#glowPurple)"
                                onMouseEnter={(e) => setHoveredMetric({ type: "latency", value: `${d.latency}ms`, label: `${d.time} - Latency`, x: e.clientX, y: e.clientY })}
                                onMouseLeave={() => setHoveredMetric(null)} />
                            </g>
                          ))}
                        </svg>
                        <div className="flex justify-between text-sm text-muted-foreground font-mono pt-4">
                          {queryVolumeData.map((d, i) => (<span key={i}>{d.time}</span>))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Resource Utilization — 3D Pie */}
                <div
                  className="rounded-3xl p-[2px]"
                  style={{
                    background: "linear-gradient(135deg, rgba(168,85,247,0.5), rgba(249,115,22,0.5))",
                    boxShadow:  "0 0 50px rgba(168,85,247,0.15)",
                  }}
                >
                  <div className="bg-background/95 backdrop-blur-xl rounded-[22px] p-8">
                    <div className="flex items-center gap-4 mb-8">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-orange-500 flex items-center justify-center" style={{ boxShadow: "0 0 25px rgba(168,85,247,0.4)" }}>
                        <PieChart className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-display font-bold">Resource Utilization</h3>
                        <p className="text-sm text-muted-foreground">Current allocation</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-center gap-10">
                      <div className="relative w-[260px] h-[260px]" style={{ perspective: "600px" }}>
                        <div className="absolute inset-0 rounded-full" style={{ transform: "translateY(15px) rotateX(65deg)", background: "radial-gradient(ellipse at center, rgba(0,0,0,0.4) 0%, transparent 70%)" }} />
                        <svg viewBox="0 0 100 100" className="w-full h-full" style={{ transform: "rotateX(25deg)" }}>
                          <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="14" className="text-foreground/10" />
                          {(() => {
                            let offset = 0;
                            const total = resourceData.reduce((sum, d) => sum + d.value, 0);
                            return resourceData.map((d, i) => {
                              const pct = d.value / total;
                              const circ = 2 * Math.PI * 40;
                              const sda = `${pct * circ} ${circ}`;
                              const sdo = -offset * circ;
                              offset += pct;
                              const isH = hoveredPieSegment === i;
                              return (
                                <g key={i}>
                                  <circle cx="50" cy="50" r="40" fill="none" stroke={d.color} strokeWidth={isH ? "18" : "14"} strokeDasharray={sda} strokeDashoffset={sdo} strokeOpacity="0.4" style={{ filter: "blur(6px)", transform: "rotate(-90deg)", transformOrigin: "50% 50%" }} />
                                  <circle cx="50" cy="50" r="40" fill="none" stroke={d.color} strokeWidth={isH ? "16" : "14"} strokeDasharray={sda} strokeDashoffset={sdo} className="cursor-pointer transition-all duration-300"
                                    style={{ filter: isH ? `drop-shadow(0 0 20px ${d.color})` : `drop-shadow(0 0 8px ${d.color}60)`, transform: "rotate(-90deg)", transformOrigin: "50% 50%" }}
                                    onMouseEnter={() => setHoveredPieSegment(i)}
                                    onMouseLeave={() => setHoveredPieSegment(null)} />
                                </g>
                              );
                            });
                          })()}
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ transform: "rotateX(25deg)" }}>
                          <span className="text-4xl font-display font-bold bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
                            {hoveredPieSegment !== null ? `${resourceData[hoveredPieSegment].value}%` : "45.5%"}
                          </span>
                          <span className="text-sm text-muted-foreground mt-1">
                            {hoveredPieSegment !== null ? resourceData[hoveredPieSegment].name : "Avg Usage"}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-5">
                        {resourceData.map((d, i) => {
                          const isH = hoveredPieSegment === i;
                          return (
                            <div key={i} className={`flex items-center gap-4 cursor-pointer transition-all duration-300 ${isH ? "scale-110" : ""}`}
                              onMouseEnter={() => setHoveredPieSegment(i)}
                              onMouseLeave={() => setHoveredPieSegment(null)}>
                              <div className="w-5 h-5 rounded-full transition-all duration-300"
                                style={{ backgroundColor: d.color, boxShadow: isH ? `0 0 25px ${d.color}` : `0 0 10px ${d.color}50`, transform: isH ? "scale(1.3)" : "scale(1)" }} />
                              <span className={`text-base transition-all duration-300 ${isH ? "text-foreground font-semibold" : ""}`}>{d.name}</span>
                              <span className={`text-base font-mono transition-all duration-300 ${isH ? "text-foreground" : "text-muted-foreground"}`}>{d.value}%</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Data Quality Scanner — Full Width */}
                <div
                  className="lg:col-span-2 rounded-3xl p-[2px]"
                  style={{
                    background: "linear-gradient(135deg, rgba(6,182,212,0.45), rgba(236,72,153,0.45), rgba(168,85,247,0.45))",
                    boxShadow:  "0 0 50px rgba(6,182,212,0.12)",
                  }}
                >
                  <div className="bg-background/95 backdrop-blur-xl rounded-[22px] p-8">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5 mb-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 via-pink-500 to-purple-500 flex items-center justify-center" style={{ boxShadow: "0 0 25px rgba(6,182,212,0.35)" }}>
                          <Search className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="text-xl font-display font-bold">Data Quality Scanner</h3>
                          <p className="text-sm text-muted-foreground">Model-assisted scan for missing values, outliers, and risky fields</p>
                        </div>
                      </div>
                      <button
                        onClick={handleRunQualityScan}
                        disabled={isScanningQuality}
                        className="px-6 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 via-pink-500 to-purple-500 bg-[length:250%_250%] animate-[gradientShift_3s_linear_infinite] text-white font-semibold hover:opacity-90 transition-all disabled:opacity-60"
                      >
                        {isScanningQuality ? "Scanning..." : "Run scanner"}
                      </button>
                    </div>

                    {!qualityScan && (
                      <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.025] p-6 text-sm text-muted-foreground">
                        The scan runs only when you click it, so the model does not heat the laptop during normal browsing.
                      </div>
                    )}

                    {qualityScan && !qualityScan.success && (
                      <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-300">
                        {qualityScan.error ?? "Quality scan failed."}
                      </div>
                    )}

                    {qualityScan?.success && (
                      <div className="grid lg:grid-cols-3 gap-5">
                        <div className="lg:col-span-1 rounded-2xl border border-cyan-400/20 bg-cyan-400/[0.04] p-5">
                          <p className="text-xs font-mono text-cyan-300 uppercase">AI summary</p>
                          <p className="text-base text-foreground mt-3">{qualityScan.ai_summary?.summary}</p>
                          <p className="text-sm text-muted-foreground mt-3">Risk level: <span className="text-cyan-300 font-semibold">{qualityScan.ai_summary?.risk_level}</span></p>
                        </div>
                        <div className="lg:col-span-2 grid md:grid-cols-2 gap-5">
                          <div className="rounded-2xl border border-pink-500/20 bg-pink-500/[0.04] p-5">
                            <p className="text-xs font-mono text-pink-300 uppercase mb-3">Top findings</p>
                            <ul className="space-y-2 text-sm text-foreground">
                              {(qualityScan.findings?.length ? qualityScan.findings : ["No major quality findings detected."]).slice(0, 4).map((finding, i) => (
                                <li key={i} className="flex gap-2">
                                  <span className="text-pink-300">•</span>
                                  <span>{finding}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.04] p-5">
                            <p className="text-xs font-mono text-emerald-300 uppercase mb-3">Next actions</p>
                            <ul className="space-y-2 text-sm text-foreground">
                              {(qualityScan.ai_summary?.next_actions ?? []).map((action, i) => (
                                <li key={i} className="flex gap-2">
                                  <span className="text-emerald-300">{i + 1}</span>
                                  <span>{action}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Error Rate Distribution — Full Width */}
                <div
                  className="lg:col-span-2 rounded-3xl p-[2px]"
                  style={{
                    background: "linear-gradient(135deg, rgba(249,115,22,0.5), rgba(236,72,153,0.5))",
                    boxShadow:  "0 0 50px rgba(249,115,22,0.15)",
                  }}
                >
                  <div className="bg-background/95 backdrop-blur-xl rounded-[22px] p-8">
                    <div className="flex items-center justify-between mb-8">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center" style={{ boxShadow: "0 0 25px rgba(249,115,22,0.4)" }}>
                          <Activity className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="text-xl font-display font-bold">Error Rate Distribution</h3>
                          <p className="text-sm text-muted-foreground">Weekly trend analysis</p>
                        </div>
                      </div>
                      <div className="px-5 py-2.5 rounded-full text-sm font-mono font-medium"
                        style={{ background: "linear-gradient(135deg, rgba(16,185,129,0.1), rgba(16,185,129,0.05))", border: "1px solid rgba(16,185,129,0.3)", color: "#10b981", boxShadow: "0 0 20px rgba(16,185,129,0.15)" }}>
                        0.99% avg error rate
                      </div>
                    </div>

                    <div className="relative h-[220px] rounded-2xl p-6" style={{ background: "linear-gradient(180deg, rgba(249,115,22,0.03) 0%, transparent 100%)" }}>
                      <div className="absolute left-3 top-6 bottom-14 flex flex-col justify-between text-sm text-muted-foreground font-mono">
                        <span>3%</span><span>2%</span><span>1%</span><span>0%</span>
                      </div>
                      <div className="ml-10 h-full relative">
                        <svg className="w-full" style={{ height: "calc(100% - 36px)" }} viewBox="0 0 700 160" preserveAspectRatio="none">
                          <defs>
                            <linearGradient id="orangeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                              <stop offset="0%"   stopColor="#f97316" stopOpacity="0.5" />
                              <stop offset="50%"  stopColor="#f97316" stopOpacity="0.15" />
                              <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
                            </linearGradient>
                            <filter id="glowOrange"><feGaussianBlur stdDeviation="1.4" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
                          </defs>
                          {[0,1,2,3].map((i) => (<line key={i} x1="0" y1={i * 40} x2="700" y2={i * 40} stroke="currentColor" strokeOpacity="0.1" />))}
                          <path d={`M 0 ${160-(errorRateData[0].rate/3)*160} ${errorRateData.map((d,i) => `L ${(i/(errorRateData.length-1))*700} ${160-(d.rate/3)*160}`).join(" ")} L 700 160 L 0 160 Z`} fill="url(#orangeGradient)" />
                          <path d={`M ${errorRateData.map((d,i) => `${(i/(errorRateData.length-1))*700} ${160-(d.rate/3)*160}`).join(" L ")}`} fill="none" stroke="#f97316" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                          {errorRateData.map((d, i) => (
                            <g key={i}>
                              <circle cx={(i/(errorRateData.length-1))*700} cy={160-(d.rate/3)*160} r="14" fill="#f97316" fillOpacity="0.2" className="cursor-pointer" />
                              <circle cx={(i/(errorRateData.length-1))*700} cy={160-(d.rate/3)*160} r="7"  fill="#f97316" className="cursor-pointer" filter="url(#glowOrange)"
                                onMouseEnter={(e) => setHoveredMetric({ type: "error", value: `${d.rate}%`, label: `${d.time} - Error Rate`, x: e.clientX, y: e.clientY })}
                                onMouseLeave={() => setHoveredMetric(null)} />
                            </g>
                          ))}
                        </svg>
                        <div className="flex justify-between text-sm text-muted-foreground font-mono pt-4">
                          {errorRateData.map((d, i) => (<span key={i}>{d.time}</span>))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Global hover tooltip */}
      {hoveredMetric && (
        <div
          className="fixed z-50 px-5 py-4 rounded-2xl pointer-events-none animate-in fade-in zoom-in-95 duration-150"
          style={{
            left:       hoveredMetric.x + 15,
            top:        hoveredMetric.y - 50,
            background: "linear-gradient(135deg, rgba(15,15,15,0.98), rgba(30,30,30,0.98))",
            border:     `1px solid ${hoveredMetric.type === "queries" ? "#ec4899" : hoveredMetric.type === "latency" ? "#a855f7" : "#f97316"}50`,
            boxShadow:  `0 0 30px ${hoveredMetric.type === "queries" ? "rgba(236,72,153,0.4)" : hoveredMetric.type === "latency" ? "rgba(168,85,247,0.4)" : "rgba(249,115,22,0.4)"}`,
          }}
        >
          <div className="text-sm text-white/70 mb-1">{hoveredMetric.label}</div>
          <div className="text-xl font-mono font-bold"
            style={{ color: hoveredMetric.type === "queries" ? "#ec4899" : hoveredMetric.type === "latency" ? "#a855f7" : "#f97316" }}>
            {hoveredMetric.value}
          </div>
        </div>
      )}

      {hoveredInsight && (
        <div
          className="fixed z-50 max-w-[320px] px-5 py-4 rounded-2xl pointer-events-none animate-in fade-in zoom-in-95 duration-150"
          style={{
            left: hoveredInsight.x + 16,
            top: hoveredInsight.y - 72,
            background: "linear-gradient(135deg, rgba(15,15,15,0.98), rgba(30,30,30,0.98))",
            border: `1px solid ${hoveredInsight.color}55`,
            boxShadow: `0 0 34px ${hoveredInsight.color}55, 0 18px 40px rgba(0,0,0,0.45)`,
          }}
        >
          <div className="text-sm font-semibold mb-1" style={{ color: hoveredInsight.color }}>{hoveredInsight.title}</div>
          <div className="text-xl font-mono font-bold text-white mb-2">{hoveredInsight.value}</div>
          <div className="text-xs leading-relaxed text-white/70">{hoveredInsight.detail}</div>
        </div>
      )}
    </section>
  );
}
