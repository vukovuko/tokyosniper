import { db } from "@/src/db";
import { alertConfigs, alertHistory, flightPrices } from "@/src/db/schema";
import { eq, and, desc } from "drizzle-orm";
import {
  DEFAULT_FLIGHT_ALERTS,
  DEFAULT_STAY_ALERTS,
} from "@/src/lib/constants";
import { sendTelegramMessage } from "./telegram";
import type { FlightResult, StayResult } from "@/src/types";

interface AlertCheckResult {
  alertsSent: number;
  errors: string[];
}

interface FlightDeal {
  flight: FlightResult;
  reason: string;
  previousPrice?: number;
}

interface StayDeal {
  stay: StayResult;
  reason: string;
}

function formatFlightLine(deal: FlightDeal): string {
  const f = deal.flight;
  const price = (f.priceEurCents / 100).toFixed(0);
  let line = `• <b>€${price}</b> ${f.origin}→${f.destination}`;
  line += ` (${f.departureDate}`;
  if (f.returnDate) line += `–${f.returnDate}`;
  line += `)`;
  if (f.airline) line += ` ${f.airline}`;
  if (deal.previousPrice) {
    const prev = (deal.previousPrice / 100).toFixed(0);
    const drop = (
      ((deal.previousPrice - f.priceEurCents) / deal.previousPrice) *
      100
    ).toFixed(0);
    line += ` <i>(was €${prev}, -${drop}%)</i>`;
  }
  if (f.bookingUrl) line += `\n  🔗 <a href="${f.bookingUrl}">Book</a>`;
  return line;
}

function formatStayLine(deal: StayDeal): string {
  const s = deal.stay;
  const price = (s.pricePerNightUsdCents / 100).toFixed(0);
  let line = `• <b>$${price}/night</b> ${s.name}`;
  line += ` (${s.neighborhood}, ${s.platform})`;
  if (s.rating) line += ` ⭐${s.rating}`;
  if (s.url) line += `\n  🔗 <a href="${s.url}">View</a>`;
  return line;
}

export async function checkFlightAlerts(
  newFlights: FlightResult[],
): Promise<AlertCheckResult> {
  const errors: string[] = [];
  const deals: FlightDeal[] = [];

  for (const flight of newFlights) {
    // Check: round trip under threshold
    if (
      flight.returnDate &&
      flight.priceEurCents < DEFAULT_FLIGHT_ALERTS.instantEurCents
    ) {
      deals.push({ flight, reason: "under €800" });
      continue;
    }

    // Check: price drop >10%
    const previousLowest = await db
      .select({ priceEurCents: flightPrices.priceEurCents })
      .from(flightPrices)
      .where(
        and(
          eq(flightPrices.destination, flight.destination),
          eq(flightPrices.departureDate, flight.departureDate),
        ),
      )
      .orderBy(flightPrices.priceEurCents)
      .limit(1);

    if (previousLowest.length > 0) {
      const prevPrice = previousLowest[0].priceEurCents;
      const dropPercent =
        ((prevPrice - flight.priceEurCents) / prevPrice) * 100;

      if (dropPercent >= DEFAULT_FLIGHT_ALERTS.dropPercent) {
        deals.push({
          flight,
          reason: `${dropPercent.toFixed(0)}% drop`,
          previousPrice: prevPrice,
        });
      }
    }
  }

  // Check custom configs
  const configs = await db
    .select()
    .from(alertConfigs)
    .where(
      and(eq(alertConfigs.type, "flight"), eq(alertConfigs.enabled, true)),
    );

  for (const config of configs) {
    for (const flight of newFlights) {
      const priceCents =
        config.currency === "USD"
          ? flight.priceUsdCents
          : config.currency === "RSD"
            ? flight.priceRsdCents
            : flight.priceEurCents;

      if (priceCents < config.thresholdCents) {
        const alreadyAdded = deals.some(
          (d) =>
            d.flight.departureDate === flight.departureDate &&
            d.flight.destination === flight.destination &&
            d.flight.priceEurCents === flight.priceEurCents,
        );
        if (!alreadyAdded) {
          deals.push({ flight, reason: config.label });
        }
      }
    }
  }

  // Send one consolidated message
  if (deals.length > 0) {
    let msg = `✈️ <b>FLIGHT DEALS FOUND (${deals.length})</b>\n\n`;
    for (const deal of deals) {
      msg += formatFlightLine(deal) + "\n\n";
    }

    const sent = await sendTelegramMessage(msg);
    if (sent) {
      for (const deal of deals) {
        await logAlert(
          "flight",
          `${deal.reason}`,
          deal.flight.priceEurCents,
          "EUR",
        );
      }
    } else {
      errors.push("Failed to send consolidated flight alert");
    }
  }

  return { alertsSent: deals.length > 0 ? 1 : 0, errors };
}

export async function checkStayAlerts(
  newStays: StayResult[],
): Promise<AlertCheckResult> {
  const errors: string[] = [];
  const deals: StayDeal[] = [];

  for (const stay of newStays) {
    // Check: under instant threshold
    if (stay.pricePerNightUsdCents < DEFAULT_STAY_ALERTS.instantUsdCents) {
      deals.push({ stay, reason: "under $45/night" });
      continue;
    }

    // Check: good deal with amenities
    const hasKitchen = stay.amenities?.some((a) =>
      a.toLowerCase().includes("kitchen"),
    );
    const hasWifi = stay.amenities?.some((a) =>
      a.toLowerCase().includes("wifi"),
    );
    if (
      stay.pricePerNightUsdCents < DEFAULT_STAY_ALERTS.goodDealUsdCents &&
      hasKitchen &&
      hasWifi &&
      (stay.rating ?? 0) >= 8
    ) {
      deals.push({ stay, reason: "great deal (kitchen+wifi+8★)" });
    }
  }

  // Check custom configs
  const configs = await db
    .select()
    .from(alertConfigs)
    .where(and(eq(alertConfigs.type, "stay"), eq(alertConfigs.enabled, true)));

  for (const config of configs) {
    for (const stay of newStays) {
      const priceCents =
        config.currency === "EUR"
          ? stay.pricePerNightEurCents
          : config.currency === "RSD"
            ? stay.pricePerNightRsdCents
            : stay.pricePerNightUsdCents;

      if (priceCents < config.thresholdCents) {
        const alreadyAdded = deals.some(
          (d) => d.stay.name === stay.name && d.stay.platform === stay.platform,
        );
        if (!alreadyAdded) {
          deals.push({ stay, reason: config.label });
        }
      }
    }
  }

  // Send one consolidated message
  if (deals.length > 0) {
    let msg = `🏠 <b>STAY DEALS FOUND (${deals.length})</b>\n\n`;
    for (const deal of deals) {
      msg += formatStayLine(deal) + "\n\n";
    }

    const sent = await sendTelegramMessage(msg);
    if (sent) {
      for (const deal of deals) {
        await logAlert(
          "stay",
          `${deal.reason}`,
          deal.stay.pricePerNightUsdCents,
          "USD",
        );
      }
    } else {
      errors.push("Failed to send consolidated stay alert");
    }
  }

  return { alertsSent: deals.length > 0 ? 1 : 0, errors };
}

async function logAlert(
  type: string,
  message: string,
  priceCents: number,
  currency: string,
  configId?: number,
) {
  await db.insert(alertHistory).values({
    alertConfigId: configId ?? null,
    type,
    message,
    priceCents,
    currency,
  });
}

export async function getAlertHistory(limit = 50) {
  return db
    .select()
    .from(alertHistory)
    .orderBy(desc(alertHistory.sentAt))
    .limit(limit);
}

export async function getAlertConfigs() {
  return db.select().from(alertConfigs);
}
