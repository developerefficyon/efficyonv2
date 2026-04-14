"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Zap, ShieldCheck, AlertTriangle, Loader2, Plug, BookOpen } from "lucide-react"
import Link from "next/link"
import { useToolConnect } from "@/lib/tools/use-tool-connect"
import type { UnifiedToolConfig } from "@/lib/tools/types"

interface ToolConnectFormProps {
  config: UnifiedToolConfig
  onCancel: () => void
  onSuccess: () => void
}

export function ToolConnectForm({ config, onCancel, onSuccess }: ToolConnectFormProps) {
  const { values, setValues, isConnecting, connect } = useToolConnect(config, onSuccess)

  const setField = (name: string, value: string) => setValues({ ...values, [name]: value })

  const canSubmit =
    !isConnecting &&
    config.authFields.every((f) => !f.required || (values[f.name] ?? "").toString().trim())

  return (
    <div className="space-y-4">
      {config.authFields.map((field) => (
        <div key={field.name} className="space-y-1.5">
          <Label htmlFor={`${config.id}-${field.name}`} className="text-white/50 text-[12px] font-medium">
            {field.label} {field.required && <span className="text-red-400/70">*</span>}
            {!field.required && <span className="text-white/25 font-normal"> (optional)</span>}
          </Label>

          {field.type === "textarea" && (
            <textarea
              id={`${config.id}-${field.name}`}
              placeholder={field.placeholder}
              value={values[field.name] || ""}
              onChange={(e) => setField(field.name, e.target.value)}
              autoComplete="off"
              spellCheck={false}
              rows={6}
              className="w-full bg-white/[0.03] border border-white/[0.06] text-white/80 text-[11px] font-mono rounded-lg p-3 focus:border-emerald-500/30 focus:ring-1 focus:ring-emerald-500/10 placeholder:text-white/15 transition-all resize-y"
            />
          )}

          {field.type === "select" && (
            <select
              id={`${config.id}-${field.name}`}
              value={values[field.name] || field.options?.[0]?.value || ""}
              onChange={(e) => setField(field.name, e.target.value)}
              className="w-full bg-white/[0.03] border border-white/[0.06] text-white/80 rounded-lg px-3 py-2.5 text-[13px] focus:border-emerald-500/30 outline-none transition-all"
            >
              {field.options?.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          )}

          {(field.type === "text" || field.type === "password") && (
            <Input
              id={`${config.id}-${field.name}`}
              type={field.type}
              placeholder={field.placeholder}
              value={values[field.name] || ""}
              onChange={(e) => setField(field.name, e.target.value)}
              autoComplete={field.type === "password" ? "new-password" : "off"}
              data-1p-ignore
              data-lpignore="true"
              className="bg-white/[0.03] border-white/[0.06] text-white/80 text-[13px] rounded-lg h-10 focus:border-emerald-500/30 focus:ring-1 focus:ring-emerald-500/10 placeholder:text-white/15 transition-all"
            />
          )}

          {field.hint && <p className="text-[10.5px] text-white/15">{field.hint}</p>}
        </div>
      ))}

      {config.quickSetup && (
        <div className="relative p-3.5 rounded-xl bg-gradient-to-b from-white/[0.025] to-white/[0.01] border border-white/[0.05] mt-5">
          <div className="flex items-center gap-2 mb-2.5">
            <div className="w-4 h-4 rounded-md bg-emerald-500/10 flex items-center justify-center">
              <Zap className="w-2.5 h-2.5 text-emerald-400/70" />
            </div>
            <p className="text-[11.5px] font-medium text-white/50">{config.quickSetup.title}</p>
          </div>
          <ol className="text-[11.5px] text-white/30 space-y-2 ml-0.5">
            {config.quickSetup.steps.map((step, idx) => (
              <li key={idx} className="flex gap-2.5">
                <span className="text-emerald-400/40 font-mono text-[10px] mt-px shrink-0">
                  {String(idx + 1).padStart(2, "0")}
                </span>
                {step}
              </li>
            ))}
          </ol>
          {config.quickSetup.note && (
            <p className="text-[10px] text-white/15 mt-2.5 pt-2.5 border-t border-white/[0.04] font-mono">
              {config.quickSetup.note}
            </p>
          )}
          <div className="mt-3 pt-2.5 border-t border-white/[0.04] flex items-center justify-end">
            <Link
              href={`/dashboard/tools/guide#${config.id}`}
              onClick={onCancel}
              className="inline-flex items-center gap-1 text-[11px] text-emerald-400/50 hover:text-emerald-400/80 transition-colors shrink-0"
            >
              <BookOpen className="w-3 h-3" />
              Guide
            </Link>
          </div>
        </div>
      )}

      {config.callouts?.map((callout, idx) => {
        const Icon = callout.type === "warning" ? AlertTriangle : ShieldCheck
        const colorClass =
          callout.type === "success"
            ? "from-emerald-500/[0.02] to-emerald-500/[0.005] border-emerald-500/[0.08] text-emerald-400/50"
            : "from-white/[0.025] to-white/[0.01] border-white/[0.05] text-white/50"
        return (
          <div
            key={idx}
            className={`relative p-3.5 rounded-xl bg-gradient-to-b ${colorClass} mt-3`}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-4 h-4 rounded-md bg-emerald-500/[0.08] flex items-center justify-center">
                <Icon className="w-2.5 h-2.5" />
              </div>
              <p className="text-[11.5px] font-medium">{callout.title}</p>
            </div>
            <p className="text-[11px] text-white/25 leading-relaxed pl-6">
              {callout.body}{" "}
              {callout.link && (
                <Link
                  href={callout.link}
                  onClick={onCancel}
                  className="text-emerald-400/50 hover:text-emerald-400/80 transition-colors"
                >
                  Learn more
                </Link>
              )}
            </p>
          </div>
        )
      })}

      <div className="flex justify-end gap-2.5 pt-2">
        <Button
          variant="outline"
          onClick={onCancel}
          className="border-white/[0.06] bg-white/[0.02] text-white/40 hover:text-white/70 hover:bg-white/[0.05] rounded-lg h-9 text-[12.5px] px-4 transition-all"
        >
          Cancel
        </Button>
        <Button
          onClick={() => void connect()}
          disabled={!canSubmit}
          className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold disabled:opacity-30 disabled:hover:bg-emerald-500 rounded-lg h-9 text-[12.5px] px-5 transition-all shadow-[0_0_20px_-4px_rgba(52,211,153,0.3)] hover:shadow-[0_0_24px_-2px_rgba(52,211,153,0.4)] disabled:shadow-none"
        >
          {isConnecting ? (
            <>
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              Connecting…
            </>
          ) : (
            <>
              <Plug className="w-3 h-3 mr-1.5" />
              Connect
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
