import type { Email } from "./mailer";

type Locale = "en" | "my";

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function layout({ heading, body, cta }: { heading: string; body: string; cta?: { label: string; url: string } }) {
  return `<!doctype html><html><body style="margin:0;background:#f4f4f5;font-family:-apple-system,'Segoe UI',Roboto,'Noto Sans Myanmar',Arial,sans-serif;color:#0a0a0a">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border:1px solid #e4e4e7;border-radius:12px">
<tr><td style="padding:28px">
<h1 style="margin:0 0 16px;font-size:18px;line-height:1.4">${esc(heading)}</h1>
<div style="font-size:14px;line-height:1.6;color:#3f3f46">${body}</div>
${cta ? `<p style="margin:24px 0 0"><a href="${esc(cta.url)}" style="display:inline-block;background:#0a0a0a;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:8px;font-size:14px">${esc(cta.label)}</a></p>` : ""}
</td></tr></table>
</td></tr></table></body></html>`;
}

function rows(items: [string, string | null | undefined][]) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:12px 0;font-size:14px">${items
    .filter(([, v]) => v)
    .map(
      ([k, v]) =>
        `<tr><td style="padding:3px 16px 3px 0;color:#71717a;vertical-align:top">${esc(k)}</td><td style="padding:3px 0">${esc(v!)}</td></tr>`,
    )
    .join("")}</table>`;
}

export function formatWhen(date: Date, timezone: string, locale: Locale) {
  const tag = locale === "my" ? "my-MM" : "en-US";
  const day = new Intl.DateTimeFormat(tag, { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: timezone }).format(date);
  const time = new Intl.DateTimeFormat(tag, { hour: "numeric", minute: "2-digit", timeZone: timezone }).format(date);
  return `${day}, ${time}`;
}

export function passwordResetEmail({ to, name, url }: { to: string; name: string; url: string }): Email {
  return {
    to,
    subject: "Reset your password",
    text: `Hi ${name},\n\nReset your password: ${url}\n\nIf you didn't ask for this, ignore this email.`,
    html: layout({
      heading: "Reset your password",
      body: `<p>Hi ${esc(name)}, click below to choose a new password. If you didn't ask for this, you can ignore this email.</p>`,
      cta: { label: "Reset password", url },
    }),
  };
}

export type BookingEmailData = {
  businessName: string;
  businessPhone?: string | null;
  businessAddress?: string | null;
  serviceName: string;
  providerName: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  note?: string | null;
  startsAt: Date;
  timezone: string;
  locale: Locale;
  status: "pending" | "confirmed" | "cancelled" | "completed" | "no_show";
  manageUrl: string;
  dashboardUrl: string;
};

const COPY = {
  en: {
    confirmedSubject: (b: string) => `Your appointment at ${b} is booked`,
    pendingSubject: (b: string) => `Appointment request received — ${b}`,
    cancelledSubject: (b: string) => `Your appointment at ${b} was cancelled`,
    confirmedHeading: "You're booked",
    pendingHeading: "Request received",
    pendingBody: "The clinic will confirm your appointment shortly.",
    cancelledHeading: "Appointment cancelled",
    hi: (n: string) => `Hi ${n},`,
    when: "When",
    service: "Service",
    with: "With",
    where: "Where",
    phone: "Phone",
    manage: "View or cancel",
    rebook: "Book again",
  },
  my: {
    confirmedSubject: (b: string) => `${b} တွင် ရက်ချိန်း ရပြီးပါပြီ`,
    pendingSubject: (b: string) => `${b} — ရက်ချိန်း တောင်းဆိုမှု ရရှိပါပြီ`,
    cancelledSubject: (b: string) => `${b} ရက်ချိန်း ပယ်ဖျက်ပြီးပါပြီ`,
    confirmedHeading: "ရက်ချိန်း ရပြီးပါပြီ",
    pendingHeading: "တောင်းဆိုမှု ရရှိပါပြီ",
    pendingBody: "ဆေးခန်းမှ မကြာမီ အတည်ပြုပေးပါမည်။",
    cancelledHeading: "ရက်ချိန်း ပယ်ဖျက်ပြီး",
    hi: (n: string) => `မင်္ဂလာပါ ${n}၊`,
    when: "အချိန်",
    service: "ဝန်ဆောင်မှု",
    with: "ဆရာဝန်",
    where: "လိပ်စာ",
    phone: "ဖုန်း",
    manage: "ကြည့်ရန် / ပယ်ဖျက်ရန်",
    rebook: "ထပ်မံ ရက်ချိန်းယူရန်",
  },
} as const;

/** Patient-facing confirmation, pending notice, or cancellation. */
export function customerBookingEmail(d: BookingEmailData & { to: string }): Email {
  const c = COPY[d.locale];
  const when = formatWhen(d.startsAt, d.timezone, d.locale);
  const kind = d.status === "cancelled" ? "cancelled" : d.status === "pending" ? "pending" : "confirmed";
  const subject =
    kind === "cancelled" ? c.cancelledSubject(d.businessName) : kind === "pending" ? c.pendingSubject(d.businessName) : c.confirmedSubject(d.businessName);
  const heading = kind === "cancelled" ? c.cancelledHeading : kind === "pending" ? c.pendingHeading : c.confirmedHeading;
  const details: [string, string | null | undefined][] = [
    [c.when, when],
    [c.service, d.serviceName],
    [c.with, d.providerName],
    [c.where, d.businessAddress],
    [c.phone, d.businessPhone],
  ];
  return {
    to: d.to,
    subject,
    text: [c.hi(d.customerName), "", heading, kind === "pending" ? c.pendingBody : "", ...details.filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`), "", `${c.manage}: ${d.manageUrl}`]
      .filter((l) => l !== undefined)
      .join("\n"),
    html: layout({
      heading,
      body: `<p>${esc(c.hi(d.customerName))}</p>${kind === "pending" ? `<p>${esc(c.pendingBody)}</p>` : ""}${rows(details)}`,
      cta: kind === "cancelled" ? undefined : { label: c.manage, url: d.manageUrl },
    }),
  };
}

/** Staff-facing alert for new bookings and patient cancellations. */
export function businessBookingEmail(d: BookingEmailData & { to: string[]; event: "created" | "cancelled" }): Email {
  const when = formatWhen(d.startsAt, d.timezone, "en");
  const subject =
    d.event === "cancelled"
      ? `Cancelled: ${d.customerName} · ${when}`
      : `${d.status === "pending" ? "New request" : "New booking"}: ${d.customerName} · ${when}`;
  const details: [string, string | null | undefined][] = [
    ["When", when],
    ["Service", d.serviceName],
    ["With", d.providerName],
    ["Patient", d.customerName],
    ["Phone", d.customerPhone],
    ["Email", d.customerEmail],
    ["Note", d.note],
  ];
  return {
    to: d.to,
    subject,
    text: [subject, "", ...details.filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`), "", `Open dashboard: ${d.dashboardUrl}`].join("\n"),
    html: layout({
      heading: d.event === "cancelled" ? "Appointment cancelled by patient" : d.status === "pending" ? "New booking request" : "New booking",
      body: rows(details),
      cta: { label: d.status === "pending" && d.event === "created" ? "Review request" : "Open dashboard", url: d.dashboardUrl },
    }),
  };
}
