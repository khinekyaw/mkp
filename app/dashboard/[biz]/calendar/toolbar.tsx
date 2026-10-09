"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSiteCopy } from "@/components/i18n/site-locale";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type CalendarView = "day" | "week" | "month";
const VIEWS: CalendarView[] = ["day", "week", "month"];

const roundLink =
  "grid size-9 place-items-center rounded-full bg-background text-foreground transition-colors hover:bg-muted outline-none focus-visible:ring-2 focus-visible:ring-primary/40 [&_svg]:size-4";

export function CalendarToolbar({
  view,
  date,
  today,
  prev,
  next,
  title,
  doctor,
  doctors,
}: {
  view: CalendarView;
  date: string;
  today: string;
  prev: string;
  next: string;
  title: string;
  doctor: string;
  doctors: { id: string; name: string }[];
}) {
  const { t } = useSiteCopy();
  const c = t.dash.calendar;
  const router = useRouter();
  const pathname = usePathname();
  const href = (p: { view?: CalendarView; date?: string; doctor?: string }) => {
    const q = new URLSearchParams();
    const v = p.view ?? view;
    const d = p.date ?? date;
    const doc = p.doctor ?? doctor;
    if (v !== "day") q.set("view", v);
    if (d !== today) q.set("date", d);
    if (doc) q.set("doctor", doc);
    const s = q.toString();
    return s ? `${pathname}?${s}` : pathname;
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2">
        <Link
          href={href({ date: today })}
          aria-disabled={date === today}
          className={cn(
            "inline-flex h-9 items-center rounded-full bg-background px-4 text-sm font-medium transition-colors hover:bg-muted",
            date === today && "pointer-events-none opacity-50",
          )}
        >
          {c.today}
        </Link>
        <Link href={href({ date: prev })} aria-label={c.prev} className={roundLink}>
          <ChevronLeft />
        </Link>
        <Link href={href({ date: next })} aria-label={c.next} className={roundLink}>
          <ChevronRight />
        </Link>
        <h2 className="ml-1 truncate text-lg font-medium tracking-tight">{title}</h2>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          type="date"
          aria-label={c.goTo}
          value={date}
          onChange={(e) => e.target.value && router.push(href({ date: e.target.value }))}
          className="h-9 rounded-full border-0 bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        />
        {doctors.length > 1 ? (
          <Select
            aria-label={c.doctor}
            value={doctor}
            onChange={(e) => router.push(href({ doctor: e.target.value }))}
            className="w-auto min-w-44 [&_select]:h-9 [&_select]:rounded-full [&_select]:border-0"
          >
            <option value="">{c.allDoctors}</option>
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </Select>
        ) : null}
        <nav aria-label={c.view} className="inline-flex rounded-full bg-background p-1">
          {VIEWS.map((v) => (
            <Link
              key={v}
              href={href({ view: v })}
              aria-current={v === view ? "page" : undefined}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
                v === view && "bg-primary text-primary-foreground hover:text-primary-foreground",
              )}
            >
              {c.views[v]}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
