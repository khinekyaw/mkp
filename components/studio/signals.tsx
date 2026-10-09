"use client";

import { Info, Sparkles, Wand2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSiteCopy } from "@/components/i18n/site-locale";
import type { DetectThemeResult } from "@/lib/theme";

export function Signals({ result }: { result: DetectThemeResult }) {
  const { t } = useSiteCopy();
  const { signals } = result;
  const host = new URL(signals.url).hostname.replace(/^www\./, "");

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="truncate">{t.studio.detectedFrom(host)}</CardTitle>
        {result.source === "ai" ? (
          <Badge>
            <Sparkles /> {t.studio.ai}
          </Badge>
        ) : (
          <Badge variant="outline">
            <Wand2 /> {t.studio.heuristic}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="grid gap-4">
        <p className="text-sm leading-relaxed">{result.rationale}</p>
        {result.aiNote ? (
          <p className="flex gap-2 rounded-md bg-muted p-2.5 text-xs text-muted-foreground">
            <Info className="mt-px size-3.5 shrink-0" />
            {result.aiNote}
          </p>
        ) : null}

        {signals.colors.length ? (
          <div className="grid gap-1.5">
            <p className="text-xs font-medium text-muted-foreground">{t.studio.colorsFound}</p>
            <div className="flex flex-wrap gap-1">
              {signals.colors.slice(0, 12).map((c) => (
                <span
                  key={c.hex}
                  title={`${c.hex} · weight ${c.count}`}
                  className="size-6 rounded-sm border"
                  style={{ background: c.hex }}
                />
              ))}
            </div>
          </div>
        ) : null}

        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-xs">
          <dt className="text-muted-foreground">{t.studio.fonts}</dt>
          <dd className="truncate">{signals.fonts.map((f) => f.family).join(", ") || "—"}</dd>
          <dt className="text-muted-foreground">{t.studio.themeColor}</dt>
          <dd className="font-mono">{signals.themeColor ?? "—"}</dd>
          <dt className="text-muted-foreground">{t.studio.radii}</dt>
          <dd className="font-mono">
            {signals.radii.map((r) => (r.px >= 9999 ? "pill" : `${r.px}px`)).join(", ") || "—"}
          </dd>
        </dl>
      </CardContent>
    </Card>
  );
}
