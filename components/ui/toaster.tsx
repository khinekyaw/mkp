"use client";

import { Toaster as Sonner } from "sonner";

export function Toaster() {
  return (
    <Sonner
      position="bottom-right"
      toastOptions={{
        classNames: {
          toast: "!rounded-md !border !border-border !bg-background !text-foreground !font-sans !text-sm !shadow-md",
          description: "!text-muted-foreground",
        },
      }}
    />
  );
}

export { toast } from "sonner";
