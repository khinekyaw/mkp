"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function CalendarToolbar({ date, today, prev, next }: { date: string; today: string; prev: string; next: string }) {
  const router = useRouter();
  const pathname = usePathname();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center">
        <Link href={`${pathname}?date=${prev}`} aria-label="Previous day" className={cn(buttonVariants({ variant: "outline", size: "icon" }), "rounded-r-none")}>
          <ChevronLeft />
        </Link>
        <Link href={`${pathname}?date=${next}`} aria-label="Next day" className={cn(buttonVariants({ variant: "outline", size: "icon" }), "-ml-px rounded-l-none")}>
          <ChevronRight />
        </Link>
      </div>
      <Link
        href={pathname}
        aria-disabled={date === today}
        className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-9", date === today && "pointer-events-none opacity-40")}
      >
        Today
      </Link>
      <Input
        type="date"
        aria-label="Go to date"
        value={date}
        onChange={(e) => e.target.value && router.push(`${pathname}?date=${e.target.value}`)}
        className="h-9 w-auto"
      />
    </div>
  );
}
