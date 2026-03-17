---
name: design-skill
description: Create UI components that match the project's design language. Use this skill for ALL frontend UI work — new components, pages, modals, panels, or any visual changes. References design images in references/images/ to maintain visual consistency.
user-invocable: true
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, Agent
---

# Design Skill — UI Implementation Guide

You are building UI for SuperChat. Before writing any frontend code, you MUST study the reference design images to match their visual style.

## Step 1: Study Reference Designs

Read ALL images in the `references/images/` directory:

```
references/images/
```

Use the Read tool on each image file. Analyze and internalize:
- **Color palette**: background tones, text colors, accent colors, border treatments
- **Typography**: font sizes, weights, letter-spacing, hierarchy
- **Spacing**: padding, margins, gaps between elements
- **Component shapes**: border-radius values, shadow depths, card styles
- **Layout patterns**: sidebar width, header height, content area proportions
- **Interaction states**: hover effects, active states, focus rings
- **Icon style**: size, stroke weight, placement relative to text
- **Overall mood**: clean/minimal vs rich/detailed, light vs dark adaptation

## Step 2: Design Principles (derived from references)

Apply these consistently:
- **Whitespace is premium** — generous padding, never cramped
- **Subtle depth** — use border + very subtle shadow, not heavy drop shadows
- **Muted palette with selective accent** — neutral backgrounds, one or two accent colors for CTAs and active states
- **Consistent radius** — use the same border-radius across similar components (cards, buttons, inputs)
- **Typography hierarchy** — clear size + weight differentiation between headings, body, labels, and captions
- **Smooth transitions** — all interactive state changes should animate (150-300ms ease)
- **Information density** — prioritize scannability, use two-line max for list items

## Step 3: Technical Stack

Build with:
- **shadcn/ui** components as the base — extend, don't replace
- **Tailwind CSS** for all styling — use the project's existing theme tokens (foreground, background, primary, accent, muted, etc.)
- **Lucide React** for icons
- **Motion** (framer-motion) for complex animations, CSS transitions for simple ones
- **`cn()` utility** from `@/lib/utils` for conditional classes

## Step 4: Implementation Rules

1. **Match the reference mood** — if reference images show a clean SaaS style, don't build gaming-style UI
2. **Dark theme first** — this project uses dark mode. All colors must work on dark backgrounds
3. **Responsive** — components should work from 320px to 1920px
4. **Accessibility** — proper aria labels, keyboard navigation, focus visible states
5. **No hardcoded colors** — always use Tailwind theme variables (text-foreground, bg-background, etc.)
6. **Reuse existing components** — check `apps/web/src/components/ui/` before creating new primitives
7. **Keep animations subtle** — micro-interactions, not flashy effects

## Step 5: Quality Check

Before finishing any UI work:
- Does it visually match the reference design language?
- Does it look good in the existing app context (dark theme, sidebar layout)?
- Are hover/focus/active states defined?
- Is the typography hierarchy clear?
- Would a designer approve this?
