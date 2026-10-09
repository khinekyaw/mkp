"use client";

import { useEffect, useRef } from "react";
import { toast } from "@/components/ui/toaster";
import type { ActionState } from "@/lib/actions";

/** Toasts success messages from a useActionState result and runs `onSuccess` once per result. */
export function useActionFeedback(state: ActionState, onSuccess?: () => void) {
  const last = useRef<ActionState>(null);
  useEffect(() => {
    if (!state || state === last.current) return;
    last.current = state;
    if (state.ok) {
      if (state.message) toast.success(state.message);
      onSuccess?.();
    }
  }, [state, onSuccess]);
}
