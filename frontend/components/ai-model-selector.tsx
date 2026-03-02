"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, Check, Zap, Brain, Sparkles, ChevronDown } from "lucide-react"
import { getBackendToken } from "@/lib/auth-hooks"
import { useTeamRole } from "@/lib/team-role-context"
import { useTokens } from "@/lib/token-context"
import { toast } from "sonner"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

export type ModelTier = {
  key: string
  label: string
  description: string
  multiplier: number
  icon: typeof Zap
  color: string
  bgGradient: string
  borderColor: string
}

export const MODEL_TIERS: ModelTier[] = [
  {
    key: "haiku",
    label: "Claude Haiku",
    description: "Fast and efficient. Best for quick analyses.",
    multiplier: 1,
    icon: Zap,
    color: "text-emerald-400",
    bgGradient: "from-emerald-500/20 to-emerald-500/5",
    borderColor: "border-emerald-500/50",
  },
  {
    key: "sonnet",
    label: "Claude Sonnet",
    description: "Balanced performance. Great for most tasks.",
    multiplier: 2,
    icon: Brain,
    color: "text-blue-400",
    bgGradient: "from-blue-500/20 to-blue-500/5",
    borderColor: "border-blue-500/50",
  },
  {
    key: "opus",
    label: "Claude Opus",
    description: "Most capable. Best for complex analyses.",
    multiplier: 3,
    icon: Sparkles,
    color: "text-purple-400",
    bgGradient: "from-purple-500/20 to-purple-500/5",
    borderColor: "border-purple-500/50",
  },
]

export function AiModelSelector() {
  const { isOwner } = useTeamRole()
  const { aiModel, refreshTokenBalance } = useTokens()
  const [currentModel, setCurrentModel] = useState<string>(aiModel?.key || "haiku")
  const [selectedModel, setSelectedModel] = useState<string>(aiModel?.key || "haiku")
  const [isSaving, setIsSaving] = useState(false)

  // Sync from context whenever aiModel changes (e.g. on navigation refresh)
  useEffect(() => {
    if (aiModel?.key) {
      setCurrentModel(aiModel.key)
      setSelectedModel(aiModel.key)
    }
  }, [aiModel?.key])

  const handleSave = async () => {
    if (selectedModel === currentModel) return

    setIsSaving(true)
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
      const accessToken = await getBackendToken()
      if (!accessToken) {
        toast.error("Session expired. Please log in again.")
        return
      }

      const response = await fetch(`${apiBase}/api/settings/ai-model`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ model: selectedModel }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to update AI model")
      }

      setCurrentModel(selectedModel)

      // Refresh global context so chatbot and other pages pick up the change
      await refreshTokenBalance()

      const tier = MODEL_TIERS.find((t) => t.key === selectedModel)
      toast.success(`AI model changed to ${tier?.label || selectedModel}`, {
        description:
          selectedModel !== "haiku"
            ? `Token cost multiplier is now ${tier?.multiplier}x`
            : "Using the most efficient model",
      })
    } catch (error) {
      console.error("Failed to save AI model:", error)
      toast.error("Failed to update AI model", {
        description: error instanceof Error ? error.message : "An error occurred",
      })
      setSelectedModel(currentModel)
    } finally {
      setIsSaving(false)
    }
  }

  const hasChanged = selectedModel !== currentModel

  return (
    <Card className="bg-black/80 backdrop-blur-xl border-white/10">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-cyan-400" />
          <CardTitle className="text-white">AI Model</CardTitle>
        </div>
        <CardDescription className="text-gray-400">
          Choose which AI model powers all analyses and chat features.
          {!isOwner && " Only the account owner can change this setting."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {MODEL_TIERS.map((tier) => {
          const isSelected = selectedModel === tier.key
          const isCurrent = currentModel === tier.key
          const Icon = tier.icon

          return (
            <button
              key={tier.key}
              type="button"
              disabled={!isOwner}
              onClick={() => isOwner && setSelectedModel(tier.key)}
              className={cn(
                "w-full p-4 rounded-xl border-2 text-left transition-all duration-200",
                isOwner && "cursor-pointer hover:scale-[1.01]",
                !isOwner && "cursor-default opacity-80",
                isSelected
                  ? `${tier.borderColor} bg-gradient-to-br ${tier.bgGradient}`
                  : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/5"
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "w-9 h-9 rounded-lg flex items-center justify-center border",
                      isSelected
                        ? `${tier.borderColor} bg-gradient-to-br ${tier.bgGradient}`
                        : "border-white/20 bg-white/10"
                    )}
                  >
                    <Icon
                      className={cn("w-4.5 h-4.5", isSelected ? tier.color : "text-gray-400")}
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white">{tier.label}</span>
                      {isCurrent && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                          Current
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{tier.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className={cn("text-lg font-bold", isSelected ? tier.color : "text-gray-300")}>
                      {tier.multiplier}x
                    </span>
                    <p className="text-[10px] text-gray-500">token cost</p>
                  </div>
                  {isSelected && (
                    <div
                      className={cn(
                        "w-5 h-5 rounded-full flex items-center justify-center",
                        tier.borderColor,
                        `bg-gradient-to-br ${tier.bgGradient}`
                      )}
                    >
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>
              </div>
            </button>
          )
        })}

        {isOwner && hasChanged && (
          <div className="pt-2">
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-medium"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  Save Model Preference
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function AiModelPopover() {
  const { isOwner } = useTeamRole()
  const { aiModel, refreshTokenBalance } = useTokens()
  const [open, setOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const currentModel = aiModel?.key || "haiku"
  const currentTier = MODEL_TIERS.find((t) => t.key === currentModel) || MODEL_TIERS[0]
  const TriggerIcon = currentTier.icon

  const handleSelect = async (modelKey: string) => {
    if (modelKey === currentModel || !isOwner) return

    setIsSaving(true)
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
      const accessToken = await getBackendToken()
      if (!accessToken) {
        toast.error("Session expired. Please log in again.")
        return
      }

      const response = await fetch(`${apiBase}/api/settings/ai-model`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ model: modelKey }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to update AI model")
      }

      await refreshTokenBalance()
      setOpen(false)

      const tier = MODEL_TIERS.find((t) => t.key === modelKey)
      toast.success(`Switched to ${tier?.label || modelKey}`, {
        description:
          modelKey !== "haiku"
            ? `Token cost: ${tier?.multiplier}x`
            : "Most efficient model",
      })
    } catch (error) {
      console.error("Failed to save AI model:", error)
      toast.error("Failed to update AI model", {
        description: error instanceof Error ? error.message : "An error occurred",
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="border-white/10 bg-black/50 text-gray-300 hover:text-white hover:bg-white/10 gap-1.5"
        >
          <TriggerIcon className={cn("w-3.5 h-3.5", currentTier.color)} />
          <span className="text-xs">{currentTier.label.replace("Claude ", "")}</span>
          <span className={cn("text-[10px] font-bold", currentTier.color)}>
            {currentTier.multiplier}x
          </span>
          <ChevronDown className="w-3 h-3 text-gray-500" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-64 p-2 bg-gray-900 border-white/10"
      >
        <div className="space-y-1">
          <p className="text-xs text-gray-400 px-2 py-1 font-medium">
            AI Model{!isOwner && " (owner only)"}
          </p>
          {MODEL_TIERS.map((tier) => {
            const isActive = currentModel === tier.key
            const TierIcon = tier.icon
            return (
              <button
                key={tier.key}
                type="button"
                disabled={!isOwner || isSaving}
                onClick={() => handleSelect(tier.key)}
                className={cn(
                  "w-full flex items-center gap-3 px-2 py-2 rounded-lg text-left transition-all",
                  isOwner && !isSaving && "cursor-pointer hover:bg-white/5",
                  !isOwner && "cursor-default opacity-60",
                  isActive &&
                    `bg-gradient-to-r ${tier.bgGradient} ${tier.borderColor} border`
                )}
              >
                <TierIcon
                  className={cn(
                    "w-4 h-4 shrink-0",
                    isActive ? tier.color : "text-gray-400"
                  )}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white">
                      {tier.label.replace("Claude ", "")}
                    </span>
                    {isActive && <Check className="w-3 h-3 text-cyan-400" />}
                  </div>
                  <p className="text-[10px] text-gray-500">{tier.description}</p>
                </div>
                <span
                  className={cn(
                    "text-xs font-bold shrink-0",
                    isActive ? tier.color : "text-gray-400"
                  )}
                >
                  {tier.multiplier}x
                </span>
              </button>
            )
          })}
          {isSaving && (
            <div className="flex items-center justify-center py-1">
              <Loader2 className="w-3 h-3 animate-spin text-cyan-400" />
              <span className="text-[10px] text-gray-400 ml-1">Saving...</span>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
