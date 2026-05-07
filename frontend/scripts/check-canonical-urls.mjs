// frontend/scripts/check-canonical-urls.mjs
//
// Runs from the repo root OR from frontend/. We resolve the repo root via
// `git rev-parse` so paths are stable regardless of the cwd.
import { readFileSync } from "node:fs"
import { execSync } from "node:child_process"
import { join } from "node:path"

const FORBIDDEN = [/https?:\/\/efficyon\.com/, /https?:\/\/www\.efficyon\.com/]
// Path fragments that are allowed to contain the literal site URL.
// Exact-match files plus the whole dashboard tree (robots-disallowed,
// not part of the public SEO surface).
const ALLOWLIST_FILES = ["frontend/lib/site.ts", "frontend/scripts/check-canonical-urls.mjs"]
const ALLOWLIST_PREFIXES = ["frontend/app/dashboard/"]

const repoRoot = execSync("git rev-parse --show-toplevel", { encoding: "utf8" }).trim()
const files = execSync("git ls-files frontend", { cwd: repoRoot, encoding: "utf8" })
  .split("\n")
  .map((f) => f.trim())
  .filter(
    (f) =>
      /\.(tsx?|mjs|js|json|md)$/.test(f) &&
      !ALLOWLIST_FILES.some((a) => f === a) &&
      !ALLOWLIST_PREFIXES.some((p) => f.startsWith(p))
  )

let hits = 0
for (const rel of files) {
  const abs = join(repoRoot, rel)
  let body
  try { body = readFileSync(abs, "utf8") } catch { continue }
  for (const re of FORBIDDEN) {
    if (re.test(body)) {
      console.error(`✘ hard-coded site URL in ${rel}`)
      hits++
    }
  }
}
if (hits) {
  console.error(`\n${hits} file(s) contain hard-coded efficyon.com URLs. Use absoluteUrl() from @/lib/site instead.`)
  process.exit(1)
}
console.log("✓ no hard-coded site URLs outside lib/site.ts")
