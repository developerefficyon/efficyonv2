"use client"

import { buttonVariants } from "@/components/ui/button"
import { useMediaQuery } from "@/hooks/use-media-query"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import { Check, Star } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

interface PricingPlan {
  name: string
  price: string
  yearlyPrice: string
  period: string
  features: string[]
  description: string
  buttonText: string
  href: string
  isPopular: boolean
  monthlyPrice?: string
}

interface PricingProps {
  plans: PricingPlan[]
  title?: string
  description?: string
}

export function Pricing({
  plans,
  title = "Simple, Transparent Pricing",
  description = "Choose the plan that works for you\nAll plans include access to our platform, lead generation tools, and dedicated support.",
}: PricingProps) {
  const [billingPeriod, setBillingPeriod] = useState<"6month" | "monthly" | "annual">("6month")
  const isDesktop = useMediaQuery("(min-width: 768px)")

  return (
    <div className="container py-20 mx-auto">
      <div className="text-center space-y-4 mb-12">
        <h2 className="text-4xl font-bold tracking-tight sm:text-5xl text-white">{title}</h2>
        
      </div>

      <div className="flex justify-center mb-10">
        <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-white/5 border border-white/10">
          {([
            { value: "6month" as const, label: "6 Months", badge: "Best Value" },
            { value: "monthly" as const, label: "Monthly", badge: null },
            { value: "annual" as const, label: "Annual", badge: "Save 20%" },
          ]).map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setBillingPeriod(option.value)}
              className={cn(
                "relative px-4 py-2 rounded-md text-sm font-semibold transition-all flex items-center gap-2",
                billingPeriod === option.value
                  ? "bg-blue-500/20 text-white border border-blue-400/50"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              )}
            >
              {option.label}
              {option.badge && billingPeriod === option.value && (
                <span className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded-full",
                  option.value === "6month"
                    ? "bg-yellow-500/20 text-yellow-400"
                    : "bg-green-500/20 text-green-400"
                )}>
                  {option.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-6xl mx-auto">
        {plans.map((plan, index) => (
          <motion.div
            key={index}
            initial={{ y: 50, opacity: 1 }}
            whileInView={
              isDesktop
                ? {
                    y: plan.isPopular ? -20 : 0,
                    opacity: 1,
                    scale: index === 0 || index === 2 ? 0.94 : 1.0,
                  }
                : {}
            }
            viewport={{ once: true }}
            transition={{
              duration: 1.6,
              type: "spring",
              stiffness: 100,
              damping: 30,
              delay: 0.4,
              opacity: { duration: 0.5 },
            }}
            className={cn(
              `rounded-2xl border-[1px] p-6 bg-white/10 backdrop-blur-md text-center lg:flex lg:flex-col lg:justify-center relative`,
              plan.isPopular ? "border-blue-400 border-2" : "border-white/20",
              "flex flex-col",
              !plan.isPopular && "mt-5",
              plan.isPopular ? "z-10" : "z-0",
            )}
          >
            {plan.isPopular && (
              <div className="absolute top-0 right-0 bg-blue-500 py-0.5 px-2 rounded-bl-xl rounded-tr-xl flex items-center">
                <Star className="text-white h-4 w-4 fill-current" />
                <span className="text-white ml-1 font-sans font-semibold">Popular</span>
              </div>
            )}
            <div className="flex-1 flex flex-col">
              <p className="text-base font-semibold text-gray-300">{plan.name}</p>
              <div className="mt-6 flex items-center justify-center gap-x-2">
                <span className="text-5xl font-bold tracking-tight text-white transition-all duration-500 ease-out">
                  {plan.price === "Custom"
                    ? "Custom"
                    : `$${billingPeriod === "6month"
                        ? plan.price
                        : billingPeriod === "annual"
                          ? plan.yearlyPrice
                          : (plan.monthlyPrice || plan.yearlyPrice)}`}
                </span>
                {plan.price !== "Custom" && plan.period && (
                  <span className="text-sm font-semibold leading-6 tracking-wide text-gray-300">
                    / {billingPeriod === "6month"
                        ? plan.period
                        : billingPeriod === "annual"
                          ? "mo"
                          : "month"}
                  </span>
                )}
              </div>

              <p className="text-xs leading-5 text-gray-400">
                {plan.price === "Custom"
                  ? "Contact us for pricing"
                  : billingPeriod === "6month"
                    ? "then monthly after 6 months"
                    : billingPeriod === "annual"
                      ? "billed annually"
                      : "billed monthly"}
              </p>

              <ul className="mt-5 gap-2 flex flex-col">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-blue-400 mt-1 flex-shrink-0" />
                    <span className="text-left text-gray-200">{feature}</span>
                  </li>
                ))}
              </ul>

              <hr className="w-full my-4 border-white/20" />

              <Link
                href={plan.href}
                className={cn(
                  buttonVariants({
                    variant: "outline",
                  }),
                  "group relative w-full gap-2 overflow-hidden text-lg font-semibold tracking-tighter",
                  "transform-gpu ring-offset-current transition-all duration-300 ease-out hover:ring-2 hover:ring-blue-400 hover:ring-offset-1 hover:bg-blue-500 hover:text-white",
                  plan.isPopular ? "bg-blue-500 text-white border-blue-400" : "bg-white/10 text-white border-white/20",
                )}
              >
                {plan.buttonText}
              </Link>
              <p className="mt-6 text-xs leading-5 text-gray-400">{plan.description}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
