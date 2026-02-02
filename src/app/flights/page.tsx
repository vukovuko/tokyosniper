import { getFlightPriceHistory } from "@/src/lib/services/flights";
import { FlightChart } from "@/components/dashboard/flight-chart";
import { formatPrice } from "@/src/lib/currency";
import { cached } from "@/src/lib/cache";
import { Badge } from "@/components/ui/badge";
import {
  FLIGHT_ROUTES,
  TRIP_WINDOWS,
  TRIP_DAYS,
  APIFY_ACTORS,
} from "@/src/lib/constants";

export const dynamic = "force-dynamic";

export default async function FlightsPage() {
  const history = await cached("flights:history", 1800, () =>
    getFlightPriceHistory(undefined, 200),
  );

  const lowestEver =
    history.length > 0
      ? history.reduce((min, h) =>
          h.priceEurCents < min.priceEurCents ? h : min,
        )
      : null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Flight Prices</h1>
        <p className="text-sm text-muted-foreground">
          BUD → NRT / HND · {TRIP_DAYS.min}–{TRIP_DAYS.max} day trips ·{" "}
          {TRIP_WINDOWS.map((w) => w.label).join(", ")}
        </p>
      </div>

      <section className="rounded-lg border border-border bg-muted/30 p-4 text-sm">
        <h2 className="font-semibold">How it works</h2>
        <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
          <li>
            <span className="font-medium text-foreground">Routes:</span>{" "}
            {FLIGHT_ROUTES.map((r) => r.label).join(", ")}
          </li>
          <li>
            <span className="font-medium text-foreground">Dates:</span>{" "}
            {TRIP_WINDOWS.map((w) => w.label).join(", ")} · {TRIP_DAYS.min}–
            {TRIP_DAYS.max} day round trips
          </li>
          <li>
            <span className="font-medium text-foreground">Sources:</span>{" "}
            Skyscanner (via {APIFY_ACTORS.skyscannerFlights}), Google Flights
            (via {APIFY_ACTORS.googleFlights}), SerpAPI fallback
          </li>
          <li>
            <span className="font-medium text-foreground">Schedule:</span> Cron
            checks daily via{" "}
            <code className="rounded bg-muted px-1">
              /api/cron/check-flights
            </code>
          </li>
          <li>
            <span className="font-medium text-foreground">Alerts:</span>{" "}
            Telegram notification for round trips under €600 or price drops
            &gt;10%
          </li>
        </ul>
      </section>

      {lowestEver && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
          <div className="flex items-center gap-2">
            <Badge variant="default">All-time low</Badge>
            <span className="text-xl font-bold text-primary">
              {formatPrice(lowestEver.priceEurCents, "EUR")}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            BUD → {lowestEver.destination} · {lowestEver.airline || "N/A"} ·{" "}
            {lowestEver.departureDate}
          </p>
        </div>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Price History</h2>
        <div className="rounded-lg border border-border bg-card p-4">
          <FlightChart
            data={history.map((h) => ({
              checkedAt: h.checkedAt.toISOString(),
              priceEurCents: h.priceEurCents,
              destination: h.destination,
            }))}
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">All Tracked Prices</h2>
        {history.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-6 text-center">
            <p className="text-sm font-medium">No flight data yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Data appears after the first cron run. Trigger manually:
            </p>
            <code className="mt-2 inline-block rounded bg-muted px-3 py-1 text-xs">
              curl -H &quot;Authorization: Bearer $CRON_SECRET&quot;
              https://your-app.vercel.app/api/cron/check-flights
            </code>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Route</th>
                  <th className="px-3 py-2 text-left font-medium">Date</th>
                  <th className="px-3 py-2 text-left font-medium">Airline</th>
                  <th className="px-3 py-2 text-right font-medium">EUR</th>
                  <th className="px-3 py-2 text-right font-medium">USD</th>
                  <th className="px-3 py-2 text-right font-medium">RSD</th>
                  <th className="px-3 py-2 text-center font-medium">Stops</th>
                  <th className="px-3 py-2 text-left font-medium">Source</th>
                </tr>
              </thead>
              <tbody>
                {history.map((f) => {
                  const isLowest =
                    lowestEver &&
                    f.priceEurCents === lowestEver.priceEurCents &&
                    f.destination === lowestEver.destination;
                  return (
                    <tr
                      key={f.id}
                      className={`border-b border-border ${isLowest ? "bg-primary/5" : ""}`}
                    >
                      <td className="px-3 py-2">
                        {f.origin} → {f.destination}
                      </td>
                      <td className="px-3 py-2">{f.departureDate}</td>
                      <td className="px-3 py-2">{f.airline || "—"}</td>
                      <td className="px-3 py-2 text-right font-mono">
                        {formatPrice(f.priceEurCents, "EUR")}
                      </td>
                      <td className="px-3 py-2 text-right font-mono">
                        {formatPrice(f.priceUsdCents, "USD")}
                      </td>
                      <td className="px-3 py-2 text-right font-mono">
                        {formatPrice(f.priceRsdCents, "RSD")}
                      </td>
                      <td className="px-3 py-2 text-center">{f.stops ?? 0}</td>
                      <td className="px-3 py-2">{f.source}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
