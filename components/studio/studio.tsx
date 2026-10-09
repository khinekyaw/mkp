"use client";

import { Check, Save } from "lucide-react";
import { useMemo, useState, useTransition, type ReactNode } from "react";
import { demoApi, httpApi, previewApi } from "@/components/booking/api";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/misc";
import { Segmented } from "@/components/ui/segmented";
import { toast } from "@/components/ui/toaster";
import type { ActionState } from "@/lib/actions";
import type { PublicBusiness } from "@/lib/business/public";
import { type DetectThemeResult, type Theme } from "@/lib/theme";
import { DetectForm } from "./detect-form";
import { useSiteCopy } from "@/components/i18n/site-locale";
import { WidgetPreview } from "./widget-preview";
import { Signals } from "./signals";
import { ThemeEditor } from "./theme-editor";

export type StudioProps = {
  business: PublicBusiness;
  /** "preview" = real availability, simulated booking; "demo" = fully offline. */
  mode: "preview" | "demo";
  initialTheme: Theme;
  initialUrl?: string;
  autoDetect?: boolean;
  /** Bound Server Action that persists the theme (dashboard only). */
  saveTheme?: (theme: Theme, website: string | null) => Promise<ActionState>;
  heading?: ReactNode;
  /** Extra content under the editor (e.g. a sign-up CTA on the landing page). */
  footer?: ReactNode;
};

export function Studio({ business, mode, initialTheme, initialUrl, autoDetect, saveTheme, heading, footer }: StudioProps) {
  const { t } = useSiteCopy();
  const [result, setResult] = useState<DetectThemeResult | null>(null);
  const [theme, setTheme] = useState<Theme>(initialTheme);
  const [saved, setSaved] = useState<Theme>(initialTheme);
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [saving, startSaving] = useTransition();
  const api = useMemo(() => (mode === "demo" ? demoApi(business) : previewApi(httpApi(business.id))), [mode, business]);
  const dirty = JSON.stringify(theme) !== JSON.stringify(saved);

  function save() {
    if (!saveTheme) return;
    startSaving(async () => {
      const res = await saveTheme(theme, result?.signals.url ?? null);
      if (res?.ok) {
        setSaved(theme);
        toast.success("Theme saved. Your widget and booking page are updated.");
      } else toast.error(res?.error ?? "Couldn't save the theme.");
    });
  }

  return (
    // On small screens the preview sits between detection and the controls;
    // on large screens it spans the right column.
    <div className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)] lg:grid-rows-[auto_1fr] lg:gap-x-8">
      <div className="grid content-start gap-4">
        {heading}
        <DetectForm
          initialUrl={initialUrl}
          autoRun={autoDetect}
          showExamples={mode === "demo"}
          onDetected={(r) => {
            setResult(r);
            setTheme({ ...r.theme, name: mode === "demo" ? r.theme.name : business.name });
          }}
        />
        {result ? <Signals result={result} /> : null}
      </div>

      <section className="grid min-w-0 content-start gap-3 py-2 lg:sticky lg:top-24 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-start lg:py-0">
        <div className="flex flex-wrap items-center justify-end gap-2">
          <div className="flex gap-2">
            <Segmented
              aria-label={t.studio.device}
              className="hidden sm:inline-flex"
              value={device}
              onChange={setDevice}
              options={[
                { value: "desktop", label: t.studio.desktop },
                { value: "mobile", label: t.studio.mobile },
              ]}
            />
          </div>
        </div>
        {/* The form has its own language switch, so the studio doesn't need one. */}
        <WidgetPreview business={business} api={api} theme={theme} device={device} />
      </section>

      <div className="grid content-start gap-4 lg:col-start-1 lg:row-start-2">
        <ThemeEditor theme={theme} onChange={setTheme} onReset={() => setTheme(result?.theme ?? saved)} showName={mode === "demo"} />
        {saveTheme ? (
          <div className="sticky bottom-4 z-10 flex items-center justify-between gap-3 rounded-lg border bg-background p-3 shadow-sm">
            <p className="text-sm text-muted-foreground">{dirty ? "Unsaved changes" : "All changes saved"}</p>
            <Button onClick={save} disabled={!dirty || saving}>
              {saving ? <Spinner /> : dirty ? <Save /> : <Check />} Save theme
            </Button>
          </div>
        ) : null}
        {footer}
      </div>
    </div>
  );
}
