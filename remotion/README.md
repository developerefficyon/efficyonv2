# Efficyon — Remotion

Programmatic video assets for the Efficyon marketing site. Built with [Remotion](https://www.remotion.dev/) — videos are React components, rendered to MP4/WebM via the CLI, and consumed by `frontend/public/videos/*`.

## Setup

```bash
cd remotion
npm install
```

## Local preview

```bash
npm run dev          # opens Remotion Studio at http://localhost:3000
```

Pick a composition from the left rail (`HeroLoop`, `HeroLoopSquare`, `HeroLoopVertical`) and scrub the timeline.

## Render

```bash
npm run render:hero          # 1920×1080 MP4  → ../frontend/public/videos/hero-loop.mp4
npm run render:hero-webm     # VP9 WebM        → ../frontend/public/videos/hero-loop.webm
npm run render:hero-square   # 1080×1080 MP4   → ../frontend/public/videos/hero-loop-square.mp4
```

The output paths are relative to `remotion/`, so MP4s land directly in the Next.js `public/` directory and become servable at `/videos/hero-loop.mp4` without an extra copy step.

## Compositions

| ID                  | Size          | Use                                      |
| ------------------- | ------------- | ---------------------------------------- |
| `HeroLoop`          | 1920 × 1080   | Homepage hero (`app/page.tsx`)           |
| `HeroLoopSquare`    | 1080 × 1080   | LinkedIn / X / IG feed                   |
| `HeroLoopVertical`  | 1080 × 1920   | IG Stories / Reels / TikTok              |

All three render the same `HeroLoop` component — Remotion handles the responsive adaptation via `useVideoConfig()`. Adjust per-aspect details inside the component if needed.

## Aesthetic guardrails

Match the homepage:

- **Background** `#080809`
- **Accent green** `#00D17A`
- **Headline** Instrument Serif italic (accent words) + DM Sans (the rest)
- **Tabular / labels** JetBrains Mono, uppercase, `letter-spacing: 0.16–0.22em`
- **No CSS transitions or Tailwind animations** — Remotion forbids them. Use `useCurrentFrame()` + `interpolate()` + `spring()` only.

## Wiring into the homepage

After rendering, replace the static hero on the homepage with a looping video:

```tsx
// frontend/app/page.tsx — inside Hero()
<video
  autoPlay
  muted
  loop
  playsInline
  poster="/videos/hero-loop.jpg"
  className="absolute inset-0 -z-10 h-full w-full object-cover opacity-80"
>
  <source src="/videos/hero-loop.webm" type="video/webm" />
  <source src="/videos/hero-loop.mp4" type="video/mp4" />
</video>
```

Render a poster frame too:

```bash
npx remotion still HeroLoop ../frontend/public/videos/hero-loop.jpg --frame=60
```

## Adding a new composition

1. Create `src/<Name>/<Name>.tsx` exporting a React component.
2. Register it in `src/Root.tsx` with width / height / fps / duration.
3. Add a `render:<name>` script in `package.json`.

## Skill

The official `remotion-best-practices` skill is loaded for this repo. When working on Remotion code, Claude will use the skill's domain rules (timing, sequencing, fonts, captions, audio, transitions). No CSS animations, no Tailwind animation classes — they don't render.
