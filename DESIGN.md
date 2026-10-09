---
name: Booking Widget
description: Calm card-based clinic booking: grey canvas, white rounded cards, sage green accents.
colors:
  canvas: "oklch(0.925 0.005 110)"
  background: "oklch(0.993 0.002 110)"
  foreground: "oklch(0.21 0.012 130)"
  muted: "oklch(0.962 0.004 110)"
  muted-foreground: "oklch(0.53 0.012 125)"
  border: "oklch(0.92 0.005 110)"
  primary: "oklch(0.55 0.085 132)"
  primary-foreground: "oklch(0.99 0.004 110)"
  ink-pill: "oklch(0.24 0.03 140)"
  sage-soft: "oklch(0.87 0.045 125)"
  sage-deep: "oklch(0.42 0.07 135)"
  tone-green: "oklch(0.45 0.09 140)"
  tone-green-soft: "oklch(0.94 0.04 135)"
  tone-amber: "oklch(0.5 0.1 70)"
  tone-amber-soft: "oklch(0.95 0.06 88)"
  tone-yellow: "oklch(0.8 0.14 85)"
  tone-red: "oklch(0.52 0.16 28)"
  tone-red-soft: "oklch(0.955 0.03 25)"
  tone-blue: "oklch(0.48 0.1 245)"
  tone-blue-soft: "oklch(0.955 0.022 240)"
typography:
  page-title:
    fontFamily: "Archivo, Noto Sans Myanmar, system-ui, sans-serif"
    fontSize: "40px"
    fontWeight: 500
    lineHeight: 1.25
    letterSpacing: "-0.03em"
  display:
    fontFamily: "Archivo, Noto Sans Myanmar, system-ui, sans-serif"
    fontSize: "clamp(2.6rem, 5.6vw, 4.5rem)"
    fontWeight: 500
    lineHeight: 1.02
    letterSpacing: "-0.035em"
  body:
    fontFamily: "Archivo, Noto Sans Myanmar, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.625
  ui:
    fontFamily: "Archivo, Noto Sans Myanmar, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.43
  burmese:
    fontFamily: "Noto Sans Myanmar"
    lineHeight: 1.8
    letterSpacing: "normal"
rounded:
  control: "12px"
  card: "20px"
  panel: "32px"
  pill: "9999px"
---

# Design System: Booking Widget

## Overview

A calm, card-based product modeled on a reference dashboard the user supplied (Oct 10, 2026): a soft grey canvas, white cards with large rounded corners, sage-green accents, pill navigation in a floating frosted header, people shown as tinted initial avatars, and soft status pills with a dot. One look across the landing page, sign-in/up, onboarding and dashboard. (It replaced an earlier "Yangon clinic signboard" direction; none of that remains.)

Two layers keep clinics' brands intact:

- **Kit tokens** (`--background`, `--foreground`, `--muted`, `--border`, `--primary`, `--radius`, `--font`…) drive every shared UI primitive. `ThemeScope` overrides them per clinic, so the booking widget, hosted booking page and manage page wear each clinic's own brand. `DEFAULT_THEME` (`lib/theme/index.ts`) is the same values in hex (sage `#5f7c47` on `#fdfdfb`, Archivo, 12px corners); clinics without their own theme, and the landing demo, start from it.
- **App tokens** (`--canvas`, `--ink-pill`, `--sage-*`, `--tone-*`) are for our own surfaces only. Never use them inside the booking widget or clinic-branded pages.

All tokens live in `app/globals.css` under `:root`.

## Colors

- **Canvas** is the page ground; **background** (warm white) is the card color.
- **Primary** (sage) for primary buttons, active tabs, progress fills, links. **Sage-soft** for chart tints and text selection; **sage-deep** for "seen/completed".
- **Ink-pill** (near-black green) only for the business switcher pill.
- **Status tones** come in pairs: a soft fill with darker ink.

**Status vocabulary** (`STATUS_STYLE` / `STATUS_DOT` in `components/dashboard/status-badge.tsx`, shared by badges and calendar blocks): pending amber (dot `tone-yellow`), confirmed green, completed sage, cancelled struck grey, no-show red. Doctor duty pills: on duty blue, off today red.

**Selection** uses `sage-soft` with ink text; clinic pages select in their own primary (ThemeScope sets `--selection`).

## Typography

Archivo is the only Latin family. Noto Sans Myanmar (loaded with `next/font`, exposed as `--font-myanmar`) renders Burmese under Archivo and under any clinic's brand font; it is Google's well-hinted Unicode Myanmar face and pairs cleanly with Latin.

- **Display** (landing h1): medium weight, tight tracking. **Page titles** 40px medium (`PageHeader`); overview title 48px.
- **UI** 14px, labels 12px/500, figures `tabular-nums`.

### Burmese

- **Line height:** Burmese stacks vowel signs and medials above and below the line. `:lang(my)` sets line-height 1.8 (headings 1.55) and resets letter-spacing. The rule is unlayered so it beats the tight `leading-*` / `tracking-*` utilities. Anything Burmese must sit inside an element with `lang="my"`.
- **Line breaks:** Burmese has no spaces between words and browsers break it mid-word. Headings render through `<Phrases>` (`components/i18n/phrases.tsx`), which only wraps at spaces; the copy puts a space between phrases.
- **Size:** Burmese headings step down a size (it runs long and tall); see the `my ?` branches on the landing page and auth panel.
- **Dates and times:** never format Burmese with `Intl`. Browsers ship different (or no) Burmese locale data, so server and browser disagree and hydration breaks. `lib/format.ts` composes Burmese by hand (Burmese month/weekday names, Western digits, 24-hour time, ICU order `y MMMM d EEEE`); pass `locale` to `fmtTime`, `fmtDate`, `fmtLocalDate`, `fmtClock`, `fmtMinutes`, `fmtMoney`. Covered by `lib/format.test.ts`.

## Localization

Everything we own is localized in English and Myanmar: landing, sign-in/up, password pages, onboarding, the brand studio and the whole dashboard (pages, dialogs, toasts and Server Action messages). One language at a time, never the same line twice in two languages. Copy lives in `lib/site-copy.ts` (dashboard under `t.dash`, from `lib/copy/dashboard.ts`); the choice is a `site_locale` cookie (`getSiteCopy()` on the server, including in Server Actions; `useSiteCopy()` in client components; `LanguageSwitch` in every header). Validation schemas in actions are functions of the message set so errors follow the visitor's language. Booking errors are mapped by `BookingErrorCode`, and clients check `ActionResult.code`, never message text. Patient-facing copy (widget, booking page, manage page) lives separately in `lib/i18n.ts`.

## Layout

- **Site:** 72rem (`max-w-6xl`) column on the canvas under the floating header: hero (promise beside the booking demo on a sage-glow panel), the brand studio in one large white card, a features bento (sage-glow heading card plus white feature cards), a sage-glow closing card, a white footer strip.
- **Auth and onboarding:** `SplitLayout` (`components/brand/split-layout.tsx`): sage-glow panel beside a white form card, both rounded 32px on the canvas, language switch top-right. On phones the panel is hidden and the logo sits above the form. Onboarding's panel is a live preview card of the clinic being created.
- **Dashboard:** floating top bar over an 80rem (`max-w-7xl`) column of cards.

## Elevation

Mostly flat: white on grey does the separating. Exceptions: the floating header (`floatingBar` in `components/brand/styles.ts`: frosted, a soft short shadow), dialogs and menus, and cards lifted off a sage-glow panel (demo and preview cards).

**Sage glow** (`.sage-glow`) is the one gradient field: booking-link card, landing hero panel, features heading card, closing card and auth panels.

## Shapes

Controls 12px (`--radius`), cards 20px (`rounded-[1.25rem]`), large panels 32px, tabs, chips and primary site buttons are pills. Inner tiles inside cards are `bg-muted rounded-2xl`.

## Components

- **Header** (site and dashboard): logo mark (round sage, wordmark hidden on phones in the site header), pill tabs on `bg-muted`, round icon buttons. The dashboard's Setup tab is a menu that shows the current setup page when active. Sticky content below it offsets by `top-24`.
- **Lists** (`components/ui/list.tsx`): `List` is a white card with even inner padding and no divider lines; `listRow` rows highlight as a rounded pill inset from the edges. Use it for every clickable list.
- **Avatar** (`components/ui/avatar.tsx`): initials without honorifics, tint chosen by name.
- **Calendar** (`app/dashboard/[biz]/calendar`, date ranges in `lib/scheduling/calendar.ts`): Day (a column per doctor), Week (a column per date) and Month (six-week grid, three appointments per day then "+N more"), with Today / previous / next, a date picker, a doctor filter and the view switch; state lives in the URL (`view`, `date`, `doctor`). Day and Week share `TimeGrid` (working hours white, the rest shaded, closures and time off as grey bands, a now-line, overlapping appointments side by side via `layoutLanes` in `lib/scheduling/lanes.ts`); Month is `MonthGrid`. Weeks start on Monday.
- **Overview** (`app/dashboard/[biz]/page.tsx`, widgets in `components/dashboard/overview/`): today's progress (seen / confirmed / pending bar with markers, four ringed stat tiles), doctors on duty, today's appointments (time-led rows, "Add new"), next-7-days load, clinic hours progress, today's flow with a status donut, and the booking-link card.
- **Brand studio** (`components/studio`): website detection, fine-tune editor and the widget preview (the booking form alone, at desktop or phone width, no mock website around it). The font field is a searchable `FontPicker` of popular Google Fonts grouped by style, each shown in its own face; any other Google Font name can be typed.
- **Booking demo** (`components/marketing/booking-demo.tsx`): the landing page's working booking card. Doctor rows show next open times as pill chips; tapping one opens an inline form (grid-rows reveal, 300ms ease-out-expo) that ends in a green "Booked" pill pressed in with `animate-stamp` (420ms). Offline demo API, labeled as a demo.

## Layout stability

Nothing should shift when navigating or opening things:
- `scrollbar-gutter: stable` on `<html>` reserves the scrollbar's space; canvas pages paint the root grey so the gutter blends in, and the Radix scroll-lock margin is cancelled (`globals.css`).
- Tabs and segmented controls keep one font weight whether active or not; the Setup tab always reads "Setup".
- The calendar's time grid fits the remaining viewport (one scrollbar, sticky header).
- `Field` stacks from the top so side-by-side fields align when only one has a hint.

## Do's and Don'ts

### Do:
- Do keep dashboard controls standard: tables, selects, dialogs, buttons from the kit.
- Do put every user-facing string of our site in `lib/site-copy.ts`, in both languages.
- Do wrap Burmese in `lang="my"` and render headings through `<Phrases>`.

### Don't:
- Don't show the same sentence in English and Burmese side by side; localize instead.
- Don't use app tokens inside the booking widget or clinic-branded pages.
- Don't hardcode brand colors in kit primitives; they read CSS variables.
- Don't add motion beyond state feedback in the dashboard.
