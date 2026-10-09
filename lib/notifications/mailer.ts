import { Resend } from "resend";

export type Email = { to: string | string[]; subject: string; html: string; text: string; replyTo?: string };

export interface Mailer {
  send(email: Email): Promise<void>;
}

/** Development fallback: prints emails to the server console. */
class ConsoleMailer implements Mailer {
  async send(email: Email) {
    console.info(
      `\n✉️  [mail] to=${[email.to].flat().join(", ")}\n   subject: ${email.subject}\n   ${email.text.replace(/\n/g, "\n   ")}\n`,
    );
  }
}

class ResendMailer implements Mailer {
  private client: Resend;
  constructor(
    apiKey: string,
    private from: string,
  ) {
    this.client = new Resend(apiKey);
  }
  async send(email: Email) {
    const { error } = await this.client.emails.send({
      from: this.from,
      to: email.to,
      subject: email.subject,
      html: email.html,
      text: email.text,
      replyTo: email.replyTo,
    });
    if (error) throw new Error(`Resend: ${error.message}`);
  }
}

let mailer: Mailer | undefined;

export function getMailer(): Mailer {
  if (mailer) return mailer;
  const key = process.env.RESEND_API_KEY;
  mailer = key
    ? new ResendMailer(key, process.env.EMAIL_FROM ?? "Bookings <onboarding@resend.dev>")
    : new ConsoleMailer();
  return mailer;
}

/** Sends without letting a mail failure break the user-facing request. */
export async function sendSafely(email: Email) {
  try {
    await getMailer().send(email);
  } catch (err) {
    console.error("[mail] failed to send", email.subject, err);
  }
}
