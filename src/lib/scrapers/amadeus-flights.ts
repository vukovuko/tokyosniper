import { convertToAllCurrencies } from "@/src/lib/currency";
import { generateGoogleFlightsUrl } from "@/src/lib/utils/booking-urls";
import type { FlightResult, ScraperResult } from "@/src/types";

const AMADEUS_BASE_URL =
  process.env.AMADEUS_BASE_URL || "https://test.api.amadeus.com";

// Token cache (expires in 30 min, we refresh at 29 min)
let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAmadeusToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }

  const apiKey = process.env.AMADEUS_API_KEY;
  const apiSecret = process.env.AMADEUS_API_SECRET;

  if (!apiKey || !apiSecret) {
    throw new Error("AMADEUS_API_KEY and AMADEUS_API_SECRET are required");
  }

  const response = await fetch(`${AMADEUS_BASE_URL}/v1/security/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=client_credentials&client_id=${apiKey}&client_secret=${apiSecret}`,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Amadeus auth failed: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000, // 1 min buffer
  };
  return cachedToken.token;
}

// Parse ISO 8601 duration (PT12H30M) to minutes
function parseDuration(duration: string): number | undefined {
  if (!duration) return undefined;
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!match) return undefined;
  const hours = Number.parseInt(match[1] || "0", 10);
  const minutes = Number.parseInt(match[2] || "0", 10);
  return hours * 60 + minutes;
}

// Common airline codes to names mapping
const AIRLINE_CODES: Record<string, string> = {
  TK: "Turkish Airlines",
  LH: "Lufthansa",
  AF: "Air France",
  KL: "KLM",
  BA: "British Airways",
  QR: "Qatar Airways",
  EK: "Emirates",
  EY: "Etihad",
  SQ: "Singapore Airlines",
  CX: "Cathay Pacific",
  JL: "Japan Airlines",
  NH: "ANA",
  KE: "Korean Air",
  OZ: "Asiana Airlines",
  CA: "Air China",
  MU: "China Eastern",
  CZ: "China Southern",
  SU: "Aeroflot",
  OS: "Austrian Airlines",
  LX: "Swiss",
  AY: "Finnair",
  SK: "SAS",
  LO: "LOT Polish",
  W6: "Wizz Air",
  FR: "Ryanair",
  U2: "easyJet",
};

function getAirlineName(code: string): string {
  return AIRLINE_CODES[code] || code;
}

interface AmadeusFlightOffer {
  id: string;
  price: {
    total: string;
    currency: string;
  };
  itineraries: Array<{
    duration: string;
    segments: Array<{
      carrierCode: string;
      departure: { iataCode: string; at: string };
      arrival: { iataCode: string; at: string };
    }>;
  }>;
}

interface AmadeusResponse {
  data?: AmadeusFlightOffer[];
  errors?: Array<{ detail: string }>;
}

export async function searchAmadeusFlights(
  origin: string,
  destination: string,
  departureDate: string,
  returnDate?: string,
): Promise<ScraperResult<FlightResult>> {
  try {
    const token = await getAmadeusToken();

    const params = new URLSearchParams({
      originLocationCode: origin,
      destinationLocationCode: destination,
      departureDate,
      adults: "1",
      currencyCode: "EUR",
      max: "50", // Limit results
    });

    if (returnDate) {
      params.set("returnDate", returnDate);
    }

    const response = await fetch(
      `${AMADEUS_BASE_URL}/v2/shopping/flight-offers?${params}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        data: [],
        source: "amadeus",
        error: `Amadeus API error: ${response.status} ${errorText}`,
      };
    }

    const json: AmadeusResponse = await response.json();

    if (json.errors && json.errors.length > 0) {
      return {
        success: false,
        data: [],
        source: "amadeus",
        error: json.errors.map((e) => e.detail).join(", "),
      };
    }

    if (!json.data || json.data.length === 0) {
      return { success: true, data: [], source: "amadeus" };
    }

    const results: FlightResult[] = [];

    for (const offer of json.data) {
      const priceValue = Number.parseFloat(offer.price.total);
      if (!priceValue || priceValue <= 0) continue;

      const currency = offer.price.currency || "EUR";
      const prices = await convertToAllCurrencies(
        Math.round(priceValue * 100),
        currency as "EUR" | "USD",
      );

      // Get first itinerary for outbound flight info
      const outbound = offer.itineraries[0];
      if (!outbound) continue;

      // Count stops (segments - 1)
      const stops = Math.max(0, outbound.segments.length - 1);

      // Get airline from first segment
      const carrierCode = outbound.segments[0]?.carrierCode || "Unknown";
      const airline = getAirlineName(carrierCode);

      // Parse duration
      const durationMinutes = parseDuration(outbound.duration);

      // Get departure date from first segment
      const depDate =
        outbound.segments[0]?.departure.at?.split("T")[0] || departureDate;

      // Get return date if round trip
      let retDate: string | undefined;
      if (offer.itineraries.length > 1) {
        const inbound = offer.itineraries[1];
        retDate = inbound?.segments[0]?.departure.at?.split("T")[0];
      }

      results.push({
        origin,
        destination,
        departureDate: depDate,
        returnDate: retDate || returnDate,
        airline,
        priceEurCents: prices.eurCents,
        priceUsdCents: prices.usdCents,
        priceRsdCents: prices.rsdCents,
        source: "amadeus",
        stops,
        durationMinutes,
        bookingUrl: generateGoogleFlightsUrl(
          origin,
          destination,
          depDate,
          retDate || returnDate,
        ),
        rawData: offer,
      });
    }

    return { success: true, data: results, source: "amadeus" };
  } catch (error) {
    return {
      success: false,
      data: [],
      source: "amadeus",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
