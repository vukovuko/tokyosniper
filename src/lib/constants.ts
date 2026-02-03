export const NEIGHBORHOODS = [
  "asakusa",
  "ueno",
  "sumida",
  "nakano",
  "koenji",
  "ikebukuro",
  "kuramae",
] as const;

export type Neighborhood = (typeof NEIGHBORHOODS)[number];

export const NEIGHBORHOOD_LABELS: Record<Neighborhood, string> = {
  asakusa: "Asakusa / Taito Ward",
  ueno: "Ueno",
  sumida: "Sumida",
  nakano: "Nakano",
  koenji: "Koenji",
  ikebukuro: "Ikebukuro",
  kuramae: "Kuramae",
};

export const FLIGHT_ROUTES = [
  { origin: "BUD", destination: "NRT", label: "Budapest → Narita" },
  { origin: "BUD", destination: "HND", label: "Budapest → Haneda" },
] as const;

// Months you want to travel in — add/remove as needed
export const TRIP_WINDOWS = [
  { label: "March 2026", month: "2026-03" },
  { label: "April 2026", month: "2026-04" },
  { label: "October 2026", month: "2026-10" },
] as const;

// Trip duration: 9-14 days
export const TRIP_DAYS = { min: 9, max: 14 } as const;

// Departure days within each month to sample (weekly)
export const DEPARTURE_DAYS = [1, 8, 15, 22] as const;

// Return trip offsets in days (search 9, 11, 14 day trips)
export const RETURN_OFFSETS = [9, 11, 14] as const;

// Apify actor IDs — easy to swap if deprecated
export const APIFY_ACTORS = {
  skyscannerFlights: "canadesk/skyscanner-flights-api",
  googleFlights: "simpleapi/google-flights-scraper",
  bookingCom: "voyager/booking-scraper",
  airbnb: "tri_angle/airbnb-scraper",
} as const;

// Specific properties to always monitor
export const MONITORED_PROPERTIES = [
  {
    name: "Sakura House",
    platform: "sakura-house",
    searchUrl: "https://www.sakura-house.com/building/list?area=tokyo",
  },
  {
    name: "Tokyu Stay",
    platform: "booking",
    searchQuery: "Tokyu Stay Tokyo",
  },
  {
    name: "K's House Tokyo Oasis",
    platform: "booking",
    searchQuery: "K's House Tokyo Oasis Asakusa",
  },
  {
    name: "Nui. Hostel & Bar Lounge",
    platform: "booking",
    searchQuery: "Nui Hostel Bar Lounge Kuramae",
  },
  {
    name: "Toco Guesthouse",
    platform: "booking",
    searchQuery: "Toco Guesthouse Iriya",
  },
] as const;

// Default alert thresholds
export const DEFAULT_FLIGHT_ALERTS = {
  instantEurCents: 80000, // €800 round trip
  digestEurCents: 100000, // €1000 round trip
  dropPercent: 10,
} as const;

export const DEFAULT_STAY_ALERTS = {
  instantUsdCents: 4500, // $45/night
  goodDealUsdCents: 6000, // $60/night with kitchen+wifi+8+ rating
  dropPercent: 15,
  newListingUsdCents: 6000, // $60/night
} as const;
