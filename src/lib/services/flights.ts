import { db } from "@/src/db";
import { flightPrices } from "@/src/db/schema";
import {
  scrapeSkyscannerFlights,
  scrapeGoogleFlightsApify,
} from "@/src/lib/scrapers/apify-flights";
import { searchAmadeusFlights } from "@/src/lib/scrapers/amadeus-flights";
import {
  FLIGHT_ROUTES,
  TRIP_WINDOWS,
  DEPARTURE_DAYS,
  RETURN_OFFSETS,
} from "@/src/lib/constants";
import type { FlightResult, ScraperResult } from "@/src/types";
import { eq, and, desc } from "drizzle-orm";
import { format, addDays } from "date-fns";

/** Generate all departure→return date pairs to search. */
function generateTripPairs(): {
  departure: string;
  return: string;
  label: string;
}[] {
  const pairs: { departure: string; return: string; label: string }[] = [];
  for (const window of TRIP_WINDOWS) {
    for (const day of DEPARTURE_DAYS) {
      const dep = new Date(`${window.month}-${String(day).padStart(2, "0")}`);
      for (const offset of RETURN_OFFSETS) {
        const ret = addDays(dep, offset);
        pairs.push({
          departure: format(dep, "yyyy-MM-dd"),
          return: format(ret, "yyyy-MM-dd"),
          label: `${window.label} d${day}+${offset}`,
        });
      }
    }
  }
  return pairs;
}

interface FlightCheckResult {
  totalChecked: number;
  newRecords: number;
  errors: string[];
  cheapestEurCents: number | null;
}

export async function fetchAndStoreFlights(): Promise<FlightCheckResult> {
  const allResults: FlightResult[] = [];
  const errors: string[] = [];

  const tripPairs = generateTripPairs();

  for (const route of FLIGHT_ROUTES) {
    for (const trip of tripPairs) {
      // Call all sources in parallel
      const [amadeus, skyscanner, googleFlights] = await Promise.all([
        searchAmadeusFlights(
          route.origin,
          route.destination,
          trip.departure,
          trip.return,
        ),
        scrapeSkyscannerFlights(
          route.origin,
          route.destination,
          trip.departure,
          trip.return,
        ),
        scrapeGoogleFlightsApify(
          route.origin,
          route.destination,
          trip.departure,
          trip.return,
        ),
      ]);

      // Collect results from all sources
      const sources: ScraperResult<FlightResult>[] = [
        amadeus,
        skyscanner,
        googleFlights,
      ];

      for (const source of sources) {
        if (source.success && source.data.length > 0) {
          allResults.push(...source.data);
        } else if (source.error) {
          errors.push(
            `${source.source} ${route.label} ${trip.label}: ${source.error}`,
          );
        }
      }
    }
  }

  // Deduplicate by airline + date + stops + price
  const seen = new Set<string>();
  const unique = allResults.filter((r) => {
    const key = `${r.airline}-${r.departureDate}-${r.stops}-${r.priceEurCents}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Insert to DB
  let newRecords = 0;
  if (unique.length > 0) {
    const rows = unique.map((r) => ({
      origin: r.origin,
      destination: r.destination,
      departureDate: r.departureDate,
      returnDate: r.returnDate ?? null,
      airline: r.airline ?? null,
      priceEurCents: r.priceEurCents,
      priceUsdCents: r.priceUsdCents,
      priceRsdCents: r.priceRsdCents,
      source: r.source,
      stops: r.stops,
      durationMinutes: r.durationMinutes ?? null,
      bookingUrl: r.bookingUrl ?? null,
      rawData: r.rawData ?? null,
    }));

    await db.insert(flightPrices).values(rows);
    newRecords = rows.length;
  }

  // Find cheapest
  const cheapest =
    unique.length > 0 ? Math.min(...unique.map((r) => r.priceEurCents)) : null;

  return {
    totalChecked: allResults.length,
    newRecords,
    errors,
    cheapestEurCents: cheapest,
  };
}

export async function getCheapestFlight(destination?: string) {
  const conditions = destination
    ? [eq(flightPrices.destination, destination)]
    : [];

  const result = await db
    .select()
    .from(flightPrices)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(flightPrices.priceEurCents)
    .limit(1);

  return result[0] ?? null;
}

export async function getFlightPriceHistory(destination?: string, limit = 200) {
  const conditions = destination
    ? [eq(flightPrices.destination, destination)]
    : [];

  return db
    .select()
    .from(flightPrices)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(flightPrices.checkedAt))
    .limit(limit);
}
