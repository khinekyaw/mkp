# Product

## Platform

web

## Users

- **Clinic owners** (small private clinics in Myanmar, Yangon first: GPs, dentists, pediatricians) deciding whether to put booking online. They evaluate on a phone (often arriving from Facebook) or a laptop.
- **Front-desk staff** who run the day: they take phone and walk-in bookings, confirm requests, and mark visits completed or missed, at a reception PC or on a phone.
- **Patients** who book from the clinic's website, Facebook page or Viber link, in Burmese or English, mostly on Android phones.

## Product Purpose

An appointment booking product for small clinics. Its differentiator is that the booking widget automatically takes on the clinic's own brand (colors, fonts, corner style) so it looks built-in rather than bolted-on. Success: clinics move booking off phone calls and Facebook messages, and patients book in a few taps in their language.

## Positioning

Global tools (Calendly, Cal.com, Calfrenzy) only let clinics pick colors by hand and have no Myanmar presence. This product reads the clinic's real site design automatically, speaks Burmese, and fits how Myanmar clinics work (doctor-by-doctor schedules, phone-first patients, Facebook/Viber links instead of websites).

## Operating Context

- Clinics today book by phone calls and Facebook Messenger, and keep a paper appointment register at reception.
- Many clinics have no website; a hosted booking page shared on Facebook/Viber or printed as a QR code is as important as the embed.
- Clinics run doctor-by-doctor schedules (each doctor has their own hours and days), with lunch breaks and public-holiday closures.
- Patients identify by phone number (09… / +959… formats).

## Capabilities and Constraints

- Multi-tenant dashboard: calendar by doctor, appointments, customers, services, staff and hours, appearance (AI theming), share & embed, settings.
- Patient booking via embed (`embed.js`), hosted page (`/b/[slug]`), and a manage/cancel link.
- English and Burmese for patients; dashboard is English for now.
- Payments are deferred (KBZPay/Wave/2C2P researched, not built).
- The booking widget's look belongs to each clinic's brand; product branding never overrides it.

## Brand Commitments

- Working name "Booking Widget" (not final).
- Visual direction (Oct 10, 2026): a calm card-based look from a reference dashboard the user supplied: grey canvas, white rounded cards, sage green accents (see DESIGN.md). It replaced an earlier "Yangon clinic signboard" direction.
- Our site (landing, sign-in/up, onboarding) is localized in English and Myanmar with a language switch; the dashboard is English for now.

## Evidence on Hand

- A seeded demo clinic ("Golden Lotus Clinic") and a sample customer site (`public/demo.html`) for demonstrations. Both are fictional.
- No customers, testimonials, pricing, press or usage numbers exist yet. Do not invent them.

## Product Principles

1. The clinic's brand comes first inside the widget; our brand lives in the product around it.
2. Booking should work from the first thing a patient sees (sign, link, or page), not after navigation.
3. Burmese is a first-class language, not a translation afterthought.
4. Front-desk work must stay fast and familiar; decoration never slows a task.

## Accessibility & Inclusion

- Burmese script must render correctly under every font (bundled Noto Sans Myanmar fallback).
- Patients use low-end Android phones on mobile data; keep pages light.
