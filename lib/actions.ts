import type { z } from "zod";

/** Uniform return shape for Server Actions used with useActionState. */
export type ActionResult = {
  ok?: boolean;
  error?: string;
  fields?: Record<string, string[] | undefined>;
  message?: string;
  /** Machine-readable reason (e.g. a BookingErrorCode) so clients don't match on translated text. */
  code?: string;
};
export type ActionState = ActionResult | null;

export function fieldErrors(error: z.ZodError, message = "Please check the highlighted fields."): ActionResult {
  return { ok: false, error: message, fields: error.flatten().fieldErrors as Record<string, string[]> };
}

/** Reads a FormData into a plain object (checkbox "on" → true). */
export function formObject(form: FormData): Record<string, string | string[] | boolean> {
  const out: Record<string, string | string[] | boolean> = {};
  for (const key of new Set(form.keys())) {
    const all = form.getAll(key).map(String);
    out[key] = all.length > 1 ? all : all[0] === "on" ? true : all[0];
  }
  return out;
}
