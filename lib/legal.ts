import type { Locale } from "./i18n";

// Plain-language Privacy Policy and Terms. Have them reviewed before launch;
// the operator's legal name and contact come from env so they're never guessed.

export const LEGAL_UPDATED = "2026-10-10";
const ENTITY = process.env.NEXT_PUBLIC_LEGAL_ENTITY || "Booking Widget";
const CONTACT = process.env.NEXT_PUBLIC_CONTACT_EMAIL;

export type LegalDoc = { title: string; intro: string; sections: { heading: string; body: string[] }[] };

const contactLine = {
  en: CONTACT ? `Email us at ${CONTACT}.` : "Contact us through the support link in your dashboard.",
  my: CONTACT ? `${CONTACT} သို့ အီးမေးလ် ပို့ပါ။` : "ဒက်ရှ်ဘုတ်ရှိ အကူအညီ လင့်ခ်မှ ဆက်သွယ်ပါ။",
};

const privacy: Record<Locale, LegalDoc> = {
  en: {
    title: "Privacy Policy",
    intro: `${ENTITY} ("we") runs online booking for clinics. This explains what we store, why, and what you can do about it. When you book with a clinic, that clinic decides how your appointment is handled; we keep the details on its behalf.`,
    sections: [
      {
        heading: "What we collect",
        body: [
          "Patients: your name, phone number, and optionally your email and a note, plus the appointment you booked and your language.",
          "Clinic staff: name, email and a securely hashed password, and the clinic details you enter.",
          "Technical: your IP address and browser details, used for security and to stop abuse, and cookies that keep staff signed in. We don't use advertising trackers.",
        ],
      },
      {
        heading: "How we use it",
        body: [
          "To book, confirm, remind and change appointments, show clinics their schedule, keep the service secure, and help when something goes wrong.",
          "We never sell personal data or use it for advertising.",
        ],
      },
      {
        heading: "Who sees it",
        body: [
          "The clinic you book with, and the team members it invites.",
          "Companies that run parts of the service for us: hosting and database, email delivery, bot protection, and an AI service that reads a clinic's public website to match its colors (it never receives patient data).",
          "Authorities, only when the law requires it.",
        ],
      },
      {
        heading: "How long we keep it",
        body: [
          "For as long as the clinic uses the service. Clinics can download or delete their data at any time; a deleted clinic's data is erased for good after 30 days.",
          "Patients can ask the clinic, or us, to correct or delete their details.",
        ],
      },
      {
        heading: "Security",
        body: ["Connections are encrypted, passwords are hashed, and each clinic's data is only visible to its own team. We keep backups so data isn't lost."],
      },
      { heading: "Questions and requests", body: [contactLine.en] },
    ],
  },
  my: {
    title: "ကိုယ်ရေးအချက်အလက် မူဝါဒ",
    intro: `${ENTITY} ("ကျွန်ုပ်တို့") သည် ဆေးခန်းများအတွက် အွန်လိုင်း ရက်ချိန်းယူစနစ်ကို လုပ်ဆောင်ပါသည်။ ကျွန်ုပ်တို့ သိမ်းဆည်းသည့် အချက်အလက်၊ အကြောင်းရင်းနှင့် သင်လုပ်ဆောင်နိုင်သည်များကို ဤနေရာတွင် ရှင်းပြထားပါသည်။ ဆေးခန်းတစ်ခုတွင် ရက်ချိန်းယူသောအခါ ရက်ချိန်းကို မည်သို့ကိုင်တွယ်မည်ကို ထိုဆေးခန်းက ဆုံးဖြတ်ပြီး ကျွန်ုပ်တို့က ဆေးခန်းကိုယ်စား သိမ်းဆည်းပေးပါသည်။`,
    sections: [
      {
        heading: "ကျွန်ုပ်တို့ စုဆောင်းသည့် အချက်အလက်",
        body: [
          "လူနာများ - သင့်အမည်၊ ဖုန်းနံပါတ်၊ ထည့်လိုပါက အီးမေးလ်နှင့် မှတ်ချက်၊ ယူထားသော ရက်ချိန်းနှင့် ဘာသာစကား။",
          "ဆေးခန်းဝန်ထမ်းများ - အမည်၊ အီးမေးလ်၊ လုံခြုံစွာ hash လုပ်ထားသော စကားဝှက်နှင့် ထည့်သွင်းထားသော ဆေးခန်းအချက်အလက်များ။",
          "နည်းပညာဆိုင်ရာ - လုံခြုံရေးနှင့် အလွဲသုံးမှု တားဆီးရန် IP လိပ်စာနှင့် browser အချက်အလက်၊ ဝန်ထမ်းများ အကောင့်ဝင်ထားနိုင်ရန် cookie များ။ ကြော်ငြာ tracker များ မသုံးပါ။",
        ],
      },
      {
        heading: "အသုံးပြုပုံ",
        body: [
          "ရက်ချိန်းယူခြင်း၊ အတည်ပြုခြင်း၊ သတိပေးခြင်းနှင့် ပြောင်းလဲခြင်း၊ ဆေးခန်းများအား ၎င်းတို့၏ အချိန်ဇယား ပြသခြင်း၊ ဝန်ဆောင်မှုကို လုံခြုံစေခြင်းနှင့် ပြဿနာဖြစ်ပါက ကူညီခြင်းအတွက် အသုံးပြုပါသည်။",
          "ကိုယ်ရေးအချက်အလက်များကို ဘယ်တော့မှ မရောင်းချပါ၊ ကြော်ငြာအတွက် မသုံးပါ။",
        ],
      },
      {
        heading: "မည်သူ မြင်နိုင်သနည်း",
        body: [
          "သင်ရက်ချိန်းယူသော ဆေးခန်းနှင့် ၎င်းဖိတ်ကြားထားသော အဖွဲ့ဝင်များ။",
          "ဝန်ဆောင်မှု၏ အစိတ်အပိုင်းများကို ကျွန်ုပ်တို့ကိုယ်စား လုပ်ဆောင်ပေးသော ကုမ္ပဏီများ - hosting နှင့် database၊ အီးမေးလ်ပို့ခြင်း၊ bot ကာကွယ်ခြင်းနှင့် ဆေးခန်း၏ အများပြည်သူ ဝက်ဘ်ဆိုက်မှ အရောင်များကို ဖတ်သော AI ဝန်ဆောင်မှု (လူနာ အချက်အလက် မရရှိပါ)။",
          "ဥပဒေအရ လိုအပ်မှသာ သက်ဆိုင်ရာ အာဏာပိုင်များ။",
        ],
      },
      {
        heading: "သိမ်းဆည်းထားမည့် ကာလ",
        body: [
          "ဆေးခန်းက ဝန်ဆောင်မှုကို အသုံးပြုနေသရွေ့ သိမ်းထားပါသည်။ ဆေးခန်းများသည် မိမိဒေတာကို အချိန်မရွေး ဒေါင်းလုဒ် သို့မဟုတ် ဖျက်နိုင်ပြီး ဖျက်လိုက်သော ဆေးခန်း၏ ဒေတာကို ရက် ၃၀ အကြာတွင် အပြီးဖျက်ပါသည်။",
          "လူနာများသည် မိမိအချက်အလက်ကို ပြင်ရန် သို့မဟုတ် ဖျက်ရန် ဆေးခန်း သို့မဟုတ် ကျွန်ုပ်တို့ထံ တောင်းဆိုနိုင်ပါသည်။",
        ],
      },
      {
        heading: "လုံခြုံရေး",
        body: ["ချိတ်ဆက်မှုများကို encrypt လုပ်ထားပြီး စကားဝှက်များကို hash လုပ်ထားကာ ဆေးခန်းတစ်ခုစီ၏ ဒေတာကို ၎င်း၏ အဖွဲ့သာ မြင်နိုင်ပါသည်။ ဒေတာ မပျောက်စေရန် backup ပြုလုပ်ထားပါသည်။"],
      },
      { heading: "မေးခွန်းများနှင့် တောင်းဆိုမှုများ", body: [contactLine.my] },
    ],
  },
};

const terms: Record<Locale, LegalDoc> = {
  en: {
    title: "Terms of Service",
    intro: `These terms cover clinics and their staff using ${ENTITY}. By creating an account you agree to them.`,
    sections: [
      {
        heading: "The service",
        body: [
          "We provide online booking pages, an embeddable booking form, and a dashboard to manage appointments. The service is free during the beta; we'll give at least 30 days' notice before any charge.",
        ],
      },
      {
        heading: "Your account and team",
        body: [
          "Keep your sign-in details secure and your clinic details accurate. You're responsible for what people you invite do in your clinic's dashboard.",
        ],
      },
      {
        heading: "Patient data",
        body: [
          "You decide how your patients' appointments are handled and must use their details only to provide your services, as the law requires. We process that data on your behalf, as described in our Privacy Policy.",
          "Booking Widget is a scheduling tool. It doesn't give medical advice, and care decisions remain yours.",
        ],
      },
      {
        heading: "Acceptable use",
        body: ["Don't use the service to send spam, deceive patients, break the law, or attack or overload the service. We may suspend clinics that do."],
      },
      {
        heading: "Availability",
        body: [
          "We work to keep the service running, but can't promise it will never be interrupted or that every message will arrive. Keep another way for patients to reach you, such as a phone number.",
        ],
      },
      {
        heading: "Ending the service",
        body: [
          "You can delete your clinic at any time from Settings. We may suspend or close accounts that break these terms, and will tell you why when we can.",
        ],
      },
      {
        heading: "Liability",
        body: ["To the extent the law allows, we aren't liable for indirect losses, such as missed appointments or lost income, arising from use of the service."],
      },
      { heading: "Changes and contact", body: ["We'll post changes here and update the date below.", contactLine.en] },
    ],
  },
  my: {
    title: "ဝန်ဆောင်မှု စည်းမျဉ်းများ",
    intro: `ဤစည်းမျဉ်းများသည် ${ENTITY} ကို အသုံးပြုသော ဆေးခန်းများနှင့် ၎င်းတို့၏ ဝန်ထမ်းများအတွက် ဖြစ်သည်။ အကောင့်ဖွင့်ခြင်းဖြင့် ဤစည်းမျဉ်းများကို သဘောတူပါသည်။`,
    sections: [
      {
        heading: "ဝန်ဆောင်မှု",
        body: [
          "အွန်လိုင်း ဘိုကင်စာမျက်နှာ၊ ဝက်ဘ်ဆိုက်တွင် ထည့်နိုင်သော ဘိုကင်ပုံစံနှင့် ရက်ချိန်းများ စီမံရန် ဒက်ရှ်ဘုတ်ကို ပေးပါသည်။ Beta ကာလအတွင်း အခမဲ့ ဖြစ်ပြီး ကြေးငွေ မကောက်ခံမီ အနည်းဆုံး ရက် ၃၀ ကြိုတင် အသိပေးပါမည်။",
        ],
      },
      {
        heading: "သင့်အကောင့်နှင့် အဖွဲ့",
        body: ["အကောင့်ဝင်အချက်အလက်ကို လုံခြုံစွာ ထားပြီး ဆေးခန်းအချက်အလက်ကို မှန်ကန်အောင် ထားပါ။ သင်ဖိတ်ကြားသူများ၏ လုပ်ဆောင်ချက်များအတွက် သင်တာဝန်ရှိပါသည်။"],
      },
      {
        heading: "လူနာ ဒေတာ",
        body: [
          "လူနာ၏ ရက်ချိန်းများကို မည်သို့ကိုင်တွယ်မည်ကို သင်ဆုံးဖြတ်ပြီး ၎င်းတို့၏ အချက်အလက်ကို ဥပဒေနှင့်အညီ ဝန်ဆောင်မှုပေးရန်သာ အသုံးပြုရပါမည်။ ကျွန်ုပ်တို့သည် ကိုယ်ရေးအချက်အလက် မူဝါဒတွင် ဖော်ပြထားသည့်အတိုင်း သင့်ကိုယ်စား ထိုဒေတာကို စီမံပါသည်။",
          "Booking Widget သည် ရက်ချိန်းစီမံသည့် ကိရိယာသာ ဖြစ်သည်။ ဆေးဘက်ဆိုင်ရာ အကြံဉာဏ် မပေးပါ၊ ကုသမှုဆိုင်ရာ ဆုံးဖြတ်ချက်များမှာ သင့်တာဝန် ဖြစ်သည်။",
        ],
      },
      {
        heading: "ခွင့်ပြုထားသော အသုံးပြုမှု",
        body: ["spam ပို့ခြင်း၊ လူနာများကို လှည့်ဖြားခြင်း၊ ဥပဒေချိုးဖောက်ခြင်း သို့မဟုတ် ဝန်ဆောင်မှုကို တိုက်ခိုက်ခြင်းအတွက် အသုံးမပြုရပါ။ ထိုသို့ပြုသော ဆေးခန်းများကို ရပ်ဆိုင်းနိုင်ပါသည်။"],
      },
      {
        heading: "ရရှိနိုင်မှု",
        body: ["ဝန်ဆောင်မှု ဆက်လက်လည်ပတ်စေရန် ကြိုးစားသော်လည်း ဘယ်တော့မှ မပြတ်တောက်ပါ သို့မဟုတ် စာတိုင်း ရောက်ပါမည်ဟု ကတိမပေးနိုင်ပါ။ ဖုန်းနံပါတ်ကဲ့သို့ လူနာများ ဆက်သွယ်နိုင်သော အခြားနည်းလမ်း ထားရှိပါ။"],
      },
      {
        heading: "ဝန်ဆောင်မှု ရပ်စဲခြင်း",
        body: ["ဆက်တင်များမှ သင့်ဆေးခန်းကို အချိန်မရွေး ဖျက်နိုင်ပါသည်။ စည်းမျဉ်းများကို ချိုးဖောက်သော အကောင့်များကို ရပ်ဆိုင်း သို့မဟုတ် ပိတ်နိုင်ပြီး ဖြစ်နိုင်ပါက အကြောင်းရင်းကို အသိပေးပါမည်။"],
      },
      {
        heading: "တာဝန်ယူမှု",
        body: ["ဥပဒေက ခွင့်ပြုသည့်အတိုင်းအတာအထိ ဝန်ဆောင်မှု အသုံးပြုခြင်းကြောင့် ဖြစ်ပေါ်သော ရက်ချိန်းလွဲခြင်း သို့မဟုတ် ဝင်ငွေဆုံးရှုံးခြင်းကဲ့သို့ သွယ်ဝိုက်ဆုံးရှုံးမှုများအတွက် တာဝန်မယူပါ။"],
      },
      { heading: "ပြောင်းလဲမှုများနှင့် ဆက်သွယ်ရန်", body: ["ပြောင်းလဲမှုများကို ဤနေရာတွင် ဖော်ပြပြီး အောက်ပါ ရက်စွဲကို ပြင်ဆင်ပါမည်။", contactLine.my] },
    ],
  },
};

export const LEGAL = { privacy, terms };
