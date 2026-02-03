import { ApifyClient } from "apify-client";
import { APIFY_ACTORS } from "@/src/lib/constants";
import { convertToAllCurrencies } from "@/src/lib/currency";
import { generateGoogleFlightsUrl } from "@/src/lib/utils/booking-urls";
import type { FlightResult, ScraperResult } from "@/src/types";

const client = new ApifyClient({ token: process.env.APIFY_API_TOKEN });

interface SkyscannerItem {
  price?: number;
  currency?: string;
  airline?: string;
  airlines?: string[];
  departureDate?: string;
  departure_date?: string;
  returnDate?: string;
  return_date?: string;
  origin?: string;
  destination?: string;
  stops?: number;
  duration?: number;
  durationMinutes?: number;
  url?: string;
  link?: string;
  [key: string]: unknown;
}

function parseDuration(item: SkyscannerItem): number | undefined {
  if (item.durationMinutes) return item.durationMinutes;
  if (item.duration && typeof item.duration === "number") return item.duration;
  return undefined;
}

async function normalizeItem(
  item: SkyscannerItem,
  origin: string,
  destination: string,
  source: string,
  fallbackDepartureDate: string,
  fallbackReturnDate?: string,
): Promise<FlightResult | null> {
  const price = item.price;
  if (!price || price <= 0) return null;

  const currency = (item.currency || "EUR").toUpperCase();
  const prices = await convertToAllCurrencies(
    Math.round(price * 100),
    currency as "EUR" | "USD",
  );

  const departureDate =
    item.departureDate || item.departure_date || fallbackDepartureDate;
  const returnDate = item.returnDate || item.return_date || fallbackReturnDate;

  return {
    origin: item.origin || origin,
    destination: item.destination || destination,
    departureDate,
    returnDate,
    airline:
      item.airline || (item.airlines ? item.airlines.join(", ") : undefined),
    priceEurCents: prices.eurCents,
    priceUsdCents: prices.usdCents,
    priceRsdCents: prices.rsdCents,
    source,
    stops: item.stops ?? 0,
    durationMinutes: parseDuration(item),
    bookingUrl:
      item.url ||
      item.link ||
      generateGoogleFlightsUrl(origin, destination, departureDate, returnDate),
    rawData: item,
  };
}

export async function scrapeSkyscannerFlights(
  origin: string,
  destination: string,
  dateFrom: string,
  dateTo: string,
): Promise<ScraperResult<FlightResult>> {
  try {
    const run = await client.actor(APIFY_ACTORS.skyscannerFlights).call({
      origin,
      destination,
      departureDate: dateFrom,
      returnDate: dateTo,
      currency: "EUR",
      adults: 1,
      cabinClass: "economy",
    });

    const { items } = await client.dataset(run.defaultDatasetId).listItems();

    const results: FlightResult[] = [];
    for (const item of items) {
      const normalized = await normalizeItem(
        item as SkyscannerItem,
        origin,
        destination,
        "skyscanner",
        dateFrom,
        dateTo,
      );
      if (normalized) results.push(normalized);
    }

    return { success: true, data: results, source: "skyscanner" };
  } catch (error) {
    return {
      success: false,
      data: [],
      source: "skyscanner",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function scrapeGoogleFlightsApify(
  origin: string,
  destination: string,
  dateFrom: string,
  dateTo: string,
): Promise<ScraperResult<FlightResult>> {
  try {
    const run = await client.actor(APIFY_ACTORS.googleFlights).call({
      origin,
      destination,
      departureDate: dateFrom,
      returnDate: dateTo,
      currency: "EUR",
      adults: 1,
    });

    const { items } = await client.dataset(run.defaultDatasetId).listItems();

    const results: FlightResult[] = [];
    for (const item of items) {
      const normalized = await normalizeItem(
        item as SkyscannerItem,
        origin,
        destination,
        "google_flights_apify",
        dateFrom,
        dateTo,
      );
      if (normalized) results.push(normalized);
    }

    return { success: true, data: results, source: "google_flights_apify" };
  } catch (error) {
    return {
      success: false,
      data: [],
      source: "google_flights_apify",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
