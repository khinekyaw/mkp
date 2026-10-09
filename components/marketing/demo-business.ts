import type { PublicBusiness } from "@/lib/business/public";
import { DEFAULT_THEME } from "@/lib/theme";

/** Fictional clinic for the landing-page demo (offline; nothing is saved). */
export const DEMO_BUSINESS: PublicBusiness = {
  id: "demo",
  slug: "sunrise-clinic",
  name: "Sunrise Clinic",
  phone: "09 123 456 789",
  address: "Yangon",
  timezone: "Asia/Yangon",
  theme: DEFAULT_THEME,
  locales: ["en", "my"],
  vertical: "clinic",
  allowProviderChoice: true,
  horizonDays: 30,
  services: [
    { id: "consult", name: "General consultation", nameMy: "အထွေထွေ ဆေးစစ်ခြင်း", description: null, durationMin: 20, price: 15000, currency: "MMK", providerIds: ["gp", "peds"] },
    { id: "dental", name: "Dental check-up", nameMy: "သွားစစ်ဆေးခြင်း", description: null, durationMin: 30, price: 20000, currency: "MMK", providerIds: ["dent"] },
    { id: "vaccine", name: "Child vaccination", nameMy: "ကလေး ကာကွယ်ဆေးထိုးခြင်း", description: null, durationMin: 15, price: 8000, currency: "MMK", providerIds: ["peds"] },
    { id: "followup", name: "Follow-up visit", nameMy: "ပြန်လည်ပြသခြင်း", description: null, durationMin: 15, price: 10000, currency: "MMK", providerIds: ["gp", "peds"] },
  ],
  providers: [
    { id: "gp", name: "Dr. Aye Aye Khaing", title: "General Practitioner" },
    { id: "peds", name: "Dr. Su Su Hlaing", title: "Pediatrician" },
    { id: "dent", name: "Dr. Min Thu", title: "Dentist" },
  ],
};
