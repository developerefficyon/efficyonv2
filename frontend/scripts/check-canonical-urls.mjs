// frontend/scripts/check-canonical-urls.mjs
import { readFileSync } from "node:fs"
import { execSync } from "node:child_process"

const FORBIDDEN = [/https?:\/\/efficyon\.com/, /https?:\/\/www\.efficyon\.com/]
const ALLOWLIST = ["lib/site.ts"]

const files = execSync("git ls-files frontend", { encoding: "utf8" })
  .split("\n")
  .filter((f) => /\.(tsx?|mjs|js|json|md)$/.test(f) && !ALLOWLIST.some((a) => f.includes(a)))

let hits = 0
for (const f of files) {
  let body
  try { body = readFileSync(f, "utf8") } catch { continue }
  for (const re of FORBIDDEN) {
    if (re.test(body)) {
      console.error(`✘ hard-coded site URL in ${f}`)
      hits++
    }
  }
}
if (hits) {
  console.error(`\n${hits} file(s) contain hard-coded efficyon.com URLs. Use absoluteUrl() from @/lib/site instead.`)
  process.exit(1)
}
console.log("✓ no hard-coded site URLs outside lib/site.ts")
