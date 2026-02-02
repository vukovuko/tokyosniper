import { getAlertConfigs, getAlertHistory } from "@/src/lib/services/alerts";
import { AlertForm } from "@/components/dashboard/alert-form";
import { AlertList } from "@/components/dashboard/alert-list";
import { formatPrice } from "@/src/lib/currency";
import {
  DEFAULT_FLIGHT_ALERTS,
  DEFAULT_STAY_ALERTS,
  NEIGHBORHOODS,
  NEIGHBORHOOD_LABELS,
} from "@/src/lib/constants";
import type { Neighborhood } from "@/src/lib/constants";
import type { Currency } from "@/src/types";

export const dynamic = "force-dynamic";

const neighborhoodList = NEIGHBORHOODS.map(
  (n) => NEIGHBORHOOD_LABELS[n as Neighborhood],
).join(", ");

const BUILT_IN_ALERTS = [
  {
    icon: "plane",
    label: "Cheap round-trip flight",
    description: `BUD → NRT/HND under ${formatPrice(DEFAULT_FLIGHT_ALERTS.instantEurCents, "EUR")} round trip (Mar–Apr 2026)`,
  },
  {
    icon: "plane",
    label: "Flight price drop",
    description: `BUD → NRT/HND drops >${DEFAULT_FLIGHT_ALERTS.dropPercent}% from previous lowest`,
  },
  {
    icon: "home",
    label: "Cheap stay",
    description: `Under ${formatPrice(DEFAULT_STAY_ALERTS.instantUsdCents, "USD")}/night in ${neighborhoodList}`,
  },
  {
    icon: "home",
    label: "Great deal stay",
    description: `Under ${formatPrice(DEFAULT_STAY_ALERTS.goodDealUsdCents, "USD")}/night + kitchen + wifi + 8+ rating across Booking.com & Airbnb`,
  },
];

export default async function AlertsPage() {
  const [configs, history] = await Promise.all([
    getAlertConfigs(),
    getAlertHistory(30),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Alerts</h1>
        <p className="text-sm text-muted-foreground">
          Configure price drop alerts and view notification history
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Built-in Alerts</h2>
        <p className="text-xs text-muted-foreground">
          These fire automatically on every cron run — no setup needed.
        </p>
        <div className="space-y-2">
          {BUILT_IN_ALERTS.map((a) => (
            <div
              key={a.label}
              className="flex items-center gap-3 rounded-lg border border-border bg-card p-3"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm">
                {a.icon === "plane" ? "✈️" : "🏠"}
              </span>
              <div>
                <span className="text-sm font-medium">{a.label}</span>
                <p className="text-xs text-muted-foreground">{a.description}</p>
              </div>
              <span className="ml-auto text-xs font-medium text-green-500">
                Active
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Custom Alerts</h2>
        <AlertForm />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">
          Active Custom Alerts ({configs.length})
        </h2>
        <AlertList configs={configs} />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Recent Notifications</h2>
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground">No alerts sent yet.</p>
        ) : (
          <div className="space-y-2">
            {history.map((h) => (
              <div
                key={h.id}
                className="rounded-lg border border-border bg-card p-3"
              >
                <div className="flex items-baseline justify-between">
                  <span className="text-xs font-medium uppercase text-muted-foreground">
                    {h.type}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {h.sentAt.toISOString().slice(0, 16)}
                  </span>
                </div>
                <p className="mt-1 text-sm">
                  {formatPrice(h.priceCents, h.currency as Currency)}
                </p>
                <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                  {h.message.replace(/<[^>]*>/g, "").slice(0, 150)}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
