// Patient-facing copy (widget, booking page, manage page). Burmese strings are a
// first pass and should be reviewed by a native speaker before launch.

export const LOCALES = ["en", "my"] as const;
export type Locale = (typeof LOCALES)[number];

export function toLocale(value: unknown, fallback: Locale = "en"): Locale {
  return LOCALES.includes(value as Locale) ? (value as Locale) : fallback;
}

/** BCP-47 tag for Intl date/time/number formatting. */
export const INTL_LOCALE: Record<Locale, string> = { en: "en-US", my: "my-MM" };
export const LOCALE_LABEL: Record<Locale, string> = { en: "EN", my: "မြန်မာ" };

const en = {
  title: "Book an appointment",
  service: "Service",
  with: "With",
  anyAvailable: "Any available",
  date: "Date",
  time: "Time",
  closed: "Closed",
  noTimes: "No times left on this day.",
  noServices: "Online booking isn't available yet. Please call us.",
  continue: "Continue",
  back: "Back",
  details: "Your details",
  name: "Full name",
  phone: "Phone",
  email: "Email (optional)",
  emailHint: "We'll send your confirmation here.",
  note: "Note (optional)",
  confirm: "Confirm booking",
  booked: "You're booked",
  bookedBody: "We look forward to seeing you.",
  requested: "Request sent",
  requestedBody: "We'll confirm your appointment shortly.",
  manage: "View or cancel",
  another: "Book another",
  loadError: "Couldn't load available times.",
  retry: "Try again",
  timesIn: "Times shown in",
  minutes: (n: number) => `${n} min`,
  earlier: "Earlier dates",
  later: "Later dates",
  // Manage page
  yourAppointment: "Your appointment",
  status: { pending: "Awaiting confirmation", confirmed: "Confirmed", cancelled: "Cancelled", completed: "Completed", no_show: "Missed" },
  cancelAppointment: "Cancel appointment",
  cancelConfirm: "Cancel this appointment?",
  keep: "Keep it",
  yesCancel: "Yes, cancel",
  cancelled: "Your appointment was cancelled.",
  cannotCancel: (h: number) => `Online cancellation closes ${h} hours before the appointment. Please call us to make changes.`,
  call: "Call",
  bookAgain: "Book again",
  notFound: "We couldn't find that appointment.",
  consent: (clinic: string) => `By booking, you agree that ${clinic} may keep these details to manage your appointment.`,
  privacy: "Privacy notice",
  errors: {
    slot_unavailable: "Sorry, that time was just taken. Please pick another.",
    too_many_bookings: "You already have several upcoming appointments here. Please call the clinic to book more.",
    rate_limited: "Too many attempts. Please wait a few minutes and try again.",
    verify_failed: "Please complete the check above and try again.",
    generic: "Something went wrong. Please try again.",
    not_reschedulable: "This appointment can't be changed online anymore. Please call the clinic.",
  } as Record<string, string>,
  reschedule: "Change time",
  rescheduleTitle: "Pick a new time",
  rescheduleConfirm: "Move appointment",
  rescheduled: "Your appointment was moved.",
  pickDate: "Choose a date",
  unavailableTitle: "Not taking online bookings",
  unavailableBody: "This clinic isn't taking online bookings right now. Please contact them directly.",
};

const my: typeof en = {
  title: "ရက်ချိန်းယူရန်",
  service: "ဝန်ဆောင်မှု",
  with: "ဆရာဝန်",
  anyAvailable: "အားလပ်သူ မည်သူမဆို",
  date: "ရက်စွဲ",
  time: "အချိန်",
  closed: "ပိတ်",
  noTimes: "ဒီနေ့အတွက် ရနိုင်သော အချိန် မရှိတော့ပါ။",
  noServices: "အွန်လိုင်း ရက်ချိန်းယူ၍ မရသေးပါ။ ဖုန်းဖြင့် ဆက်သွယ်ပါ။",
  continue: "ဆက်လုပ်မည်",
  back: "နောက်သို့",
  details: "သင့်အချက်အလက်များ",
  name: "အမည်",
  phone: "ဖုန်းနံပါတ်",
  email: "အီးမေးလ် (မထည့်လည်း ရပါသည်)",
  emailHint: "အတည်ပြုချက်ကို ဤနေရာသို့ ပို့ပေးပါမည်။",
  note: "မှတ်ချက် (မထည့်လည်း ရပါသည်)",
  confirm: "ရက်ချိန်း အတည်ပြုမည်",
  booked: "ရက်ချိန်း ရပြီးပါပြီ",
  bookedBody: "တွေ့ဆုံရန် မျှော်လင့်နေပါသည်။",
  requested: "တောင်းဆိုမှု ပို့ပြီးပါပြီ",
  requestedBody: "မကြာမီ အတည်ပြုပေးပါမည်။",
  manage: "ကြည့်ရန် / ပယ်ဖျက်ရန်",
  another: "နောက်ထပ် ရက်ချိန်းယူမည်",
  loadError: "ရနိုင်သော အချိန်များကို ဖွင့်၍ မရပါ။",
  retry: "ထပ်စမ်းမည်",
  timesIn: "အချိန်ဇုန်",
  minutes: (n: number) => `${n} မိနစ်`,
  earlier: "အရင်ရက်များ",
  later: "နောက်ရက်များ",
  yourAppointment: "သင့်ရက်ချိန်း",
  status: { pending: "အတည်ပြုရန် စောင့်ဆိုင်းဆဲ", confirmed: "အတည်ပြုပြီး", cancelled: "ပယ်ဖျက်ပြီး", completed: "ပြီးဆုံး", no_show: "မလာရောက်" },
  cancelAppointment: "ရက်ချိန်း ပယ်ဖျက်မည်",
  cancelConfirm: "ဤရက်ချိန်းကို ပယ်ဖျက်မလား။",
  keep: "မပယ်ဖျက်ပါ",
  yesCancel: "ပယ်ဖျက်မည်",
  cancelled: "သင့်ရက်ချိန်းကို ပယ်ဖျက်ပြီးပါပြီ။",
  cannotCancel: (h: number) => `ရက်ချိန်းမတိုင်မီ ${h} နာရီအတွင်း အွန်လိုင်းမှ ပယ်ဖျက်၍ မရပါ။ ဖုန်းဖြင့် ဆက်သွယ်ပါ။`,
  call: "ဖုန်းခေါ်ရန်",
  bookAgain: "ထပ်မံ ရက်ချိန်းယူရန်",
  notFound: "ထိုရက်ချိန်းကို ရှာမတွေ့ပါ။",
  consent: (clinic: string) => `ရက်ချိန်းယူခြင်းဖြင့် သင့်ရက်ချိန်းကို စီမံရန် ဤအချက်အလက်များကို ${clinic} က သိမ်းဆည်းခွင့်ပြုပါသည်။`,
  privacy: "ကိုယ်ရေးအချက်အလက် မူဝါဒ",
  errors: {
    slot_unavailable: "ထိုအချိန်ကို တစ်ယောက်ယောက် ယူသွားပါပြီ။ အခြားအချိန် ရွေးပါ။",
    too_many_bookings: "ဤဆေးခန်းတွင် လာမည့် ရက်ချိန်းများ အများအပြား ရှိနေပါပြီ။ ထပ်မံယူလိုပါက ဆေးခန်းသို့ ဖုန်းဆက်ပါ။",
    rate_limited: "ကြိုးစားမှု များလွန်းနေပါသည်။ မိနစ်အနည်းငယ် စောင့်ပြီး ထပ်စမ်းပါ။",
    verify_failed: "အပေါ်ရှိ စစ်ဆေးမှုကို ပြီးအောင်လုပ်ပြီး ထပ်စမ်းပါ။",
    generic: "တစ်ခုခု မှားယွင်းသွားပါသည်။ ထပ်စမ်းပါ။",
    not_reschedulable: "ဤရက်ချိန်းကို အွန်လိုင်းမှ ပြောင်း၍ မရတော့ပါ။ ဆေးခန်းသို့ ဖုန်းဆက်ပါ။",
  },
  reschedule: "အချိန်ပြောင်းရန်",
  rescheduleTitle: "အချိန်အသစ် ရွေးပါ",
  rescheduleConfirm: "ရက်ချိန်း ရွှေ့မည်",
  rescheduled: "သင့်ရက်ချိန်းကို ရွှေ့ပြီးပါပြီ။",
  pickDate: "ရက်စွဲ ရွေးပါ",
  unavailableTitle: "အွန်လိုင်း ရက်ချိန်း လက်မခံသေးပါ",
  unavailableBody: "ဤဆေးခန်းသည် ယခု အွန်လိုင်း ရက်ချိန်း လက်မခံသေးပါ။ တိုက်ရိုက် ဆက်သွယ်ပါ။",
};

export const MESSAGES: Record<Locale, typeof en> = { en, my };
export type Messages = typeof en;

export function formatPrice(amount: number, currency: string, locale: Locale) {
  try {
    return new Intl.NumberFormat(INTL_LOCALE[locale], { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${amount.toLocaleString()} ${currency}`;
  }
}
