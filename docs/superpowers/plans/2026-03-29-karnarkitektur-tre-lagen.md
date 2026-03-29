# Kärnarkitektur — De tre lägena

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dela appen i tre tydliga lägen (Planera / Handla / Laga) med optimerade UI:n per situation, ny navbar-struktur och PWA offline-stöd.

**Architecture:** Navbar byggs om med tre lägestabbar i mitten. Shopping active (`/shopping/active`) är ett nytt touch-optimerat läge för användning i butiken. Cook mode (`/cook/[recipeId]`) är ett steg-för-steg-läge vid spisen med timer, röststyrning och AI-substitut. En ny API-route `/api/cook/steps` parsear fritext-instruktioner till strukturerade steg via AI första gången ett recept öppnas i lagaläget.

**Tech Stack:** Next.js App Router, Supabase, Anthropic claude-opus-4-6, Web APIs (Wake Lock, Speech Recognition, Notifications), next-pwa (redan installerat).

---

## Filstruktur

| Fil | Status | Ansvar |
|-----|--------|--------|
| `components/Navbar.js` | Modifiera | Tre lägestabbar i mitten, hushåll+inställningar till höger |
| `app/shopping/active/page.js` | Skapa | Touch-optimerat handlaläge med Wake Lock och offline |
| `app/cook/[recipeId]/page.js` | Skapa | Steg-för-steg lagaläge med timer, röst, substitut, betyg |
| `app/api/cook/steps/route.js` | Skapa | Parsear instructions → strukturerade steg via AI |
| `app/recipes/[id]/page.js` | Modifiera | Lägg till "Börja laga"-knapp |
| `next.config.js` | Modifiera | PWA runtimeCaching för shopping och recipes |

---

## Task 1: Navbar — Tre lägestabbar

**Files:**
- Modify: `components/Navbar.js`

- [ ] Skriv om Navbar.js med ny struktur

- [ ] Commit: `git commit -m "feat: navbar med tre lägestabbar"`

---

## Task 2: `/shopping/active/page.js`

**Files:**
- Create: `app/shopping/active/page.js`

- [ ] Skapa sidan
- [ ] Commit: `git commit -m "feat: handlaläge /shopping/active"`

---

## Task 3: `/api/cook/steps/route.js`

**Files:**
- Create: `app/api/cook/steps/route.js`

- [ ] Skapa route
- [ ] Commit: `git commit -m "feat: /api/cook/steps parsear instruktioner till steg"`

---

## Task 4: `/cook/[recipeId]/page.js`

**Files:**
- Create: `app/cook/[recipeId]/page.js`

- [ ] Skapa sidan
- [ ] Commit: `git commit -m "feat: lagaläge /cook/[recipeId]"`

---

## Task 5: Länka receptsidan till lagaläget

**Files:**
- Modify: `app/recipes/[id]/page.js`

- [ ] Lägg till "Börja laga"-knapp
- [ ] Commit

---

## Task 6: PWA runtimeCaching

**Files:**
- Modify: `next.config.js`

- [ ] Uppdatera med runtimeCaching
- [ ] Commit
