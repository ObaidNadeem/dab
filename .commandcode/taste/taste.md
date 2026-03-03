# Taste (Continuously Learned by [CommandCode][cmd])

[cmd]: https://commandcode.ai/

# React 19
- Use ref as a regular prop — do NOT use forwardRef (React 19 pattern). Confidence: 0.85
- Do NOT use manual useMemo or useCallback — rely on React Compiler for memoization. Confidence: 0.85
- Use 'use client' directive on all interactive components. Confidence: 0.80

# Next.js
- Use Next.js 16 with App Router and Turbopack. Confidence: 0.80
- Use next.config.ts (TypeScript, NOT .js) with typed NextConfig. Confidence: 0.80
- Server Component pages should be thin wrappers that render client component workspaces. Confidence: 0.70

# Tailwind CSS
- Use Tailwind CSS v4 with CSS-first configuration (@import "tailwindcss", @theme blocks). No tailwind.config.ts or tailwind.config.js file. Confidence: 0.85

# TypeScript
- Use TypeScript 5.7+ in strict mode. Confidence: 0.80

# State Management
- Use Zustand 5 for state management with fine-grained selectors for performance. Confidence: 0.80

# Dependencies
- No external dependencies beyond what's explicitly specified — build everything else from scratch. Confidence: 0.75

# SSR Safety
- Only access localStorage inside useEffect (client-side only) for SSR safety. Confidence: 0.80

# Design System
- Use system fonts only, no external/downloaded fonts. Mono stack (primary, most UI): 'SF Mono', 'Cascadia Code', 'Fira Code', 'JetBrains Mono', monospace. Sans stack (secondary, body text only): -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif. App is monospace-dominant. Confidence: 0.70
- Use CSS custom property names `--mono` and `--sans` (NOT `--font-mono`/`--font-sans`). Confidence: 0.75
- Monochromatic color palette only — no accent blues, error reds, or colored highlights. Confidence: 0.65

# Code Style
- In React inline styles, don't mix CSS shorthand and non-shorthand properties for the same value (e.g., don't use both `border` and `borderColor` — use separate `borderWidth`, `borderStyle`, `borderColor` instead). Confidence: 0.70
