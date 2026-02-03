import { ApifyClient } from "apify-client";
import { APIFY_ACTORS, NEIGHBORHOOD_LABELS } from "@/src/lib/constants";
import { convertToAllCurrencies } from "@/src/lib/currency";
import type { Neighborhood } from "@/src/lib/constants";
import type { StayResult, ScraperResult } from "@/src/types";

const client = new ApifyClient({ token: process.env.APIFY_API_TOKEN });

interface BookingItem {
  name?: string;
  url?: string;
  price?: number;
  currency?: string;
  rating?: number;
  reviewScore?: number;
  reviewCount?: number;
  numberOfReviews?: number;
  type?: string;
  propertyType?: string;
  address?: string;
  [key: string]: unknown;
}

interface AirbnbItem {
  name?: string;
  title?: string;
  url?: string;
  pricing?: { rate?: { amount?: number }; currency?: string };
  price?: number;
  currency?: string;
  rating?: number;
  reviewsCount?: number;
  numberOfGuests?: number;
  roomType?: string;
  isSuperhost?: boolean;
  amenities?: string[];
  [key: string]: unknown;
}

export async function scrapeBookingCom(
  neighborhood: Neighborhood,
  checkIn: string,
  checkOut: string,
): Promise<ScraperResult<StayResult>> {
  try {
    const label = NEIGHBORHOOD_LABELS[neighborhood];
    const run = await client.actor(APIFY_ACTORS.bookingCom).call({
      search: `Tokyo ${label}`,
      checkIn,
      checkOut,
      currency: "USD",
      language: "en-us",
      adults: 1,
      rooms: 1,
      minScore: "8",
      propertyType: "Apartments",
      sortBy: "price",
      maxPages: 20,
      useFilters: true,
    });

    const { items } = await client.dataset(run.defaultDatasetId).listItems();

    const results: StayResult[] = [];
    for (const raw of items) {
      const item = raw as BookingItem;
      const price = item.price;
      if (!price || price <= 0) continue;

      const currency = (item.currency || "USD").toUpperCase();
      const prices = await convertToAllCurrencies(
        Math.round(price * 100),
        currency as "EUR" | "USD",
      );

      results.push({
        name: item.name || "Unknown",
        neighborhood,
        platform: "booking",
        url: item.url,
        propertyType: item.propertyType || item.type,
        rating: item.rating ?? item.reviewScore,
        reviewCount: item.reviewCount ?? item.numberOfReviews,
        pricePerNightEurCents: prices.eurCents,
        pricePerNightUsdCents: prices.usdCents,
        pricePerNightRsdCents: prices.rsdCents,
        pricePerNightJpyCents: prices.jpyCents ?? 0,
        checkIn,
        checkOut,
        source: "booking",
        rawData: item,
      });
    }

    return { success: true, data: results, source: "booking" };
  } catch (error) {
    return {
      success: false,
      data: [],
      source: "booking",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function scrapeAirbnb(
  neighborhood: Neighborhood,
  checkIn: string,
  checkOut: string,
): Promise<ScraperResult<StayResult>> {
  try {
    const label = NEIGHBORHOOD_LABELS[neighborhood];
    const run = await client.actor(APIFY_ACTORS.airbnb).call({
      locationQuery: `${label}, Tokyo, Japan`,
      checkIn,
      checkOut,
      currency: "USD",
      maxListings: 20,
    });

    const { items } = await client.dataset(run.defaultDatasetId).listItems();

    const results: StayResult[] = [];
    for (const raw of items) {
      const item = raw as AirbnbItem;
      const price = item.pricing?.rate?.amount ?? item.price;
      if (!price || price <= 0) continue;

      const currency = (
        item.pricing?.currency ||
        item.currency ||
        "USD"
      ).toUpperCase();
      const prices = await convertToAllCurrencies(
        Math.round(price * 100),
        currency as "EUR" | "USD",
      );

      results.push({
        name: item.name || item.title || "Unknown",
        neighborhood,
        platform: "airbnb",
        url: item.url,
        propertyType: item.roomType || "entire_home",
        rating: item.rating,
        reviewCount: item.reviewsCount,
        amenities: item.amenities,
        pricePerNightEurCents: prices.eurCents,
        pricePerNightUsdCents: prices.usdCents,
        pricePerNightRsdCents: prices.rsdCents,
        pricePerNightJpyCents: prices.jpyCents ?? 0,
        checkIn,
        checkOut,
        source: "airbnb",
        rawData: item,
      });
    }

    return { success: true, data: results, source: "airbnb" };
  } catch (error) {
    return {
      success: false,
      data: [],
      source: "airbnb",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
