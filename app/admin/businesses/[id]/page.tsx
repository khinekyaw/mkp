import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page";
import { Select } from "@/components/ui/select";
import {
  changeSlugAdminAction,
  impersonateOwnerAction,
  makeOwnerAction,
  recordPaymentAction,
  savePlanAction,
  setBusinessDeletedAction,
  setBusinessStatusAction,
} from "@/lib/admin/actions";
import { getBusinessAdmin } from "@/lib/admin/queries";
import { fmtDate, fmtMoney, fmtTime } from "@/lib/format";
import { getSiteCopy } from "@/lib/site-locale";
import { ActionForm, ReasonButton, SubmitButton } from "../../ui";

export async function generateMetadata({ params }: PageProps<"/admin/businesses/[id]">): Promise<Metadata> {
  const found = await getBusinessAdmin((await params).id);
  return { title: found?.business.name ?? "Not found" };
}

const TZ = "Asia/Yangon";

export default async function AdminBusiness({ params }: PageProps<"/admin/businesses/[id]">) {
  const { id } = await params;
  const [{ t, locale }, found] = await Promise.all([getSiteCopy(), getBusinessAdmin(id)]);
  if (!found) notFound();
  const { business: b, members, payments, counts, activity } = found;
  const a = t.admin;
  const ab = a.businesses;
  const state = b.deletedAt ? "deleted" : b.status;
  const day = (d: Date) => fmtDate(d, TZ, { day: "numeric", month: "short", year: "numeric" }, locale);
  const iso = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "");

  return (
    <>
      <PageHeader
        title={b.name}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <Badge variant={state === "active" ? "default" : "muted"}>{ab.statusLabel[state]}</Badge>
            <span>/b/{b.slug}</span>
            <span>
              · {t.dash.meta.appointments}: {counts.bookings} ({ab.upcoming(counts.upcoming)}) · {t.dash.meta.customers}: {counts.customers}
            </span>
          </span>
        }
        actions={
          <a href={`/b/${b.slug}`} target="_blank" rel="noreferrer" className="text-sm underline-offset-4 hover:underline">
            {ab.openBookingPage}
          </a>
        }
      />

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{a.common.actions}</CardTitle>
            <CardDescription>{ab.suspendHelp}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {b.deletedAt ? (
              <ReasonButton action={setBusinessDeletedAction.bind(null, b.id, false)}>{ab.undelete}</ReasonButton>
            ) : (
              <>
                {b.status === "active" ? (
                  <ReasonButton action={setBusinessStatusAction.bind(null, b.id, "suspended")} danger>
                    {ab.suspend}
                  </ReasonButton>
                ) : (
                  <ReasonButton action={setBusinessStatusAction.bind(null, b.id, "active")}>{ab.restore}</ReasonButton>
                )}
                <ReasonButton action={impersonateOwnerAction.bind(null, b.id)} help={ab.impersonateHelp}>
                  {ab.impersonate}
                </ReasonButton>
                <ReasonButton action={setBusinessDeletedAction.bind(null, b.id, true)} danger>
                  {ab.deleteNow}
                </ReasonButton>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{ab.members}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-3">
              {members.map((m) => (
                <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span>
                    <span className="font-medium">{m.name}</span> <span className="text-muted-foreground">{m.email}</span>
                    <span className="block text-xs text-muted-foreground">{t.dash.roles[m.role]}</span>
                  </span>
                  {m.role !== "owner" ? <ReasonButton action={makeOwnerAction.bind(null, b.id, m.id)}>{ab.makeOwner}</ReasonButton> : null}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{ab.planSection}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6">
            <ActionForm action={savePlanAction.bind(null, b.id)} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
              <Field label={ab.plan} htmlFor="plan">
                <Select id="plan" name="plan" defaultValue={b.plan}>
                  {["trial", "free", "starter", "pro"].map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={ab.trialEndsAt} htmlFor="trialEndsAt">
                <Input id="trialEndsAt" name="trialEndsAt" type="date" defaultValue={iso(b.trialEndsAt)} />
              </Field>
              <SubmitButton variant="outline">{ab.savePlan}</SubmitButton>
            </ActionForm>
            <ActionForm action={changeSlugAdminAction.bind(null, b.id)} className="grid gap-3 border-t pt-5 sm:grid-cols-[1fr_auto] sm:items-end">
              <Field label={ab.slug} htmlFor="slug">
                <Input id="slug" name="slug" defaultValue={b.slug} required />
              </Field>
              <SubmitButton variant="outline">{ab.changeSlug}</SubmitButton>
            </ActionForm>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{ab.payments}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5">
            {payments.length ? (
              <ul className="grid gap-2 text-sm">
                {payments.map((p) => (
                  <li key={p.id} className="flex flex-wrap justify-between gap-2">
                    <span>
                      {fmtMoney(p.amount, p.currency, locale)} · {p.method}
                      {p.reference ? ` · ${p.reference}` : ""}
                    </span>
                    <span className="text-muted-foreground">{a.billing.until(day(p.paidUntil))}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">{ab.noPayments}</p>
            )}
            <ActionForm action={recordPaymentAction.bind(null, b.id)} className="grid gap-3 border-t pt-5 sm:grid-cols-2">
              <Field label={ab.amount} htmlFor="amount" required>
                <Input id="amount" name="amount" type="number" min={1} required />
              </Field>
              <Field label={ab.method} htmlFor="method" required>
                <Input id="method" name="method" list="pay-methods" required />
                <datalist id="pay-methods">
                  <option value="KBZPay" />
                  <option value="WavePay" />
                  <option value="AYA Pay" />
                  <option value="Bank transfer" />
                  <option value="Cash" />
                </datalist>
              </Field>
              <Field label={ab.reference} htmlFor="reference">
                <Input id="reference" name="reference" />
              </Field>
              <Field label={ab.paidUntil} htmlFor="paidUntil" required>
                <Input id="paidUntil" name="paidUntil" type="date" required />
              </Field>
              <Field label={ab.note} htmlFor="note" className="sm:col-span-2">
                <Input id="note" name="note" />
              </Field>
              <input type="hidden" name="currency" value="MMK" />
              <SubmitButton className="w-fit">{ab.recordPayment}</SubmitButton>
            </ActionForm>
          </CardContent>
        </Card>
      </div>

      <section className="grid gap-2">
        <h2 className="text-sm font-semibold">{ab.activity}</h2>
        <ul className="grid gap-1 rounded-lg border bg-background p-3 text-sm">
          {activity.length ? (
            activity.map((e) => (
              <li key={e.id} className="grid gap-0.5 sm:grid-cols-[10rem_1fr]">
                <span className="text-xs text-muted-foreground tabular-nums">
                  {day(e.createdAt)} {fmtTime(e.createdAt, TZ, locale)}
                </span>
                <span>
                  <span className="font-medium">{e.actorName ?? e.actorType}</span> {t.dash.activity.actions[e.action] ?? e.action}
                  {typeof e.data?.reason === "string" ? <span className="text-muted-foreground"> — {e.data.reason}</span> : null}
                </span>
              </li>
            ))
          ) : (
            <li className="text-muted-foreground">{a.common.none}</li>
          )}
        </ul>
      </section>
    </>
  );
}
