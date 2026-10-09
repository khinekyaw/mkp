import type { Vertical } from "./settings";

// Client-safe starter content (also previewed live during onboarding).

export type Starter = { name: string; nameMy: string; durationMin: number; bufferMin?: number; price?: number };

export const STARTER_SERVICES: Record<Vertical, Starter[]> = {
  clinic: [
    { name: "General consultation", nameMy: "အထွေထွေ ဆေးစစ်ခြင်း", durationMin: 20, price: 15000 },
    { name: "Follow-up visit", nameMy: "ပြန်လည်ပြသခြင်း", durationMin: 15, price: 10000 },
    { name: "Health check-up", nameMy: "ကျန်းမာရေး စစ်ဆေးခြင်း", durationMin: 45, price: 40000 },
  ],
  dental: [
    { name: "Dental check-up", nameMy: "သွားစစ်ဆေးခြင်း", durationMin: 30, price: 20000 },
    { name: "Teeth cleaning", nameMy: "သွားဆေးကြောခြင်း", durationMin: 45, bufferMin: 10, price: 35000 },
    { name: "Tooth filling", nameMy: "သွားဖာခြင်း", durationMin: 60, bufferMin: 10, price: 50000 },
  ],
  salon: [
    { name: "Haircut", nameMy: "ဆံပင်ညှပ်ခြင်း", durationMin: 45, price: 15000 },
    { name: "Hair coloring", nameMy: "ဆံပင်ဆိုးခြင်း", durationMin: 120, price: 60000 },
    { name: "Wash & blow-dry", nameMy: "ခေါင်းလျှော်၊ လေမှုတ်ခြင်း", durationMin: 30, price: 8000 },
  ],
  spa: [
    { name: "Massage", nameMy: "နှိပ်နယ်ခြင်း", durationMin: 60, bufferMin: 15, price: 30000 },
    { name: "Facial", nameMy: "မျက်နှာအလှပြင်ခြင်း", durationMin: 60, bufferMin: 15, price: 35000 },
  ],
  other: [{ name: "Consultation", nameMy: "တိုင်ပင်ဆွေးနွေးခြင်း", durationMin: 30 }],
};

/** Mon–Fri 9:00–12:00 & 13:00–17:00, Sat 9:00–13:00. */
export const DEFAULT_HOURS = [
  ...[1, 2, 3, 4, 5].flatMap((weekday) => [
    { weekday, startMin: 9 * 60, endMin: 12 * 60 },
    { weekday, startMin: 13 * 60, endMin: 17 * 60 },
  ]),
  { weekday: 6, startMin: 9 * 60, endMin: 13 * 60 },
];
