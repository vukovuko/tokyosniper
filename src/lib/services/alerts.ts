import { db } from "@/src/db";
import { alertConfigs, alertHistory, flightPrices } from "@/src/db/schema";
import { eq, and, lt, desc } from "drizzle-orm";
import {
  DEFAULT_FLIGHT_ALERTS,
  DEFAULT_STAY_ALERTS,
} from "@/src/lib/constants";
import {
  sendTelegramMessage,
  formatFlightAlert,
  formatStayAlert,
} from "./telegram";
import type { FlightResult, StayResult } from "@/src/types";

interface AlertCheckResult {
  alertsSent: number;
  errors: string[];
}

export async function checkFlightAlerts(
  newFlights: FlightResult[],
): Promise<AlertCheckResult> {
  let alertsSent = 0;
  const errors: string[] = [];

  for (const flight of newFlights) {
    // Instant alert: round trip under €400
    if (
      flight.returnDate &&
      flight.priceEurCents < DEFAULT_FLIGHT_ALERTS.instantEurCents
    ) {
      const msg = formatFlightAlert({
        ...flight,
        stops: flight.stops ?? 0,
      });
      const sent = await sendTelegramMessage(msg);
      if (sent) {
        await logAlert("flight", msg, flight.priceEurCents, "EUR");
        alertsSent++;
      } else {
        errors.push("Failed to send flight instant alert");
      }
    }

    // Check against previous lowest price
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
        const msg = formatFlightAlert({
          ...flight,
          stops: flight.stops ?? 0,
          previousPriceEurCents: prevPrice,
        });
        const sent = await sendTelegramMessage(msg);
        if (sent) {
          await logAlert("flight", msg, flight.priceEurCents, "EUR");
          alertsSent++;
        }
      }
    }
  }

  // Check custom alert configs
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
        const msg = formatFlightAlert({
          ...flight,
          stops: flight.stops ?? 0,
        });
        const sent = await sendTelegramMessage(
          `🔔 Alert: ${config.label}\n\n${msg}`,
        );
        if (sent) {
          await logAlert("flight", msg, priceCents, config.currency, config.id);
          alertsSent++;
        }
      }
    }
  }

  return { alertsSent, errors };
}

export async function checkStayAlerts(
  newStays: StayResult[],
): Promise<AlertCheckResult> {
  let alertsSent = 0;
  const errors: string[] = [];

  for (const stay of newStays) {
    // Instant alert: under $30/night
    if (stay.pricePerNightUsdCents < DEFAULT_STAY_ALERTS.instantUsdCents) {
      const msg = formatStayAlert(stay);
      const sent = await sendTelegramMessage(msg);
      if (sent) {
        await logAlert("stay", msg, stay.pricePerNightUsdCents, "USD");
        alertsSent++;
      }
    }

    // Good deal: under $40/night with kitchen + wifi + 8+ rating
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
      const msg = formatStayAlert(stay);
      const sent = await sendTelegramMessage(`🏆 Great deal!\n\n${msg}`);
      if (sent) {
        await logAlert("stay", msg, stay.pricePerNightUsdCents, "USD");
        alertsSent++;
      }
    }
  }

  // Check custom alert configs
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
        const msg = formatStayAlert(stay);
        const sent = await sendTelegramMessage(
          `🔔 Alert: ${config.label}\n\n${msg}`,
        );
        if (sent) {
          await logAlert("stay", msg, priceCents, config.currency, config.id);
          alertsSent++;
        }
      }
    }
  }

  return { alertsSent, errors };
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
