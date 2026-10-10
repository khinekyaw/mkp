import "server-only";
import { db, schema } from "./db";
import type { AuditActor } from "./db/schema";

export type Actor = { type: AuditActor; id?: string | null; name?: string | null };

export const PATIENT: Actor = { type: "patient" };
export const SYSTEM: Actor = { type: "system" };

export function userActor(user: { id: string; name: string }, { admin = false } = {}): Actor {
  return { type: admin ? "admin" : "user", id: user.id, name: user.name };
}

/**
 * Appends to the audit log. Failures are logged, never thrown: losing one entry
 * is better than failing the change it describes.
 */
export async function audit(entry: {
  businessId?: string | null;
  actor: Actor;
  action: string;
  target?: { type: string; id: string };
  data?: Record<string, unknown>;
}) {
  try {
    await db.insert(schema.auditEvent).values({
      businessId: entry.businessId ?? null,
      actorType: entry.actor.type,
      actorId: entry.actor.id ?? null,
      actorName: entry.actor.name ?? null,
      action: entry.action,
      targetType: entry.target?.type ?? null,
      targetId: entry.target?.id ?? null,
      data: entry.data ?? null,
    });
  } catch (err) {
    console.error("[audit] failed to record", entry.action, err);
  }
}
