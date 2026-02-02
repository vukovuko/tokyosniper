import { convertToAllCurrencies } from "@/src/lib/currency";
import type { FlightResult, ScraperResult } from "@/src/types";

interface SerpApiFlight {
  price?: number;
  airline_logo?: string;
  flights?: Array<{
    airline?: string;
    departure_airport?: { id?: string };
    arrival_airport?: { id?: string };
    duration?: number;
  }>;
  layovers?: unknown[];
  total_duration?: number;
  type?: string;
  booking_token?: string;
}

interface SerpApiResponse {
  best_flights?: SerpApiFlight[];
  other_flights?: SerpApiFlight[];
  error?: string;
}

export async function scrapeSerpApiFlights(
  origin: string,
  destination: string,
  departureDate: string,
  returnDate?: string,
): Promise<ScraperResult<FlightResult>> {
  const apiKey = process.env.SERPAPI_KEY;
  if (!apiKey) {
    return {
      success: false,
      data: [],
      source: "serpapi",
      error: "No SERPAPI_KEY",
    };
  }

  try {
    const params = new URLSearchParams({
      engine: "google_flights",
      departure_id: origin,
      arrival_id: destination,
      outbound_date: departureDate,
      currency: "EUR",
      hl: "en",
      api_key: apiKey,
      type: returnDate ? "1" : "2", // 1=round trip, 2=one way
    });
    if (returnDate) params.set("return_date", returnDate);

    const res = await fetch(`https://serpapi.com/search.json?${params}`);
    const data = (await res.json()) as SerpApiResponse;

    if (data.error) {
      return { success: false, data: [], source: "serpapi", error: data.error };
    }

    const allFlights = [
      ...(data.best_flights || []),
      ...(data.other_flights || []),
    ];

    const results: FlightResult[] = [];
    for (const flight of allFlights) {
      if (!flight.price || flight.price <= 0) continue;

      const prices = await convertToAllCurrencies(
        Math.round(flight.price * 100),
        "EUR",
      );

      const airlines = flight.flights
        ?.map((f) => f.airline)
        .filter(Boolean)
        .join(", ");

      results.push({
        origin,
        destination,
        departureDate,
        returnDate,
        airline: airlines || undefined,
        priceEurCents: prices.eurCents,
        priceUsdCents: prices.usdCents,
        priceRsdCents: prices.rsdCents,
        source: "serpapi",
        stops: flight.layovers?.length ?? 0,
        durationMinutes: flight.total_duration,
        rawData: flight,
      });
    }

    return { success: true, data: results, source: "serpapi" };
  } catch (error) {
    return {
      success: false,
      data: [],
      source: "serpapi",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
