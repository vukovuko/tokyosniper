import { db } from "@/src/db";
import { accommodations, accommodationPrices } from "@/src/db/schema";
import { scrapeBookingCom, scrapeAirbnb } from "@/src/lib/scrapers/apify-stays";
import {
  NEIGHBORHOODS,
  TRIP_WINDOWS,
  DEPARTURE_DAYS,
  TRIP_DAYS,
} from "@/src/lib/constants";
import type { Neighborhood } from "@/src/lib/constants";
import type { StayResult } from "@/src/types";
import { eq, and, desc } from "drizzle-orm";
import { addDays, format } from "date-fns";

interface StayCheckResult {
  totalChecked: number;
  newRecords: number;
  errors: string[];
  cheapestUsdCents: number | null;
}

/** Generate check-in/check-out pairs: weekly samples × trip windows. */
function getCheckDates(): { checkIn: string; checkOut: string }[] {
  const dates: { checkIn: string; checkOut: string }[] = [];
  for (const window of TRIP_WINDOWS) {
    for (const day of DEPARTURE_DAYS) {
      const checkIn = new Date(
        `${window.month}-${String(day).padStart(2, "0")}`,
      );
      const checkOut = addDays(checkIn, TRIP_DAYS.min);
      dates.push({
        checkIn: format(checkIn, "yyyy-MM-dd"),
        checkOut: format(checkOut, "yyyy-MM-dd"),
      });
    }
  }
  return dates;
}

async function upsertAccommodation(stay: StayResult): Promise<number> {
  // Check if accommodation already exists
  const existing = await db
    .select({ id: accommodations.id })
    .from(accommodations)
    .where(
      and(
        eq(accommodations.name, stay.name),
        eq(accommodations.platform, stay.platform),
        eq(accommodations.neighborhood, stay.neighborhood),
      ),
    )
    .limit(1);

  if (existing.length > 0) {
    return existing[0].id;
  }

  const [inserted] = await db
    .insert(accommodations)
    .values({
      name: stay.name,
      neighborhood: stay.neighborhood,
      platform: stay.platform,
      url: stay.url ?? null,
      propertyType: stay.propertyType ?? null,
      rating: stay.rating ?? null,
      reviewCount: stay.reviewCount ?? null,
      amenities: stay.amenities ?? null,
    })
    .returning({ id: accommodations.id });

  return inserted.id;
}

export async function fetchAndStoreStays(): Promise<StayCheckResult> {
  const allResults: StayResult[] = [];
  const errors: string[] = [];
  const datePairs = getCheckDates();

  for (const { checkIn, checkOut } of datePairs) {
    for (const neighborhood of NEIGHBORHOODS) {
      // Booking.com
      const booking = await scrapeBookingCom(
        neighborhood as Neighborhood,
        checkIn,
        checkOut,
      );
      if (booking.success) {
        allResults.push(...booking.data);
      } else if (booking.error) {
        errors.push(`Booking ${neighborhood} ${checkIn}: ${booking.error}`);
      }

      // Airbnb
      const airbnb = await scrapeAirbnb(
        neighborhood as Neighborhood,
        checkIn,
        checkOut,
      );
      if (airbnb.success) {
        allResults.push(...airbnb.data);
      } else if (airbnb.error) {
        errors.push(`Airbnb ${neighborhood} ${checkIn}: ${airbnb.error}`);
      }
    }
  }

  // Deduplicate by name + platform
  const seen = new Set<string>();
  const unique = allResults.filter((r) => {
    const key = `${r.name}-${r.platform}-${r.neighborhood}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Upsert accommodations and insert prices
  let newRecords = 0;
  for (const stay of unique) {
    const accId = await upsertAccommodation(stay);

    await db.insert(accommodationPrices).values({
      accommodationId: accId,
      pricePerNightEurCents: stay.pricePerNightEurCents,
      pricePerNightUsdCents: stay.pricePerNightUsdCents,
      pricePerNightRsdCents: stay.pricePerNightRsdCents,
      pricePerNightJpyCents: stay.pricePerNightJpyCents,
      totalPriceUsdCents: stay.totalPriceUsdCents ?? null,
      checkIn: stay.checkIn,
      checkOut: stay.checkOut,
      source: stay.source,
      rawData: stay.rawData ?? null,
    });
    newRecords++;
  }

  const cheapest =
    unique.length > 0
      ? Math.min(...unique.map((r) => r.pricePerNightUsdCents))
      : null;

  return {
    totalChecked: allResults.length,
    newRecords,
    errors,
    cheapestUsdCents: cheapest,
  };
}

export async function getCheapestStays(limit = 5) {
  return db
    .select({
      id: accommodations.id,
      name: accommodations.name,
      neighborhood: accommodations.neighborhood,
      platform: accommodations.platform,
      url: accommodations.url,
      rating: accommodations.rating,
      reviewCount: accommodations.reviewCount,
      propertyType: accommodations.propertyType,
      pricePerNightUsdCents: accommodationPrices.pricePerNightUsdCents,
      pricePerNightEurCents: accommodationPrices.pricePerNightEurCents,
      pricePerNightRsdCents: accommodationPrices.pricePerNightRsdCents,
      pricePerNightJpyCents: accommodationPrices.pricePerNightJpyCents,
      checkIn: accommodationPrices.checkIn,
      checkOut: accommodationPrices.checkOut,
      checkedAt: accommodationPrices.checkedAt,
    })
    .from(accommodationPrices)
    .innerJoin(
      accommodations,
      eq(accommodationPrices.accommodationId, accommodations.id),
    )
    .orderBy(accommodationPrices.pricePerNightUsdCents)
    .limit(limit);
}

export async function getStayPriceHistory(
  accommodationId?: number,
  limit = 200,
) {
  const conditions = accommodationId
    ? [eq(accommodationPrices.accommodationId, accommodationId)]
    : [];

  return db
    .select()
    .from(accommodationPrices)
    .innerJoin(
      accommodations,
      eq(accommodationPrices.accommodationId, accommodations.id),
    )
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(accommodationPrices.checkedAt))
    .limit(limit);
}
