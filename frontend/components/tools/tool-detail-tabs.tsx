"use client"

import { useState } from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { BarChart3, Clock, Info, Database } from "lucide-react"
import { OverviewTab } from "./overview-tab"
import { AnalysisTab } from "./analysis-tab"
import { HistoryTab } from "./history-tab"
import { DataTab } from "./data-tab"
import { useToolInfo } from "@/lib/tools/use-tool-info"
import type { Integration, UnifiedToolConfig } from "@/lib/tools/types"

interface ToolDetailTabsProps {
  integration: Integration
  config: UnifiedToolConfig
}

export function ToolDetailTabs({ integration, config }: ToolDetailTabsProps) {
  const hasAnalysis = config.analysisType && config.analysisType !== "none"
  const [activeTab, setActiveTab] = useState<string>(hasAnalysis ? "analysis" : "overview")
  const { info, isLoading, reload } = useToolInfo(integration)

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="bg-white/[0.02] border border-white/[0.06] mb-6 w-full sm:w-auto overflow-x-auto flex-wrap sm:flex-nowrap rounded-lg p-1">
        {hasAnalysis && (
          <TabsTrigger
            value="analysis"
            className="data-[state=active]:bg-white/[0.06] data-[state=active]:text-white text-white/40 text-[12px] rounded-md"
          >
            <BarChart3 className="w-3.5 h-3.5 mr-1.5" />
            Analysis
          </TabsTrigger>
        )}
        {hasAnalysis && (
          <TabsTrigger
            value="history"
            className="data-[state=active]:bg-white/[0.06] data-[state=active]:text-white text-white/40 text-[12px] rounded-md"
          >
            <Clock className="w-3.5 h-3.5 mr-1.5" />
            History
          </TabsTrigger>
        )}
        <TabsTrigger
          value="overview"
          className="data-[state=active]:bg-white/[0.06] data-[state=active]:text-white text-white/40 text-[12px] rounded-md"
        >
          <Info className="w-3.5 h-3.5 mr-1.5" />
          Overview
        </TabsTrigger>
        <TabsTrigger
          value="data"
          className="data-[state=active]:bg-white/[0.06] data-[state=active]:text-white text-white/40 text-[12px] rounded-md"
        >
          <Database className="w-3.5 h-3.5 mr-1.5" />
          Data
        </TabsTrigger>
      </TabsList>

      {hasAnalysis && (
        <TabsContent value="analysis" className="mt-0">
          <AnalysisTab integration={integration} config={config} />
        </TabsContent>
      )}
      {hasAnalysis && (
        <TabsContent value="history" className="mt-0">
          <HistoryTab integration={integration} config={config} />
        </TabsContent>
      )}
      <TabsContent value="overview" className="mt-0">
        <OverviewTab integration={integration} />
      </TabsContent>
      <TabsContent value="data" className="mt-0">
        <DataTab
          integration={integration}
          config={config}
          info={info}
          isLoading={isLoading}
          reload={reload}
        />
      </TabsContent>
    </Tabs>
  )
}
