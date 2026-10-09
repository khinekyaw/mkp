"use client";

import { Clock, Plus, Tag, Trash2 } from "lucide-react";
import { useActionState, useCallback, useState, useTransition } from "react";
import { useActionFeedback } from "@/components/dashboard/use-action-feedback";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { List, listRow } from "@/components/ui/list";
import { Spinner } from "@/components/ui/misc";
import { EmptyState, PageHeader } from "@/components/ui/page";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toaster";
import { useSiteCopy } from "@/components/i18n/site-locale";
import { deleteServiceAction, saveServiceAction } from "@/lib/dashboard/actions/catalog";
import type { Service } from "@/lib/db/schema";
import { fmtMinutes, fmtMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

type ServiceRow = Service & { providerIds: string[] };
type ProviderOption = { id: string; name: string };

function ServiceForm({
  slug,
  service,
  providers,
  onDone,
}: {
  slug: string;
  service: ServiceRow | null;
  providers: ProviderOption[];
  onDone: () => void;
}) {
  const [state, action, pending] = useActionState(saveServiceAction.bind(null, slug), null);
  const [deleting, startDelete] = useTransition();
  useActionFeedback(state, onDone);
  const { t } = useSiteCopy();
  const v = t.dash.services;
  const err = (k: string) => state?.fields?.[k]?.[0];
  // New services default to everyone so they're bookable immediately.
  const assigned = new Set(service ? service.providerIds : providers.map((p) => p.id));

  return (
    <form action={action} className="grid gap-4">
      {service ? <input type="hidden" name="id" value={service.id} /> : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t.dash.common.name} htmlFor="s-name" error={err("name")} required>
          <Input id="s-name" name="name" defaultValue={service?.name} required autoFocus />
        </Field>
        <Field label={v.nameMy} htmlFor="s-name-my">
          <Input id="s-name-my" name="nameMy" defaultValue={service?.nameMy ?? ""} lang="my" />
        </Field>
      </div>
      <Field label={v.descriptionLabel} htmlFor="s-desc">
        <Textarea id="s-desc" name="description" rows={2} defaultValue={service?.description ?? ""} />
      </Field>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Field label={v.duration} htmlFor="s-dur" error={err("durationMin")} required>
          <Input id="s-dur" name="durationMin" type="number" min={5} max={600} step={5} defaultValue={service?.durationMin ?? 30} required />
        </Field>
        <Field label={v.buffer} htmlFor="s-buf" error={err("bufferMin")}>
          <Input id="s-buf" name="bufferMin" type="number" min={0} max={240} step={5} defaultValue={service?.bufferMin ?? 0} />
        </Field>
        <Field label={v.price} htmlFor="s-price" error={err("price")}>
          <Input id="s-price" name="price" inputMode="numeric" defaultValue={service?.price ?? ""} placeholder="15000" />
        </Field>
        <Field label={v.currency} htmlFor="s-cur" error={err("currency")}>
          <Input id="s-cur" name="currency" defaultValue={service?.currency ?? "MMK"} maxLength={3} className="uppercase" />
        </Field>
      </div>

      <fieldset className="grid gap-2">
        <legend className="mb-1.5 text-xs font-medium text-muted-foreground">{v.providedBy}</legend>
        {providers.length ? (
          <div className="grid gap-1.5 sm:grid-cols-2">
            {providers.map((p) => (
              <label key={p.id} className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted/50">
                <input type="checkbox" name="providerIds" value={p.id} defaultChecked={assigned.has(p.id)} className="accent-foreground" />
                {p.name}
              </label>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{v.addStaffFirst}</p>
        )}
      </fieldset>

      <label className="flex items-center justify-between gap-3 rounded-md border px-3 py-2.5">
        <span className="grid">
          <span className="text-sm font-medium">{v.bookable}</span>
          <span className="text-xs text-muted-foreground">{v.bookableHint}</span>
        </span>
        <Switch name="active" defaultChecked={service?.active ?? true} />
      </label>

      {state?.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? <Spinner /> : null} {service ? v.saveChanges : v.add}
        </Button>
        {service ? (
          <Button
            variant="ghost"
            className="ml-auto text-red-600"
            disabled={deleting}
            onClick={() =>
              startDelete(async () => {
                if (!confirm(v.confirmDelete(service.name))) return;
                const res = await deleteServiceAction(slug, service.id);
                if (res?.message) toast.success(res.message);
                onDone();
              })
            }
          >
            <Trash2 /> {t.dash.common.delete}
          </Button>
        ) : null}
      </div>
    </form>
  );
}

export function ServicesManager({ slug, services, providers }: { slug: string; services: ServiceRow[]; providers: ProviderOption[] }) {
  const [editing, setEditing] = useState<ServiceRow | "new" | null>(null);
  const { locale, t } = useSiteCopy();
  const v = t.dash.services;
  const close = useCallback(() => setEditing(null), []);
  const name = (id: string) => providers.find((p) => p.id === id)?.name;

  return (
    <>
      {/* The header lives here so its "New service" action can open the dialog. */}
      <PageHeader
        title={v.title}
        description={v.description}
        actions={
          <Button onClick={() => setEditing("new")}>
            <Plus /> {v.new}
          </Button>
        }
      />
      {services.length ? (
        <List>
          {services.map((s) => {
            const staff = s.providerIds.map(name).filter(Boolean);
            return (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => setEditing(s)}
                  className={cn(listRow, "flex-wrap gap-x-4 gap-y-1")}
                >
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">{s.name}</span>
                      {!s.active ? <Badge variant="muted">{v.hidden}</Badge> : null}
                      {s.active && !staff.length ? <Badge variant="outline">{v.noStaff}</Badge> : null}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {s.nameMy ? `${s.nameMy} · ` : ""}
                      {staff.length ? staff.join(", ") : v.notAssigned}
                    </span>
                  </span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="size-3.5" /> {fmtMinutes(s.durationMin, locale)}
                    {s.bufferMin ? ` + ${s.bufferMin}` : ""}
                  </span>
                  <span className="w-24 text-right text-sm tabular-nums">{s.price != null ? fmtMoney(s.price, s.currency, locale) : "—"}</span>
                </button>
              </li>
            );
          })}
        </List>
      ) : (
        <EmptyState icon={<Tag />} title={v.emptyTitle} description={v.emptyBody} />
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && close()}>
        {editing ? (
          <DialogContent title={editing === "new" ? v.new : v.edit} className="max-w-xl">
            <ServiceForm slug={slug} service={editing === "new" ? null : editing} providers={providers} onDone={close} />
          </DialogContent>
        ) : null}
      </Dialog>
    </>
  );
}
