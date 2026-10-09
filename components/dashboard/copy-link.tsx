"use client";

import { ExternalLink } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/misc";

export function CopyLink({ value }: { value: string }) {
  return (
    <div className="grid gap-2">
      <code className="truncate rounded-md bg-muted px-3 py-2 font-mono text-xs">{value.replace(/^https?:\/\//, "")}</code>
      <div className="flex gap-2">
        <CopyButton value={value} />
        <a href={value} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "ghost", size: "sm" })}>
          <ExternalLink /> Open
        </a>
      </div>
    </div>
  );
}
