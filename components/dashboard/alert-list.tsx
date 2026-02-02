"use client";

import { toggleAlert, deleteAlert } from "@/src/app/alerts/actions";
import { useTransition } from "react";
import { formatPrice } from "@/src/lib/currency";
import type { Currency } from "@/src/types";

interface AlertConfig {
  id: number;
  type: string;
  label: string;
  thresholdCents: number;
  currency: string;
  enabled: boolean;
}

export function AlertList({ configs }: { configs: AlertConfig[] }) {
  if (configs.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No alerts configured.</p>
    );
  }

  return (
    <div className="space-y-2">
      {configs.map((config) => (
        <AlertRow key={config.id} config={config} />
      ))}
    </div>
  );
}

function AlertRow({ config }: { config: AlertConfig }) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-card p-3">
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={isPending}
          onClick={() =>
            startTransition(() => toggleAlert(config.id, !config.enabled))
          }
          className={`h-4 w-8 rounded-full transition-colors ${
            config.enabled ? "bg-primary" : "bg-muted"
          }`}
        >
          <span
            className={`block h-3 w-3 rounded-full bg-white transition-transform ${
              config.enabled ? "translate-x-4" : "translate-x-0.5"
            }`}
          />
        </button>
        <div>
          <span className="text-sm font-medium">{config.label}</span>
          <span className="ml-2 text-xs text-muted-foreground">
            {config.type} · under{" "}
            {formatPrice(config.thresholdCents, config.currency as Currency)}
          </span>
        </div>
      </div>
      <button
        type="button"
        disabled={isPending}
        onClick={() => startTransition(() => deleteAlert(config.id))}
        className="text-xs text-destructive hover:text-destructive/80"
      >
        Delete
      </button>
    </div>
  );
}
