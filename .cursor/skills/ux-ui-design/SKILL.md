---
name: ux-ui-design
description: Apply UX and UI design best practices when building or modifying user interfaces. Use when designing screens, components, or flows; when the user mentions UX, UI, design, usability, accessibility, or interface.
---

# UX / UI / Design

Apply these principles when creating or refining user interfaces so they are usable, clear, and visually coherent.

## UX (Usability)

- **One primary goal per screen** — avoid crowding; secondary actions can be secondary (e.g. "More" or moved).
- **Clear hierarchy** — most important content and actions are visually and structurally first.
- **Consistent patterns** — same action same place (e.g. primary button position, navigation pattern).
- **Immediate feedback** — loading states, success/error messages, disabled states for actions in progress.
- **Forgiveness** — confirm destructive actions; allow undo where feasible; clear cancel/back.
- **Progressive disclosure** — show essentials first; advanced options in expand/collapse or secondary step.
- **Labels over placeholders** — prefer visible labels; placeholders as hint only, not sole label (accessibility).

## UI (Visual & Layout)

- **Spacing system** — use a consistent scale (e.g. 4px/8px) for padding, margins, gaps; avoid arbitrary values.
- **Typography scale** — limited set of sizes and weights; clear heading vs body; readable line height (e.g. 1.4–1.6).
- **Color roles** — primary, secondary, surface, border, text (primary/secondary/muted), success/warning/error; sufficient contrast.
- **Touch targets** — minimum ~44×44px for interactive elements on touch devices.
- **Alignment** — align to a grid; consistent alignment of labels, inputs, and buttons across forms/sections.
- **Whitespace** — use space to group related items and separate unrelated ones; avoid cramped layouts.

## Design Quality

- **Clarity over cleverness** — copy and layout should be immediately understandable.
- **Consistency** — reuse the same components and patterns; don’t invent one-off controls without reason.
- **Accessibility baseline** — semantic HTML, focus states, sufficient contrast (WCAG AA where possible), and keyboard operability for key flows.
- **Responsiveness** — consider small viewports: stack or simplify; avoid horizontal scroll for main content.

## Quick Checklist

When implementing or reviewing UI:

- [ ] One clear primary action per view/section
- [ ] Loading and error states for async actions
- [ ] Consistent spacing and typography
- [ ] Labels (or visible text) for inputs; placeholders optional
- [ ] Adequate touch target size on mobile
- [ ] Focus visible and keyboard navigable
- [ ] No critical information by color alone
- [ ] Destructive actions confirmed

## When to Apply

Use this skill when:

- Building or refactoring pages, layouts, or components
- User asks for "better UX", "cleaner UI", or "improve the design"
- Adding forms, wizards, or multi-step flows
- Polishing feedback (toasts, errors, empty states)
- Discussing accessibility or usability
