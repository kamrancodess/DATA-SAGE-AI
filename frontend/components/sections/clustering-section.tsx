"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Loader2, Network, Zap } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ClusterData, fetchJson } from "@/lib/study-api"

export function ClusteringSection() {
  const [data, setData] = useState<ClusterData | null>(null)
  const [loading, setLoading] = useState(false)

  const cluster = async () => {
    setLoading(true)
    try {
      setData(await fetchJson<ClusterData>("/topics/cluster", { method: "POST", body: JSON.stringify({}) }))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Topic Clustering</h1>
          <p className="text-muted-foreground mt-1">Visualize related concepts grouped by local KMeans clustering.</p>
        </div>
        <Button onClick={cluster} disabled={loading} className="bg-gradient-to-r from-neon-cyan to-neon-blue hover:opacity-90 text-white">
          {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Network className="w-4 h-4 mr-2" />}
          Cluster
        </Button>
      </div>

      <Card className="glass border-border/30">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Network className="w-5 h-5 text-neon-cyan" />
            Knowledge Map
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-2">
            {(data?.clusters ?? []).map((clusterItem, index) => (
              <motion.div key={clusterItem.cluster_id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: index * 0.15 }}>
                <div className="p-6 rounded-2xl bg-gradient-to-br from-neon-cyan/10 to-neon-blue/10 border border-border/30">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-foreground">{clusterItem.label}</h3>
                    <span className="text-sm text-neon-cyan">{clusterItem.size} chunks</span>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-4">{clusterItem.sample}</p>
                </div>
              </motion.div>
            ))}
            {!data?.clusters?.length && <p className="text-sm text-muted-foreground">Upload PDFs, then run clustering.</p>}
          </div>
        </CardContent>
      </Card>

      <Card className="glass border-border/30">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Zap className="w-5 h-5 text-neon-cyan" />
            AI Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-4 rounded-xl bg-gradient-to-r from-neon-cyan/10 to-neon-blue/10 border border-neon-cyan/20">
            <p className="text-sm text-foreground">{data?.quality ?? "Cluster quality and topic labels will appear after analysis."}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
