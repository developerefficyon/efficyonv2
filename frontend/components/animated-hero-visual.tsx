"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { TrendingUp, TrendingDown, DollarSign, Clock, Zap, BarChart3 } from "lucide-react"

const savingsData = [
  { month: "Jan", value: 20 },
  { month: "Feb", value: 35 },
  { month: "Mar", value: 45 },
  { month: "Apr", value: 60 },
  { month: "May", value: 75 },
  { month: "Jun", value: 85 },
]

const floatingMetrics = [
  { icon: DollarSign, label: "License Savings", value: "$47,500", color: "text-green-400", bg: "bg-green-400/10" },
  { icon: Clock, label: "Hours Saved", value: "2,340 hrs", color: "text-blue-400", bg: "bg-blue-400/10" },
  { icon: TrendingUp, label: "ROI", value: "340%", color: "text-orange-400", bg: "bg-orange-400/10" },
]

const inefficiencies = [
  "Unused Zoom licenses detected",
  "Duplicate storage costs found",
  "Manual workflow identified",
  "Redundant subscriptions flagged",
]

export function AnimatedHeroVisual() {
  const [activeMetric, setActiveMetric] = useState(0)
  const [chartProgress, setChartProgress] = useState(0)
  const [activeInefficiency, setActiveInefficiency] = useState(0)

  useEffect(() => {
    // Cycle through metrics
    const metricInterval = setInterval(() => {
      setActiveMetric((prev) => (prev + 1) % floatingMetrics.length)
    }, 3000)

    // Animate chart
    const chartInterval = setInterval(() => {
      setChartProgress((prev) => (prev < 100 ? prev + 2 : 0))
    }, 50)

    // Cycle through inefficiencies
    const inefficiencyInterval = setInterval(() => {
      setActiveInefficiency((prev) => (prev + 1) % inefficiencies.length)
    }, 2500)

    return () => {
      clearInterval(metricInterval)
      clearInterval(chartInterval)
      clearInterval(inefficiencyInterval)
    }
  }, [])

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-green-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 left-1/4 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      {/* Main dashboard card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="relative z-10 w-[90%] max-w-md"
      >
        {/* Dashboard container */}
        <div className="bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-white/60 text-sm">Live Analysis</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-400/10 border border-green-400/30">
              <TrendingUp className="w-3 h-3 text-green-400" />
              <span className="text-green-400 text-xs font-medium">+27% this month</span>
            </div>
          </div>

          {/* Animated savings chart */}
          <div className="mb-6">
            <div className="flex items-end justify-between h-32 gap-2">
              {savingsData.map((data, index) => {
                const barHeight = Math.min(chartProgress, data.value)
                return (
                  <div key={data.month} className="flex-1 flex flex-col items-center h-full">
                    {/* Bar container with relative positioning */}
                    <div className="flex-1 w-full flex items-end justify-center">
                      <motion.div
                        className="w-full max-w-[24px] bg-gradient-to-t from-green-500 to-green-400 rounded-t-sm"
                        style={{ height: `${barHeight}%` }}
                        initial={{ height: 0 }}
                        animate={{ height: `${barHeight}%` }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                      />
                    </div>
                    <span className="text-white/40 text-xs mt-2">{data.month}</span>
                  </div>
                )
              })}
            </div>
            <div className="flex justify-between mt-2 text-xs">
              <span className="text-white/40">Cumulative Savings</span>
              <span className="text-green-400 font-medium">$127,500</span>
            </div>
          </div>

          {/* Detected inefficiency alert */}
          <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3 mb-4">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-4 h-4 text-orange-400" />
              <span className="text-orange-400 text-xs font-medium">AI Detection</span>
            </div>
            <AnimatePresence mode="wait">
              <motion.p
                key={activeInefficiency}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="text-white text-sm"
              >
                {inefficiencies[activeInefficiency]}
              </motion.p>
            </AnimatePresence>
          </div>

          {/* Quick stats row */}
          <div className="grid grid-cols-3 gap-3">
            {floatingMetrics.map((metric, index) => {
              const Icon = metric.icon
              return (
                <motion.div
                  key={metric.label}
                  animate={{
                    scale: activeMetric === index ? 1.05 : 1,
                    borderColor: activeMetric === index ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.1)",
                  }}
                  className={`${metric.bg} border border-white/10 rounded-lg p-3 transition-all`}
                >
                  <Icon className={`w-4 h-4 ${metric.color} mb-1`} />
                  <p className="text-white font-bold text-sm">{metric.value}</p>
                  <p className="text-white/40 text-xs truncate">{metric.label}</p>
                </motion.div>
              )
            })}
          </div>
        </div>

        {/* Floating notification cards */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="absolute -right-4 top-20 bg-black/90 backdrop-blur border border-green-500/30 rounded-lg p-3 shadow-xl z-20"
        >
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-green-400/20 flex items-center justify-center">
              <TrendingDown className="w-4 h-4 text-green-400" />
            </div>
            <div>
              <p className="text-white text-xs font-medium">Cost Reduced</p>
              <p className="text-green-400 text-sm font-bold">-$2,340</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="absolute -left-4 bottom-16 bg-black/90 backdrop-blur border border-blue-500/30 rounded-lg p-3 shadow-xl"
        >
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-400/20 flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <p className="text-white text-xs font-medium">Efficiency</p>
              <p className="text-blue-400 text-sm font-bold">+34%</p>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}
