"use client";

import { useActionState } from "react";
import { createAlert } from "@/src/app/alerts/actions";

export function AlertForm() {
  const [state, action, pending] = useActionState(createAlert, null);

  return (
    <form
      action={action}
      className="space-y-4 rounded-lg border border-border bg-card p-4"
    >
      <h3 className="text-sm font-semibold">New Alert</h3>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label
            htmlFor="type"
            className="mb-1 block text-xs text-muted-foreground"
          >
            Type
          </label>
          <select
            id="type"
            name="type"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="flight">Flight</option>
            <option value="stay">Stay</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="currency"
            className="mb-1 block text-xs text-muted-foreground"
          >
            Currency
          </label>
          <select
            id="currency"
            name="currency"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="EUR">EUR</option>
            <option value="USD">USD</option>
            <option value="RSD">RSD</option>
          </select>
        </div>
      </div>

      <div>
        <label
          htmlFor="label"
          className="mb-1 block text-xs text-muted-foreground"
        >
          Label
        </label>
        <input
          id="label"
          name="label"
          type="text"
          placeholder="e.g. Round trip under €400"
          required
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label
          htmlFor="threshold"
          className="mb-1 block text-xs text-muted-foreground"
        >
          Threshold (in whole units, e.g. 400 for €400)
        </label>
        <input
          id="threshold"
          name="threshold"
          type="number"
          min="1"
          required
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {pending ? "Creating..." : "Create Alert"}
      </button>

      {state?.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}
      {state?.success && <p className="text-sm text-primary">Alert created.</p>}
    </form>
  );
}
