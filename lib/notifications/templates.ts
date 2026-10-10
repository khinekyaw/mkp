import { patientDate, patientTime } from "../format";
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
  return `${patientDate(date, timezone, locale, true)}${locale === "my" ? "၊" : ","} ${patientTime(date, timezone, locale)}`;
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

export function verifyEmailEmail({ to, name, url }: { to: string; name: string; url: string }): Email {
  return {
    to,
    subject: "Confirm your email",
    text: `Hi ${name},\n\nConfirm your email to finish creating your account: ${url}\n\nIf you didn't sign up, ignore this email.`,
    html: layout({
      heading: "Confirm your email",
      body: `<p>Hi ${esc(name)}, click below to confirm your email and finish setting up your clinic. If you didn't sign up, you can ignore this email.</p>`,
      cta: { label: "Confirm email", url },
    }),
  };
}

/** Sign-up with an address that already has an account: point them to sign-in instead of failing silently. */
export function existingAccountEmail({ to, name, signInUrl, resetUrl }: { to: string; name: string; signInUrl: string; resetUrl: string }): Email {
  return {
    to,
    subject: "You already have an account",
    text: `Hi ${name},\n\nSomeone (hopefully you) tried to create an account with this email, but you already have one.\n\nSign in: ${signInUrl}\nForgot your password? ${resetUrl}\n\nIf this wasn't you, you can ignore this email.`,
    html: layout({
      heading: "You already have an account",
      body: `<p>Hi ${esc(name)}, someone (hopefully you) tried to create an account with this email, but you already have one. <a href="${esc(resetUrl)}">Forgot your password?</a></p><p>If this wasn't you, you can ignore this email.</p>`,
      cta: { label: "Sign in", url: signInUrl },
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
    reminderSubject: (b: string) => `Reminder: your appointment at ${b}`,
    reminderHeading: "See you soon",
    reminderBody: "This is a reminder of your upcoming appointment.",
    rescheduledSubject: (b: string) => `Your appointment at ${b} was moved`,
    rescheduledHeading: "Appointment moved",
    rescheduledBody: "Here are the new details.",
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
    reminderSubject: (b: string) => `သတိပေးချက် — ${b} ရှိ သင့်ရက်ချိန်း`,
    reminderHeading: "မကြာမီ တွေ့ဆုံကြမည်",
    reminderBody: "လာမည့် ရက်ချိန်းကို သတိပေးအပ်ပါသည်။",
    rescheduledSubject: (b: string) => `${b} ရှိ သင့်ရက်ချိန်းကို ရွှေ့ပြီးပါပြီ`,
    rescheduledHeading: "ရက်ချိန်း ရွှေ့ပြီး",
    rescheduledBody: "ပြင်ဆင်ထားသော အသေးစိတ်များမှာ အောက်ပါအတိုင်း ဖြစ်ပါသည်။",
  },
} as const;

export type CustomerEmailKind = "confirmed" | "pending" | "cancelled" | "reminder" | "rescheduled";

/** Patient-facing confirmation, pending notice, cancellation, reminder or reschedule notice. */
export function customerBookingEmail(d: BookingEmailData & { to: string; kind?: "reminder" | "rescheduled" }): Email {
  const c = COPY[d.locale];
  const when = formatWhen(d.startsAt, d.timezone, d.locale);
  const kind: CustomerEmailKind = d.kind ?? (d.status === "cancelled" ? "cancelled" : d.status === "pending" ? "pending" : "confirmed");
  const subject = {
    cancelled: c.cancelledSubject,
    pending: c.pendingSubject,
    confirmed: c.confirmedSubject,
    reminder: c.reminderSubject,
    rescheduled: c.rescheduledSubject,
  }[kind](d.businessName);
  const heading = {
    cancelled: c.cancelledHeading,
    pending: c.pendingHeading,
    confirmed: c.confirmedHeading,
    reminder: c.reminderHeading,
    rescheduled: c.rescheduledHeading,
  }[kind];
  const leads: Partial<Record<CustomerEmailKind, string>> = { pending: c.pendingBody, reminder: c.reminderBody, rescheduled: c.rescheduledBody };
  const lead = leads[kind];
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
    text: [c.hi(d.customerName), "", heading, lead ?? "", ...details.filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`), "", `${c.manage}: ${d.manageUrl}`]
      .filter((l) => l !== undefined)
      .join("\n"),
    html: layout({
      heading,
      body: `<p>${esc(c.hi(d.customerName))}</p>${lead ? `<p>${esc(lead)}</p>` : ""}${rows(details)}`,
      cta: kind === "cancelled" ? undefined : { label: c.manage, url: d.manageUrl },
    }),
  };
}

/** Staff-facing alert for new bookings and patient cancellations or moves. */
export function businessBookingEmail(d: BookingEmailData & { to: string[]; event: "created" | "cancelled" | "rescheduled" }): Email {
  const when = formatWhen(d.startsAt, d.timezone, "en");
  const subject =
    d.event === "cancelled"
      ? `Cancelled: ${d.customerName} · ${when}`
      : d.event === "rescheduled"
        ? `Moved: ${d.customerName} · now ${when}`
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
      heading:
        d.event === "cancelled"
          ? "Appointment cancelled by patient"
          : d.event === "rescheduled"
            ? "Appointment moved by patient"
            : d.status === "pending"
              ? "New booking request"
              : "New booking",
      body: rows(details),
      cta: { label: d.status === "pending" && d.event === "created" ? "Review request" : "Open dashboard", url: d.dashboardUrl },
    }),
  };
}

const ROLE_LABEL = { owner: "an owner", admin: "an admin", staff: "a staff member" } as const;

export function inviteEmail({
  to,
  businessName,
  inviterName,
  role,
  url,
}: {
  to: string;
  businessName: string;
  inviterName: string;
  role: keyof typeof ROLE_LABEL;
  url: string;
}): Email {
  const line = `${inviterName} invited you to join ${businessName} as ${ROLE_LABEL[role]}.`;
  return {
    to,
    subject: `Join ${businessName} on Booking Widget`,
    text: `${line}\n\nAccept the invite: ${url}\n\nThe link expires in 7 days. If you weren't expecting this, ignore this email.`,
    html: layout({
      heading: `Join ${businessName}`,
      body: `<p>${esc(line)}</p><p>The link expires in 7 days. If you weren't expecting this, you can ignore this email.</p>`,
      cta: { label: "Accept invite", url },
    }),
  };
}
