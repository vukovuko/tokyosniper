import { getCheapestStays } from "@/src/lib/services/stays";
import { StayChart } from "@/components/dashboard/stay-chart";
import { formatPrice } from "@/src/lib/currency";
import {
  NEIGHBORHOOD_LABELS,
  NEIGHBORHOODS,
  MONITORED_PROPERTIES,
  APIFY_ACTORS,
  TRIP_WINDOWS,
  TRIP_DAYS,
} from "@/src/lib/constants";
import type { Neighborhood } from "@/src/lib/constants";
import { cached } from "@/src/lib/cache";

export const dynamic = "force-dynamic";

export default async function StaysPage() {
  const stays = await cached("stays:cheapest", 1800, () =>
    getCheapestStays(50),
  );

  const neighborhoodMins = new Map<string, number>();
  for (const s of stays) {
    const current = neighborhoodMins.get(s.neighborhood);
    if (!current || s.pricePerNightUsdCents < current) {
      neighborhoodMins.set(s.neighborhood, s.pricePerNightUsdCents);
    }
  }
  const chartData = Array.from(neighborhoodMins.entries()).map(
    ([neighborhood, minPriceUsdCents]) => ({ neighborhood, minPriceUsdCents }),
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Accommodation Prices</h1>
        <p className="text-sm text-muted-foreground">
          Tokyo apartments & guesthouses ·{" "}
          {TRIP_WINDOWS.map((w) => w.label).join(", ")}
        </p>
      </div>

      <section className="rounded-lg border border-border bg-muted/30 p-4 text-sm">
        <h2 className="font-semibold">How it works</h2>
        <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
          <li>
            <span className="font-medium text-foreground">Neighborhoods:</span>{" "}
            {NEIGHBORHOODS.map(
              (n) => NEIGHBORHOOD_LABELS[n as Neighborhood],
            ).join(", ")}
          </li>
          <li>
            <span className="font-medium text-foreground">Stay length:</span>{" "}
            {TRIP_DAYS.min}–{TRIP_DAYS.max} nights
          </li>
          <li>
            <span className="font-medium text-foreground">Sources:</span>{" "}
            Booking.com (via {APIFY_ACTORS.bookingCom}), Airbnb (via{" "}
            {APIFY_ACTORS.airbnb})
          </li>
          <li>
            <span className="font-medium text-foreground">Monitored:</span>{" "}
            {MONITORED_PROPERTIES.map((p) => p.name).join(", ")}
          </li>
          <li>
            <span className="font-medium text-foreground">Schedule:</span> Cron
            checks every 12 hours via{" "}
            <code className="rounded bg-muted px-1">/api/cron/check-stays</code>
          </li>
          <li>
            <span className="font-medium text-foreground">Alerts:</span>{" "}
            Telegram for stays under $30/night or great deals under $40/night
            (kitchen + wifi + 8+ rating)
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Cheapest by Neighborhood</h2>
        <div className="rounded-lg border border-border bg-card p-4">
          <StayChart data={chartData} />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">All Tracked Properties</h2>
        {stays.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-6 text-center">
            <p className="text-sm font-medium">No stay data yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Data appears after the first cron run. Trigger manually:
            </p>
            <code className="mt-2 inline-block rounded bg-muted px-3 py-1 text-xs">
              curl -H &quot;Authorization: Bearer $CRON_SECRET&quot;
              https://your-app.vercel.app/api/cron/check-stays
            </code>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {stays.map((s) => (
              <div
                key={`${s.name}-${s.platform}-${s.neighborhood}`}
                className="rounded-lg border border-border bg-card p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold leading-tight">
                      {s.url ? (
                        <a
                          href={s.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-primary"
                        >
                          {s.name}
                        </a>
                      ) : (
                        s.name
                      )}
                    </h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {NEIGHBORHOOD_LABELS[s.neighborhood as Neighborhood] ||
                        s.neighborhood}{" "}
                      · {s.platform}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-primary">
                      {formatPrice(s.pricePerNightUsdCents, "USD")}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      /night
                    </span>
                  </div>
                </div>

                <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                  {s.rating && <span>{s.rating} ★</span>}
                  {s.reviewCount && <span>{s.reviewCount} reviews</span>}
                  {s.propertyType && <span>{s.propertyType}</span>}
                </div>

                <div className="mt-1 text-xs text-muted-foreground">
                  {formatPrice(s.pricePerNightEurCents, "EUR")} ·{" "}
                  {formatPrice(s.pricePerNightRsdCents, "RSD")} ·{" "}
                  {formatPrice(s.pricePerNightJpyCents, "JPY")}
                </div>

                <div className="mt-1 text-xs text-muted-foreground">
                  {s.checkIn} – {s.checkOut}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
