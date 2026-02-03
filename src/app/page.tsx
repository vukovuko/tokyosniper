import {
  getCheapestFlight,
  getFlightPriceHistory,
} from "@/src/lib/services/flights";
import { getCheapestStays } from "@/src/lib/services/stays";
import { FlightChart } from "@/components/dashboard/flight-chart";
import { formatPrice } from "@/src/lib/currency";
import { cached } from "@/src/lib/cache";
import {
  FLIGHT_ROUTES,
  TRIP_WINDOWS,
  TRIP_DAYS,
  NEIGHBORHOODS,
  NEIGHBORHOOD_LABELS,
  MONITORED_PROPERTIES,
} from "@/src/lib/constants";
import type { Neighborhood } from "@/src/lib/constants";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const [cheapestNRT, cheapestHND, stays, history] = await Promise.all([
    cached("dashboard:cheapest:NRT", 900, () => getCheapestFlight("NRT")),
    cached("dashboard:cheapest:HND", 900, () => getCheapestFlight("HND")),
    cached("dashboard:cheapest:stays", 900, () => getCheapestStays(5)),
    cached("dashboard:history:flights", 1800, () =>
      getFlightPriceHistory(undefined, 100),
    ),
  ]);

  const flights = [cheapestNRT, cheapestHND].filter(Boolean);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">TokyoSniper</h1>
        <p className="text-sm text-muted-foreground">
          Flight & accommodation tracker — BUD → Tokyo · {TRIP_DAYS.min}–
          {TRIP_DAYS.max} day trips
        </p>
      </div>

      {/* What's Being Tracked */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">What&apos;s Being Tracked</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="text-sm font-semibold">Flights</h3>
            <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
              {FLIGHT_ROUTES.map((r) => (
                <li key={r.destination}>{r.label}</li>
              ))}
            </ul>
            <p className="mt-1 text-xs text-muted-foreground">
              {TRIP_WINDOWS.map((w) => w.label).join(", ")} · {TRIP_DAYS.min}–
              {TRIP_DAYS.max} day trips
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="text-sm font-semibold">Neighborhoods</h3>
            <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
              {NEIGHBORHOODS.map((n) => (
                <li key={n}>{NEIGHBORHOOD_LABELS[n as Neighborhood]}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="text-sm font-semibold">Monitored Properties</h3>
            <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
              {MONITORED_PROPERTIES.map((p) => (
                <li key={p.name}>
                  {p.name} ({p.platform})
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Cheapest Flights */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Cheapest Flights</h2>
        {flights.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No flight data yet — data appears after the first cron run.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {flights.map((f) => (
              <div
                key={`${f.destination}-${f.departureDate}`}
                className="rounded-lg border border-border bg-card p-4"
              >
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-medium">
                    BUD → {f.destination}
                  </span>
                  <span className="text-xl font-bold text-primary">
                    {formatPrice(f.priceEurCents, "EUR")}
                  </span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {f.airline || "N/A"} · {f.stops ?? 0} stop
                  {(f.stops ?? 0) !== 1 ? "s" : ""} · {f.departureDate}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {formatPrice(f.priceUsdCents, "USD")} ·{" "}
                  {formatPrice(f.priceRsdCents, "RSD")}
                </div>
                {f.bookingUrl && (
                  <a
                    href={f.bookingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-block text-xs text-primary hover:underline"
                  >
                    Book this flight →
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Flight Price Trend */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Flight Price Trend</h2>
        <div className="rounded-lg border border-border bg-card p-4">
          <FlightChart
            data={history.map((h) => ({
              checkedAt:
                h.checkedAt instanceof Date
                  ? h.checkedAt.toISOString()
                  : String(h.checkedAt),
              priceEurCents: h.priceEurCents,
              destination: h.destination,
            }))}
          />
        </div>
      </section>

      {/* Cheapest Stays */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Top 5 Cheapest Stays</h2>
        {stays.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No stay data yet — data appears after the first cron run.
          </p>
        ) : (
          <div className="space-y-2">
            {stays.map((s) => (
              <div
                key={`${s.name}-${s.platform}`}
                className="flex items-center justify-between rounded-lg border border-border bg-card p-3"
              >
                <div>
                  <div className="text-sm font-medium">{s.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {s.neighborhood} · {s.platform} ·{" "}
                    {s.rating ? `${s.rating} ★` : "No rating"}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-primary">
                    {formatPrice(s.pricePerNightUsdCents, "USD")}
                    <span className="text-xs font-normal">/night</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatPrice(s.pricePerNightEurCents, "EUR")} ·{" "}
                    {formatPrice(s.pricePerNightRsdCents, "RSD")}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
