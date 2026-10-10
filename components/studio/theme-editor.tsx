"use client";

import { RotateCcw } from "lucide-react";
import { useId } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { buildTheme, isSystemFont, type Theme } from "@/lib/theme";
import { useSiteCopy } from "@/components/i18n/site-locale";
import { FontPicker } from "./font-picker";

function primaryFamily(stack: string) {
  const first = stack.split(",")[0].replace(/["']/g, "").trim();
  return isSystemFont(first) ? "" : first;
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const id = useId();
  return (
    <Field label={label} htmlFor={id} className="min-w-0">
      <label className="flex h-10 min-w-0 cursor-pointer items-center gap-2 rounded-md border px-2 focus-within:ring-2 focus-within:ring-ring/15">
        <input
          id={id}
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="size-6 shrink-0 cursor-pointer rounded-sm border-0 bg-transparent p-0 [&::-webkit-color-swatch]:rounded-sm [&::-webkit-color-swatch]:border-0 [&::-webkit-color-swatch-wrapper]:p-0"
        />
        <span className="truncate font-mono text-[11px] uppercase">{value}</span>
      </label>
    </Field>
  );
}

/** Edits the core brand decisions; everything else is re-derived by buildTheme. */
export function ThemeEditor({
  theme,
  onChange,
  onReset,
  showName = true,
}: {
  theme: Theme;
  onChange: (theme: Theme) => void;
  onReset: () => void;
  /** The dashboard edits the name in Settings instead. */
  showName?: boolean;
}) {
  const { t } = useSiteCopy();
  const ids = { name: useId(), font: useId(), radius: useId() };
  const core = {
    name: theme.name,
    background: theme.colors.background,
    foreground: theme.colors.foreground,
    primary: theme.colors.primary,
    fontFamily: primaryFamily(theme.fontFamily),
    radius: theme.radius,
  };
  const update = (patch: Partial<typeof core>) => onChange(buildTheme({ ...core, ...patch }));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{t.studio.fineTune}</CardTitle>
        <Button variant="ghost" size="sm" onClick={onReset}>
          <RotateCcw /> {t.studio.reset}
        </Button>
      </CardHeader>
      <CardContent className="grid gap-4">
        {showName ? (
          <Field label={t.studio.businessName} htmlFor={ids.name}>
            <Input id={ids.name} value={core.name ?? ""} onChange={(e) => update({ name: e.target.value })} />
          </Field>
        ) : null}
        <div className="grid grid-cols-3 gap-2">
          <ColorField label={t.studio.brand} value={core.primary} onChange={(primary) => update({ primary })} />
          <ColorField label={t.studio.background} value={core.background} onChange={(background) => update({ background })} />
          <ColorField label={t.studio.text} value={core.foreground} onChange={(foreground) => update({ foreground })} />
        </div>
        <div className="grid grid-cols-[1fr_120px] gap-3">
          <Field label={t.studio.font} htmlFor={ids.font} hint={t.studio.fontHint}>
            <FontPicker id={ids.font} value={core.fontFamily} onChange={(fontFamily) => update({ fontFamily })} />
          </Field>
          <Field label={t.studio.corners(core.radius)} htmlFor={ids.radius}>
            <Slider id={ids.radius} min={0} max={20} value={core.radius} onChange={(e) => update({ radius: Number(e.target.value) })} />
          </Field>
        </div>
      </CardContent>
    </Card>
  );
}
